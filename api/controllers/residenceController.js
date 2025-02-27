import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import { Prisma } from "@prisma/client";

// ============================================================
// add Property api endpoint
// ============================================================

// addProperty.js

export const addProperty = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    address,
    gpsCode,
    city,
    Region,
    country,
    images,
    documentations,
    facilities,
    userEmail,
    propertyType,
    tenureType,
  } = req.body;
  console.log(req.body)

  // Validate required fields
  if (
    !title ||
    !description ||
    !price ||
    !address ||
    !gpsCode ||
    !city ||
    !Region ||
    !country ||
    !userEmail ||
    !propertyType ||
    !tenureType
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Validate images array
  if (!Array.isArray(images) || images.length < 1 || images.length > 10) {
    return res.status(400).json({
      message: "You must upload at least 1 image and at most 10 images.",
    });
  }

  // Validate documentations array
  if (
    !Array.isArray(documentations) ||
    documentations.length < 1 ||
    documentations.length > 10
  ) {
    return res.status(400).json({
      message: "You must upload at least 1 document and at most 10 documents.",
    });
  }

  // Validate price is a positive number
  if (isNaN(price) || Number(price) <= 0) {
    return res
      .status(400)
      .json({ message: "Price must be a valid positive number." });
  }

  // Validate GPS code format (example: GA-123-456)
  const gpsCodeRegex = /^[A-Z]{2}-\d{3}-\d{3}$/;
  if (!gpsCodeRegex.test(gpsCode)) {
    return res
      .status(400)
      .json({
        message: "Invalid GPS code format. Expected format: GA-123-456",
      });
  }

  try {
    // Check if a property with the same address and GPS code already exists for this user
    const existingProperty = await prisma.residency.findFirst({
      where: {
        address,
        gpsCode,
        owner: { email: userEmail },
      },
    });

    if (existingProperty) {
      return res.status(409).json({
        success: false,
        message:
          "A property with this address and GPS code already exists for this user.",
      });
    }

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
        images,
        documentations,
        facilities: facilities || [], // Default to empty array if not provided
        propertyType,
        tenureType,
        owner: { connect: { email: userEmail } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      residency,
    });
  } catch (error) {
    console.error("Error creating property:", error);

    // Handle Prisma errors
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A property with this address and GPS code already exists for this user.",
      });
    }

    if (error instanceof PrismaClient.PrismaClientKnownRequestError) {
      return res.status(400).json({
        success: false,
        message: "Database error",
        error: error.meta,
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
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