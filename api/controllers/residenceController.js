import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";
import nodemailer from 'nodemailer'

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
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "idbsch2012@gmail.com",
      pass: "bmdu vqxi dgqj dqoi",
    },
  });

  const mailOptions = {
    from: "idbsch2012@gmail.com",
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

// Export the addProperty function
// export const addProperty = asyncHandler(async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       price,
//       address,
//       city,
//       Region,
//       country,
//       gpsCode,
//       propertyStatus,
//       status,
//       propertyType,
//       tenureType,
//       facilities,
//       imagesCount, // Number of image files (to separate images and documents)
//       email, // Email from the frontend
//     } = req.body;

//     const files = req.files; // Access uploaded files

//     // Check if files are uploaded
//     if (!files || files.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No files uploaded." });
//     }

//     // Upload files to ImageKit
//     const uploadPromises = files.map((file) => {
//       return imagekit.upload({
//         file: file.buffer, // File buffer from multer
//         fileName: file.originalname, // Original file name
//         folder: "/property-files", // Folder in ImageKit
//       });
//     });

//     const results = await Promise.all(uploadPromises);
//     const fileUrls = results.map((result) => result.url);

//     // Separate image and document URLs
//     const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
//     const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

//     // Create new residency
//     const residency = await prisma.residency.create({
//       data: {
//         title,
//         description,
//         price: parseFloat(price), // Use parseFloat for decimal prices
//         address,
//         gpsCode,
//         propertyStatus,
//         status,
//         city,
//         Region,
//         country,
//         images: imageUrls,
//         documentations: documentationUrls,
//         facilities: facilities || [], // Default to empty array if not provided
//         propertyType,
//         tenureType,
//         owner: { connect: { email: email } },
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Property created successfully",
//       residency,
//     });
//   } catch (error) {
//     console.error("Error adding property:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to add property." });
//   }
// });

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
      email, // Owner's email
    } = req.body;

    const files = req.files;

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded." });
    }

    const uploadPromises = files.map((file) => {
      return imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/property-files",
      });
    });

    const results = await Promise.all(uploadPromises);
    const fileUrls = results.map((result) => result.url);

    const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
    const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

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
        owner: { connect: { email: email } },
      },
    });

    // Fetch the owner's details
    const owner = await prisma.user.findUnique({
      where: { email },
    });

    // Fetch all users with the role "admin"
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });

    // Send email to the owner
    await sendEmail(
      owner.email,
      "New Property Created",
      `Your property titled "${title}" has been created and is under Review. 
      View it here: http://localhost:5173/listing/${residency.id}`
    );

    // Send email to all admins
    const adminEmails = admins.map((admin) => admin.email);
    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(
        adminEmail,
        "New Property Created",
        `A new property titled "${title}" has been created by ${owner.email}. View it here: http://your-frontend-url/listings/${residency.id}`
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

// =====================================================================

// edit property
// export const editProperty = asyncHandler(async (req, res) => {
//   try {
//     const { id } = req.params; // Property ID to update
//     const {
//       title,
//       description,
//       price,
//       address,
//       city,
//       Region,
//       country,
//       gpsCode,
//       propertyStatus,
//       status,
//       propertyType,
//       tenureType,
//       facilities,
//       imagesCount, // Number of image files (to separate images and documents)
//       email, // Email from the frontend
//     } = req.body;

//     const files = req.files; // Access uploaded files

//     // Find the existing property
//     const existingProperty = await prisma.residency.findUnique({
//       where: { id: id },
//     });

//     if (!existingProperty) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Property not found." });
//     }

//     let imageUrls = existingProperty.images || [];
//     let documentationUrls = existingProperty.documentations || [];

//     // If new files are uploaded, process them
//     if (files && files.length > 0) {
//       // Upload new files to ImageKit
//       const uploadPromises = files.map((file) => {
//         return imagekit.upload({
//           file: file.buffer, // File buffer from multer
//           fileName: file.originalname, // Original file name
//           folder: "/property-files", // Folder in ImageKit
//         });
//       });

//       const results = await Promise.all(uploadPromises);
//       const fileUrls = results.map((result) => result.url);

//       // Separate image and document URLs
//       imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
//       documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));
//     }

//     // Check if the status has changed to "published"
//     if (status === "published" && existingProperty.status !== "published") {
//       // Fetch all subscribers from the Subscription model
//       const subscribers = await prisma.subscription.findMany({
//         select: { email: true },
//       });

//       // Send email to each subscriber
//       const emailPromises = subscribers.map((subscriber) =>
//         sendEmail(
//           subscriber.email,
//           "New Property Published!",
//           `A new property titled "${title}" has been published. Check it out now!`
//         )
//       );

//       await Promise.all(emailPromises);
//     }

//     // Update the property
//     const updatedResidency = await prisma.residency.update({
//       where: { id: id },
//       data: {
//         title,
//         description,
//         price: parseFloat(price), // Use parseFloat for decimal prices
//         address,
//         gpsCode,
//         propertyStatus,
//         status,
//         city,
//         Region,
//         country,
//         images: imageUrls,
//         documentations: documentationUrls,
//         facilities: facilities || [], // Default to empty array if not provided
//         propertyType,
//         tenureType,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Property updated successfully",
//       residency: updatedResidency,
//     });
//   } catch (error) {
//     console.error("Error updating property:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to update property." });
//   }
// });

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
      email, // Owner's email
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
      const uploadPromises = files.map((file) => {
        return imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
          folder: "/property-files",
        });
      });

      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map((result) => result.url);

      imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
      documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));
    }

    // Check if the status has changed
    const statusChangedToPublished =
      status === "published" && existingProperty.status !== "published";
    const statusChangedToUnpublished =
      status === "unpublished" && existingProperty.status !== "unpublished";

    if (statusChangedToPublished || statusChangedToUnpublished) {
      // Fetch the owner's details
      const owner = await prisma.user.findUnique({
        where: { email: existingProperty.userEmail },
      });

      // Fetch all users with the role "admin"
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
      });

      // Prepare the email content
      const emailSubject = statusChangedToPublished
        ? "New Property Published!"
        : "Property Unpublished";
      const emailText = statusChangedToPublished
        ? `A new property titled "${title}" has been published. Check it out now: http://localhost:5173/listing/${id}`
        : `The property titled "${title}" has been unpublished. View it here: http://localhost:5173/listing/${id}`;

      // Send email to the owner
      await sendEmail(owner.email, emailSubject, emailText);

      // Send email to all admins
      const adminEmails = admins.map((admin) => admin.email);
      const adminEmailPromises = adminEmails.map((adminEmail) =>
        sendEmail(adminEmail, emailSubject, emailText)
      );

      await Promise.all(adminEmailPromises);

      // If the status changed to "published," send emails to subscribers as well
      if (statusChangedToPublished) {
        // Fetch all subscribers
        const subscribers = await prisma.subscription.findMany({
          select: { email: true },
        });

        // Send email to subscribers
        const subscriberEmails = subscribers.map((subscriber) => subscriber.email);
        const subscriberEmailPromises = subscriberEmails.map((subscriberEmail) =>
          sendEmail(subscriberEmail, emailSubject, emailText)
        );

        await Promise.all(subscriberEmailPromises);
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
