import express from "express";
import {
  addProperty,
  editProperty,
  getAllProperties,
  getResidence,
} from "../controllers/residenceController.js";
import jwtCheck from "../config/auth0Config.js";
import multer from "multer"; // Import multer

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory as buffers
const upload = multer({ storage }); // Initialize multer with the storage configuration

// Routes
router.post("/addProperty", upload.any(), jwtCheck, addProperty); // Add property with file uploads and JWT authentication
router.put("/editProperty/:id", upload.any(), jwtCheck, editProperty)
router.get("/fetchResidencies", getAllProperties); // Fetch all properties
router.get("/fetchResidence/:id", getResidence); // Fetch a single property by ID

export default router;