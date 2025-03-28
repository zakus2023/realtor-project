import {
  createClerkClient,
  ClerkExpressRequireAuth,
} from "@clerk/clerk-sdk-node";
import User from "../models/user.js";
import dotenv from "dotenv";
import Residency from "../models/residency.js";

dotenv.config();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const requireAuth = ClerkExpressRequireAuth({
  clerkClient,
  onError: (error) => {
    console.error("Authentication error:", error);
    throw new Error("Not authenticated");
  },
});

export const attachUser = async (req, res, next) => {
  try {
    // First verify authentication state
    if (!req.auth?.userId) {
      return res.status(401).json({ message: "Missing authentication" });
    }

    // Then find user using Clerk ID from auth context
    const user = await User.findOne({ clerkId: req.auth.userId })
      .select("-__v -createdAt -updatedAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("User attachment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkOwnershipOrAdmin = async (req, res, next) => {
  try {
    const property = await Residency.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found"
      });
    }

    if (req.user.role === "admin" || property.userEmail === req.user.email) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: "Unauthorized: You don't own this property"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message
    });
  }
};