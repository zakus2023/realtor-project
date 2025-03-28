import asyncHandler from "express-async-handler";
import Residency from "../models/residency.js"; // Changed to Mongoose models
import  User  from "../models/user.js";
import Subscription from '../models/subscription.js'
import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";
import nodemailer from "nodemailer";
import {
  getPropertyCreatedAdminEmail,
  getPropertyCreatedOwnerEmail,
  getPropertyPublished,
} from "../src/utils/emailTemplates.js";
import stripHtml from "strip-html";

dotenv.config();

// ImageKit and Multer setup remains the same
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const storage = multer.memoryStorage();
// ===============================================================
// Email sender remains identical
/**
 * Sends emails using configured SMTP transport
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML formatted content
 * @returns {Promise<boolean>} - True if sent successfully
 */
const sendEmail = async (to, subject, htmlContent) => {
  // Validate required environment variables
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('Email credentials not configured');
    throw new Error('Email service configuration error');
  }

  // Configure transporter with connection pooling
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    pool: true,
    maxConnections: 5, // Increased from 1 for better throughput
    maxMessages: 100,
    rateLimit: 5, // Max 5 messages per second
    secure: true,
    tls: {
      rejectUnauthorized: true // Keep SSL verification enabled for security
    },
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
  });

  // Configure email options
  const mailOptions = {
    from: `AetherSoft Realtors <${process.env.GMAIL_USER}>`, // Use authorized email
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject.substring(0, 150), // Truncate long subjects
    html: htmlContent,
    text: stripHtml(htmlContent).result || 'Email content not available',
    priority: 'high' // Mark as high importance
  };

  try {
    // Verify connection configuration first
    await transporter.verify();
    
    // Send email with timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 15000)
      )
    ]);

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Email failed to ${to}:`, error);
    
    // Handle specific error cases
    const errorMessage = error.response?.includes('550 Daily Quota Exceeded') 
      ? 'Daily email quota exceeded'
      : 'Email delivery failed';

    throw new Error(errorMessage);
  } finally {
    // Close connection pool when done
    transporter.close();
  }
};
// =======================================================
// PROPERTY ADDING
// ============================================
export const addProperty = asyncHandler(async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      address,
      city,
      Region,
      country,
      gpsCode,
      propertyStatus,
      status,
      propertyType,
      tenureType,
      facilities,
      imagesCount,
      
    } = req.body;
    const clerkUserId = req.user.clerkId; // Changed from req.body to req.user

    // 1. Validate Property Owner Exists using Clerk ID
    const owner = await User.findOne({ clerkId: clerkUserId });
    if (!owner) {
      return res.status(400).json({
        success: false,
        message: "Property owner not found in system",
      });
    }

    // 2. Handle File Uploads (original implementation preserved)
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No files uploaded." 
      });
    }

    // 3. Upload Files to ImageKit (unchanged)
    const uploadPromises = files.map((file) =>
      imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/property-files",
      })
    );

    // 4. Wait for all uploads to complete (unchanged)
    const results = await Promise.all(uploadPromises);
    const fileUrls = results.map((result) => result.url);

    // 5. Split files into images and documents (unchanged)
    const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
    const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

    // 6. Create New Residency Document with Clerk association
    const residency = new Residency({
      title,
      description,
      price: parseFloat(price),
      address,
      gpsCode,
      propertyStatus,
      status,
      city,
      Region,
      country,
      images: imageUrls,
      documentations: documentationUrls,
      facilities: facilities || [],
      propertyType,
      tenureType,
      userEmail: owner.email, // Maintain email for backward compatibility
      clerkUserId: owner.clerkId // Add Clerk reference
    });

    // 7. Save to Database (unchanged)
    const savedResidency = await residency.save();

    // 8. Notify Admins (original implementation preserved)
    const admins = await User.find({ role: "admin" });
    const adminEmails = admins.map((admin) => admin.email);

    // 9. Prepare Owner Notification Email (unchanged)
    const ownerEmailContent = getPropertyCreatedOwnerEmail({
      propertyTitle: title,
      propertyId: savedResidency.id,
      submissionDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      viewLink: `${process.env.FRONTEND_URL}/listing/${savedResidency.id}`,
    });

    // 10. Send Owner Email (unchanged)
    await sendEmail(
      owner.email,
      "Property Submission Confirmation",
      ownerEmailContent
    );

    // 11. Prepare Admin Notification (unchanged)
    const adminEmailContent = getPropertyCreatedAdminEmail({
      propertyTitle: title,
      ownerEmail: owner.email,
      propertyId: savedResidency.id,
      adminLink: `${process.env.ADMIN_URL}/listings/${savedResidency.id}`,
    });

    // 12. Send Admin Emails in Parallel (unchanged)
    const emailPromises = adminEmails.map((adminEmail) =>
      sendEmail(
        adminEmail,
        "New Property Submission Requires Review",
        adminEmailContent
      )
    );
    await Promise.all(emailPromises);

    // 13. Return Success Response with Clerk ID
    res.status(201).json({
      success: true,
      message: "Property created successfully",
      residency: {
        id: savedResidency.id,
        title: savedResidency.title,
        status: savedResidency.status,
        images: savedResidency.images,
        createdAt: savedResidency.createdAt,
        clerkUserId: owner.clerkId // Add Clerk ID to response
      }
    });

  } catch (error) {
    console.error("Property creation error:", error);
    
    // Handle different error types (original implementation preserved)
    const response = {
      success: false,
      message: "Failed to add property",
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid property data";
      response.errors = Object.values(error.errors).map(e => e.message);
      res.status(400);
    } else if (error.code === 11000) {
      response.message = "Duplicate property detected";
      res.status(409);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});
// =====================================
// EDIT PROPERTY
// controllers/residenceController.js


export const editProperty = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      address,
      city,
      Region,
      country,
      gpsCode,
      propertyStatus,
      status,
      propertyType,
      tenureType,
      facilities,
      imagesCount,
      existingImages = "[]",
      existingDocs = "[]"
    } = req.body;

    // 1. Find existing property
    const existingProperty = await Residency.findById(id);
    if (!existingProperty) {
      return res.status(404).json({ 
        success: false, 
        message: "Property not found." 
      });
    }

    // 2. Handle file uploads
    let imageUrls = JSON.parse(existingImages);
    let documentationUrls = JSON.parse(existingDocs);
    const files = req.files;

    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
          folder: "/property-files",
        })
      );

      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map((result) => result.url);

      // Merge existing and new files
      imageUrls = [
        ...imageUrls,
        ...fileUrls.slice(0, parseInt(imagesCount, 10))
      ];
      documentationUrls = [
        ...documentationUrls,
        ...fileUrls.slice(parseInt(imagesCount, 10))
      ];
    }

    // 3. Status change detection
    const statusChangedToPublished = 
      status === "published" && existingProperty.status !== "published";
    const statusChangedToUnpublished = 
      status === "unpublished" && existingProperty.status !== "unpublished";

    // 4. Notifications
    if (statusChangedToPublished || statusChangedToUnpublished) {
      const owner = await User.findOne({ email: existingProperty.userEmail });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Property owner not found in system",
        });
      }

      const emailSubject = statusChangedToPublished
        ? "New Property Published!"
        : "Property Unpublished";

      // Owner notification
      await sendEmail(
        owner.email,
        emailSubject,
        getPropertyPublished({
          mainImage: imageUrls[0] || 'https://via.placeholder.com/600x400',
          propertyTitle: title,
          shortDescription: description || 'No description',
          formattedPrice: `$${parseFloat(price).toFixed(2)}`,
          viewLink: `${process.env.FRONTEND_URL}/listing/${id}`
        })
      );

      // Admin notifications
      const admins = await User.find({ role: "admin" });
      const adminEmails = admins.map((admin) => admin.email);
      const adminEmailContent = getPropertyCreatedAdminEmail({
        propertyTitle: title,
        ownerEmail: owner.email,
        propertyId: id,
        adminLink: `${process.env.ADMIN_URL}/listings/${id}`
      });

      await Promise.all(
        adminEmails.map(adminEmail =>
          sendEmail(adminEmail, emailSubject, adminEmailContent)
        )
      );

      // Subscriber notifications (only for publishing)
      if (statusChangedToPublished) {
        const subscribers = await Subscription.find().select("email");
        await Promise.all(
          subscribers.map(async (subscriber) => {
            const content = getPropertyPublished({
              mainImage: imageUrls[0] || 'https://via.placeholder.com/600x400',
              propertyTitle: title,
              shortDescription: description?.slice(0, 100) + '...' || 'No description',
              formattedPrice: `$${parseFloat(price).toFixed(2)}`,
              viewLink: `${process.env.FRONTEND_URL}/listing/${id}`,
              unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe/${subscriber.id}`
            });

            return sendEmail(
              subscriber.email,
              `New Property: ${title}`,
              content
            );
          })
        );
      }
    }

    // 5. Update property
    const updatedResidency = await Residency.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          description,
          price: parseFloat(price),
          address,
          gpsCode,
          propertyStatus,
          status,
          city,
          Region,
          country,
          images: imageUrls,
          documentations: documentationUrls,
          facilities: facilities || [],
          propertyType,
          tenureType
        }
      },
      { new: true, runValidators: true }
    );

    // 6. Response
    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      residency: {
        id: updatedResidency._id,
        title: updatedResidency.title,
        status: updatedResidency.status,
        images: updatedResidency.images,
        updatedAt: updatedResidency.updatedAt
      }
    });

  } catch (error) {
    console.error("Property update error:", error);
    
    const response = {
      success: false,
      message: "Failed to update property",
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid property data";
      response.errors = Object.values(error.errors).map(e => e.message);
      res.status(400);
    } else if (error.code === 11000) {
      response.message = "Duplicate property detected";
      res.status(409);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});

// Get all properties
export const getAllProperties = asyncHandler(async (req, res) => {
  try {
    // Converted to Mongoose find() with sort
    const residencies = await Residency.find({})
      .sort({ createdAt: -1 });

    res.status(residencies.length ? 200 : 404).json(
      residencies.length 
        ? residencies 
        : { message: "No properties found" }
    );
  } catch (error) {
    console.error("Mongoose error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user properties
export const getAllUserProperties = asyncHandler(async (req, res) => {
  const { email } = req.query;
  
  try {
    // Converted to Mongoose find with query
    const residencies = await Residency.find({ userEmail: email })
      .sort({ createdAt: -1 });

    res.status(200).json(residencies);
  } catch (error) {
    console.error("Mongoose error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single property
// controllers/residenceController.js
export const getResidence = asyncHandler(async (req, res) => {
  try {
    const residence = await Residency.findById(req.params.id).lean();
    
    if (!residence) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Stringify facilities for frontend compatibility
    residence.facilities = JSON.stringify(residence.facilities);
    
    res.json(residence);
  } catch (error) {
    console.error("Mongoose error:", error);
    res.status(500).json({ message: "Server error" });
  }
});