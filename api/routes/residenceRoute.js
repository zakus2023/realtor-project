import express from "express";
import {
  addProperty,
  editProperty,
  getAllProperties,
  getAllUserProperties,
  getResidence,
} from "../controllers/residenceController.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Add new property
router.post(
  "/addProperty",
  upload.any(), // Handle file uploads
  addProperty   // Authentication and logic now handled inside controller
);

// Edit existing property
router.put(
  "/editProperty/:id",
  upload.any(), // Handle file uploads
  editProperty  // Authentication and authorization handled inside controller
);

// Get all properties (public)
router.get("/fetchResidencies", getAllProperties);

// Get single property details (public)
router.get("/fetchResidence/:id", getResidence);

// Get all properties for current user
router.get(
  "/getAllUserProperties",
  getAllUserProperties // Authentication handled inside controller
);

export default router;