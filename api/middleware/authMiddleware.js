import {
  createClerkClient,
  ClerkExpressRequireAuth,
} from "@clerk/clerk-sdk-node";
import User from "../models/user.js";
import dotenv from "dotenv";

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