import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

// ============================================================
// get a single property

export const addProperty = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    address,
    city,
    country,
    images, // Change from `image` to `images`
    documentations,
    facilities,
    userEmail,
  } = req.body.data;

  console.log(req.body.data);

  // Validate images array
  if (!Array.isArray(images) || images.length < 1 || images.length > 10) {
    return res.status(400).json({
      message: "You must upload at least 1 image and at most 10 images.",
    });
  }

  if (
    !Array.isArray(documentations) ||
    documentations.length < 1 ||
    documentations.length > 10
  ) {
    return res.status(400).json({
      message:
        "You must upload at least 1 document and at most 10 documents(eg. site plan, indenture etc)",
    });
  }

  try {
    const residency = await prisma.residency.create({
      data: {
        title,
        description,
        price,
        address,
        city,
        country,
        images, // Use array of images
        documentations,
        facilities,
        owner: { connect: { email: userEmail } },
      },
    });
    res.send({ message: "Property created successfully", residency });
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("A property with this address already exists.");
    }
    throw new Error(error.message);
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
