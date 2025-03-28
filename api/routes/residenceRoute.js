import express from "express";
import {
  addProperty,
  editProperty,
  getAllProperties,
  getAllUserProperties,
  getResidence,
} from "../controllers/residenceController.js";
import multer from "multer";
import { attachUser, checkOwnershipOrAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Updated routes with proper middleware order
router.post(
  "/addProperty",
  requireAuth,    // Verify token first
  upload.any(),   // Then handle file uploads
  attachUser,     // Then attach user from verified token
  addProperty
);

router.put(
  "/editProperty/:id",
  requireAuth,
  upload.any(),
  attachUser,
  checkOwnershipOrAdmin, // Add this middleware
  editProperty
);

router.get("/fetchResidencies", getAllProperties);
router.get("/fetchResidence/:id", getResidence);
router.get("/getAllUserProperties", requireAuth, attachUser, getAllUserProperties);

export default router;