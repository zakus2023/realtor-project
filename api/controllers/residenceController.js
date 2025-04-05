import dotenv from "dotenv";
import multer from "multer";
import nodemailer from "nodemailer";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import asyncHandler from "express-async-handler";
import User from "../models/user.js";
import Residency from "../models/residency.js";
import {
  getPropertyCreatedOwnerEmail,
  getPropertyCreatedAdminEmail,
  getPropertyPublished,
} from "../src/utils/emailTemplates.js";
import Subscription from "../models/subscription.js";
import stripHtml from "strip-html";
import ImageKit from "imagekit";

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
    console.error("Email credentials not configured");
    throw new Error("Email service configuration error");
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
      rejectUnauthorized: true, // Keep SSL verification enabled for security
    },
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
  });

  // Configure email options
  const mailOptions = {
    from: `AetherSoft Realtors <${process.env.GMAIL_USER}>`, // Use authorized email
    to: Array.isArray(to) ? to.join(", ") : to,
    subject: subject.substring(0, 150), // Truncate long subjects
    html: htmlContent,
    text: stripHtml(htmlContent).result || "Email content not available",
    priority: "high", // Mark as high importance
  };

  try {
    // Verify connection configuration first
    await transporter.verify();

    // Send email with timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email timeout")), 15000)
      ),
    ]);

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Email failed to ${to}:`, error);

    // Handle specific error cases
    const errorMessage = error.response?.includes("550 Daily Quota Exceeded")
      ? "Daily email quota exceeded"
      : "Email delivery failed";

    throw new Error(errorMessage);
  } finally {
    // Close connection pool when done
    transporter.close();
  }
};
// =======================================================
// PROPERTY ADDING
// ============================================
// Initialize Clerk client (added to resolve reference error)
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
// =============================================================

export const addProperty = asyncHandler(async (req, res) => {
  try {
    // 1. Authentication Verification
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token (but we'll use the clerkUserId from payload)
    await clerkClient.verifyToken(token);

    // 2. Get Property Data including clerkUserId from payload
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
      clerkUserId, // Now coming from payload
    } = req.body;

    if (!clerkUserId) {
      return res.status(400).json({
        success: false,
        message: "Missing clerkUserId in request",
      });
    }

    // 3. Find or Create User using clerkUserId from payload
    let owner = await User.findOne({ clerkId: clerkUserId });

    if (!owner) {
      // Try to get user info from Clerk
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        if (!clerkUser) {
          return res.status(404).json({
            success: false,
            message: "User not found in Clerk",
          });
        }

        // Create new user in database
        owner = await User.create({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0].emailAddress,
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          role: "user",
        });
      } catch (error) {
        console.error("Failed to create user from Clerk data:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to verify property owner",
          details: {
            clerkUserId,
            error: error.message,
          },
        });
      }
    }

    // 4. Handle File Uploads
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // 5. Upload Files to ImageKit
    const uploadPromises = files.map((file) =>
      imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/property-files",
      })
    );

    const results = await Promise.all(uploadPromises);
    const fileUrls = results.map((result) => result.url);

    // 6. Categorize Files
    const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
    const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

    // 7. Create Property
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
      facilities:
        typeof facilities === "string" ? JSON.parse(facilities) : facilities,
      propertyType,
      tenureType,
      userEmail: owner.email,
      clerkUserId: owner.clerkId,
    });

    const savedResidency = await residency.save();

    // 8. Send Notifications
    const admins = await User.find({ role: "admin" });
    const adminEmails = admins.map((admin) => admin.email);

    // Owner Email
    await sendEmail(
      owner.email,
      "Property Submission Confirmation",
      getPropertyCreatedOwnerEmail({
        propertyTitle: title,
        propertyId: savedResidency.id,
        submissionDate: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        viewLink: `${process.env.FRONTEND_URL}/listing/${savedResidency.id}`,
      })
    );

    // Admin Emails
    const adminEmailContent = getPropertyCreatedAdminEmail({
      propertyTitle: title,
      ownerEmail: owner.email,
      propertyId: savedResidency.id,
      adminLink: `${process.env.FRONTEND_URL}/listing/${savedResidency.id}`,
    });

    await Promise.all(
      adminEmails.map((adminEmail) =>
        sendEmail(
          adminEmail,
          "New Property Submission Requires Review",
          adminEmailContent
        )
      )
    );

    // 9. Success Response
    res.status(201).json({
      success: true,
      message: "Property created successfully",
      residency: {
        id: savedResidency.id,
        title: savedResidency.title,
        status: savedResidency.status,
        images: savedResidency.images,
        createdAt: savedResidency.createdAt,
        clerkUserId: owner.clerkId,
      },
    });
  } catch (error) {
    console.error("Property creation error:", error);

    const response = {
      success: false,
      message: "Failed to add property",
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid property data";
      response.errors = Object.values(error.errors).map((e) => e.message);
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

export const editProperty = asyncHandler(async (req, res) => {
  try {
    // 1. Authentication Verification
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token (but we'll use clerkUserId from payload)
    await clerkClient.verifyToken(token);

    // 2. Get Request Data including clerkUserId from payload
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
      existingDocs = "[]",
      clerkUserId, // Now coming from payload
    } = req.body;

    if (!clerkUserId) {
      return res.status(400).json({
        success: false,
        message: "Missing clerkUserId in request",
      });
    }

    // 3. Validate User using clerkUserId from payload
    let currentUser = await User.findOne({ clerkId: clerkUserId });

    if (!currentUser) {
      // Try to get user info from Clerk
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        if (!clerkUser) {
          return res.status(404).json({
            success: false,
            message: "User not found in Clerk",
          });
        }

        // Create new user in database
        currentUser = await User.create({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0].emailAddress,
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          role: "user",
        });
      } catch (error) {
        console.error("Failed to create user from Clerk data:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to verify user",
          details: {
            clerkUserId,
            error: error.message,
          },
        });
      }
    }

    // 4. Find Property
    const existingProperty = await Residency.findById(id);
    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // 5. Authorization Check
    if (
      currentUser.role !== "admin" &&
      existingProperty.userEmail !== currentUser.email
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this property",
        details: {
          required: "Owner or Admin privileges",
          yourRole: currentUser.role,
        },
      });
    }

    // 6. Handle File Uploads
    let imageUrls = JSON.parse(existingImages);
    let documentationUrls = JSON.parse(existingDocs);
    const files = req.files;

    if (files?.length > 0) {
      const uploadPromises = files.map((file) =>
        imagekit.upload({
          file: file.buffer,
          fileName: `${Date.now()}-${file.originalname}`,
          folder: "/property-files",
          useUniqueFileName: true,
        })
      );

      const results = await Promise.all(uploadPromises);

      // Categorize files based on their fieldname (images vs documentations)
      const newImages = [];
      const newDocs = [];

      files.forEach((file, index) => {
        if (file.fieldname === "images") {
          newImages.push(results[index].url);
        } else if (file.fieldname === "documentations") {
          newDocs.push(results[index].url);
        }
      });

      // Merge existing and new files
      imageUrls = [...imageUrls, ...newImages];
      documentationUrls = [...documentationUrls, ...newDocs];
    }

    // 7. Status Change Detection
    const statusChangedToPublished =
      status === "published" && existingProperty.status !== "published";
    const statusChangedToUnpublished =
      status === "unpublished" && existingProperty.status !== "unpublished";

    // 8. Notifications (non-blocking)
    if (statusChangedToPublished || statusChangedToUnpublished) {
      try {
        const owner = await User.findOne({ email: existingProperty.userEmail });
        if (!owner) {
          console.error(`Owner not found for property ${id}`);
          throw new Error("Property owner not found");
        }

        const emailSubject = statusChangedToPublished
          ? "New Property Published!"
          : "Property Unpublished";

        // Owner Notification
        sendEmail(
          owner.email,
          emailSubject,
          getPropertyPublished({
            mainImage: imageUrls[0] || "https://via.placeholder.com/600x400",
            propertyTitle: title,
            shortDescription: description || "No description",
            formattedPrice: `$${parseFloat(price).toFixed(2)}`,
            viewLink: `${process.env.FRONTEND_URL}/listing/${id}`,
          })
        ).catch((e) => console.error("Failed to send owner email:", e));

        // Admin Notifications
        const admins = await User.find({ role: "admin" });
        const adminEmails = admins.map((admin) => admin.email);
        const adminEmailContent = getPropertyCreatedAdminEmail({
          propertyTitle: title,
          ownerEmail: owner.email,
          propertyId: id,
          adminLink: `${process.env.ADMIN_URL}/listings/${id}`,
        });

        await Promise.all(
          adminEmails.map((adminEmail) =>
            sendEmail(adminEmail, emailSubject, adminEmailContent).catch((e) =>
              console.error(`Failed to send admin email to ${adminEmail}:`, e)
            )
          )
        );

        // Subscriber Notifications (only for publishing)
        if (statusChangedToPublished) {
          const subscribers = await Subscription.find().select("email");
          await Promise.all(
            subscribers.map(async (subscriber) => {
              const content = getPropertyPublished({
                mainImage:
                  imageUrls[0] || "https://via.placeholder.com/600x400",
                propertyTitle: title,
                shortDescription:
                  description?.slice(0, 100) + "..." || "No description",
                formattedPrice: `$${parseFloat(price).toFixed(2)}`,
                viewLink: `${process.env.FRONTEND_URL}/listing/${id}`,
                unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe/${subscriber.id}`,
              });

              return sendEmail(
                subscriber.email,
                `New Property: ${title}`,
                content
              ).catch((e) =>
                console.error(
                  `Failed to send subscriber email to ${subscriber.email}:`,
                  e
                )
              );
            })
          );
        }
      } catch (notificationError) {
        console.error(
          "Notification sending failed (non-critical):",
          notificationError
        );
      }
    }

    // 9. Update Property
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
          facilities:
            typeof facilities === "string"
              ? JSON.parse(facilities)
              : facilities,
          propertyType,
          tenureType,
        },
      },
      { new: true, runValidators: true }
    );

    // 10. Success Response
    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      residency: {
        id: updatedResidency._id,
        title: updatedResidency.title,
        status: updatedResidency.status,
        images: updatedResidency.images,
        updatedAt: updatedResidency.updatedAt,
      },
    });
  } catch (error) {
    console.error("Property update error:", error);

    const response = {
      success: false,
      message: "Failed to update property",
      ...(process.env.NODE_ENV === "development" && {
        error: {
          name: error.name,
          message: error.message,
          ...(error.keyValue && { conflict: error.keyValue }),
        },
      }),
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid property data";
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

// export const getAllProperties = asyncHandler(async (req, res) => {
//   try {
//     const properties = await Residency.find({ status: 'published' })
//       .sort({ createdAt: -1 })
//       .select('-documentations -facilities -__v');

//     res.status(200).json({
//       success: true,
//       count: properties.length,
//       properties
//     });
//   } catch (error) {
//     console.error("Error fetching properties:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch properties"
//     });
//   }
// });

// export const getResidence = asyncHandler(async (req, res) => {
//   try {
//     const { id } = req.params;
//     const property = await Residency.findById(id);

//     if (!property) {
//       return res.status(404).json({
//         success: false,
//         message: "Property not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       property
//     });
//   } catch (error) {
//     console.error("Error fetching property:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch property"
//     });
//   }
// });

// export const getAllUserProperties = asyncHandler(async (req, res) => {
//   try {
//     // Authentication
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "No token provided"
//       });
//     }

//     const decodedToken = await clerkClient.verifyToken(token);
//     if (!decodedToken) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token"
//       });
//     }

//     const user = await User.findOne({ clerkId: decodedToken.userId });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     const properties = await Residency.find({ userEmail: user.email })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: properties.length,
//       properties
//     });
//   } catch (error) {
//     console.error("Error fetching user properties:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch user properties"
//     });
//   }
// });
// ================================================================

// Get all properties
export const getAllProperties = asyncHandler(async (req, res) => {
  try {
    // Converted to Mongoose find() with sort
    const residencies = await Residency.find({}).sort({ createdAt: -1 });

    res
      .status(residencies.length ? 200 : 404)
      .json(
        residencies.length ? residencies : { message: "No properties found" }
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
    const residencies = await Residency.find({ userEmail: email }).sort({
      createdAt: -1,
    });

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
