import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";

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
//const upload = multer({ storage });

// Export the addProperty function
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
      propertyType,
      tenureType,
      facilities,
      imagesCount, // Number of image files (to separate images and documents)
      email, // Email from the frontend
    } = req.body;

    const files = req.files; // Access uploaded files

    // Check if files are uploaded
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded." });
    }

    // Upload files to ImageKit
    const uploadPromises = files.map((file) => {
      return imagekit.upload({
        file: file.buffer, // File buffer from multer
        fileName: file.originalname, // Original file name
        folder: "/property-files", // Folder in ImageKit
      });
    });

    const results = await Promise.all(uploadPromises);
    const fileUrls = results.map((result) => result.url);

    // Separate image and document URLs
    const imageUrls = fileUrls.slice(0, parseInt(imagesCount, 10));
    const documentationUrls = fileUrls.slice(parseInt(imagesCount, 10));

    // Create new residency
    const residency = await prisma.residency.create({
      data: {
        title,
        description,
        price: parseFloat(price), // Use parseFloat for decimal prices
        address,
        gpsCode,
        city,
        Region,
        country,
        images:imageUrls,
        documentations: documentationUrls,
        facilities: facilities || [], // Default to empty array if not provided
        propertyType,
        tenureType,
        owner: { connect: { email: email } },
      },
    });

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
