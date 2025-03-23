import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
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

// ============================================================
// add Property api endpoint
// ============================================================

// addProperty.js
// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: "public_vP03kKuO/cNqdZtbGP8emOr7oYw=",
  privateKey: "private_dNaDI3BwGhqYpdBSB1CAce5uRYc=",
  urlEndpoint: "https://ik.imagekit.io/yds4mej8p",
});

// Set up multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory as buffers

// Nodemailer setup
const sendEmail = async (to, subject, htmlContent) => {
  // Use environment variables for credentials
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    // Recommended settings for better deliverability
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    secure: true,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `AetherSoft Realtors <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent, // Changed from text to html for formatted emails
    // Optional text fallback
    text: stripHtml(htmlContent).result,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send email");
  }
};

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
      email,
    } = req.body;

    // Validate owner first
    const owner = await prisma.user.findUnique({
      where: { email },
    });

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: "Property owner not found in system",
      });
    }

    // Validate file uploads
    const files = req.files;
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded." });
    }

    // Process file uploads
    const uploadPromises = files.map((file) =>
      imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/property-files",
      })
    );

    const results = await Promise.all(uploadPromises);
    const fileUrls = results.map((result) => result.url);

    // Split URLs into images and docs
    const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
    const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

    // Create residency
    const residency = await prisma.residency.create({
      data: {
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
        owner: { connect: { email } },
      },
    });

    // Fetch admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });
    const adminEmails = admins.map((admin) => admin.email);

    // Prepare owner email
    const ownerEmailContent = await getPropertyCreatedOwnerEmail({
      propertyTitle: title,
      propertyId: residency.id,
      submissionDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      viewLink: `http://localhost:5173/listing/${residency.id}`,
    });

    await sendEmail(
      owner.email,
      "Property Submission Confirmation",
      ownerEmailContent
    );

    // Prepare and send admin emails
    const adminEmailContent = await getPropertyCreatedAdminEmail({
      propertyTitle: title,
      ownerEmail: owner.email,
      propertyId: residency.id,
      adminLink: `http://admin.aethersoft.com/listings/${residency.id}`,
    });

    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(
        adminEmail,
        "New Property Submission Requires Review",
        adminEmailContent
      )
    );

    await Promise.all(adminEmailPromises);

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      residency,
    });
  } catch (error) {
    console.error("Error adding property:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add property." });
  }
});

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
    } = req.body;

    const files = req.files;

    const existingProperty = await prisma.residency.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found." });
    }

    let imageUrls = existingProperty.images || [];
    let documentationUrls = existingProperty.documentations || [];

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

      imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
      documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));
    }

    // Check status changes
    const statusChangedToPublished =
      status === "published" && existingProperty.status !== "published";
    const statusChangedToUnpublished =
      status === "unpublished" && existingProperty.status !== "unpublished";

    if (statusChangedToPublished || statusChangedToUnpublished) {
      const owner = await prisma.user.findUnique({
        where: { email: existingProperty.userEmail },
      });

      if (!owner) {
        return res.status(400).json({
          success: false,
          message: "Property owner not found in system",
        });
      }

      const admins = await prisma.user.findMany({
        where: { role: "admin" },
      });
      const adminEmails = admins.map((admin) => admin.email);

      const emailSubject = statusChangedToPublished
        ? "New Property Published!"
        : "Property Unpublished";

      // Owner email
      await sendEmail(
        owner.email,
        emailSubject,
        await getPropertyPublished({
          mainImage: imageUrls[0] || 'https://via.placeholder.com/600x400',
          propertyTitle: title,
          shortDescription: description || 'Property description not available',
          formattedPrice: `$${parseFloat(price).toFixed(2)}`,
          viewLink: `http://localhost:5173/listing/${id}`
        })
      );

      // Admin emails
      const adminEmailContent = await getPropertyCreatedAdminEmail({
        propertyTitle: title,
        ownerEmail: owner.email,
        propertyId: id,
        adminLink: `http://admin.aethersoft.com/listings/${id}`
      });

      await Promise.all(
        adminEmails.map((adminEmail) =>
          sendEmail(adminEmail, emailSubject, adminEmailContent)
        )
      );

      if (statusChangedToPublished) {
        const subscribers = await prisma.subscription.findMany({
          select: { 
            email: true,
            id: true 
          },
        });

        await Promise.all(
          subscribers.map(async (subscriber) => {
            const content = await getPropertyPublished({
              mainImage: imageUrls[0] || 'https://via.placeholder.com/600x400',
              propertyTitle: title,
              shortDescription: description 
                ? (description.length > 100
                    ? `${description.substring(0, 97)}...`
                    : description)
                : 'Property description not available',
              formattedPrice: `$${parseFloat(price).toFixed(2)}`,
              viewLink: `http://localhost:5173/listing/${id}`,
              unsubscribeLink: `http://localhost:5173/unsubscribe/${subscriber.id}`
            });

            return sendEmail(
              subscriber.email,
              `New Property Available: ${title}`,
              content
            );
          })
        );
      }
    }

    const updatedResidency = await prisma.residency.update({
      where: { id },
      data: {
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
      },
    });

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      residency: updatedResidency,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update property." });
  }
});

// =========================================================================
// get all properties
export const getAllProperties = asyncHandler(async (req, res) => {
  const residencies = await prisma.residency.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  if (residencies.length < 1) {
    res.send({ message: "No Property found" });
  }
  res.send(residencies);
});

// ============================================================================
// get all properties for the current user
export const getAllUserProperties = asyncHandler(async (req, res) => {
  const email = req.query.email; // Extract email from query parameters

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const residencies = await prisma.residency.findMany({
    where: {
      userEmail: email, // Filter by userEmail
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Return an empty array if no listings are found
  res.status(200).json(residencies);
});

// ============================================================================
// Get a single property
export const getResidence = asyncHandler(async (req, res) => {
  const id = req.params.id; // Correctly access request parameter
  try {
    const residence = await prisma.residency.findUnique({
      where: { id }, // Use "id", not "_id"
    });

    if (!residence) {
      return res.status(404).json({ message: "Property not found" }); // Send proper status code
    }

    res.json(residence); // Send the residence data
  } catch (error) {
    throw new Error(error.message);
  }
});
