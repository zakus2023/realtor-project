import { Webhook } from "svix";
import User from "../models/user.js";
import mongoose from "mongoose";

export const clerkWebhook = async (req, res) => {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!CLERK_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(req.body, req.headers);
  } catch (err) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  // Add user.updated handler here
  if (evt.type === "user.updated") {
    
    try {
      const { id: clerkId } = evt.data;
      const newRole = evt.data.public_metadata?.role || "user";
      

      const user = await User.findOneAndUpdate(
        { clerkId },
        { role: newRole },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({
        success: true,
        message: "User role updated",
        user: {
          id: user._id,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Role update error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (evt.type === "user.created") {
    const session = await mongoose.startSession();
    session.startTransaction();
    

    try {
      const { id: clerkId } = evt.data;
      const email = evt.data.email_addresses?.[0]?.email_address;
      const username = evt.data.username || email.split("@")[0];

      if (!email) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Email not found" });
      }

      // Check for existing user by clerkId or email
      const existingUser = await User.findOne({
        $or: [{ clerkId }, { email }],
      }).session(session);

      if (existingUser) {
        // Case 1: Existing user with matching clerkId - log them in
        if (existingUser.clerkId === clerkId) {
          await session.abortTransaction();
          return res.status(200).json({
            message: "User logged in",
            user: existingUser,
          });
        }

        // Case 2: Email exists with different clerkId - update clerkId
        if (existingUser.email === email) {
          existingUser.clerkId = clerkId;
          existingUser.image = evt.data.image_url || existingUser.image;
          await existingUser.save({ session });

          await session.commitTransaction();
          return res.status(200).json({
            message: "User account updated",
            user: existingUser,
          });
        }
      }

      // Case 3: New user - create account
      const newUser = new User({
        clerkId,
        name: username,
        email,
        image: evt.data.image_url,
        role: evt.data.public_metadata?.role || "user",
      });

      await newUser.save({ session });
      await session.commitTransaction();
      return res.status(201).json({
        success: true,
        user: newUser,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        const key = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          error: `User with ${key} already exists`,
          [key]: error.keyValue[key],
        });
      }
      console.error("Webhook error:", error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  return res.status(200).json({ received: true });
};
