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

  // Handle user.updated event
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
        user: { id: user._id, role: user.role },
      });
    } catch (error) {
      console.error("Role update error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle user.created event
  if (evt.type === "user.created") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id: clerkId, email_addresses, image_url, username } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      const name = username || email?.split("@")[0];

      if (!email) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Email not found" });
      }

      // Check if user already exists
      let user = await User.findOne({ $or: [{ clerkId }, { email }] }).session(session);

      if (user) {
        if (user.clerkId === clerkId) {
          await session.abortTransaction();
          return res.status(200).json({ message: "User already exists", user });
        }

        // If email exists with different clerkId, update clerkId
        user.clerkId = clerkId;
        user.image = image_url || user.image;
        await user.save({ session });

        await session.commitTransaction();
        return res.status(200).json({ message: "User updated", user });
      }

      // Create new user
      user = new User({
        clerkId,
        name,
        email,
        image: image_url,
        role: evt.data.public_metadata?.role || "user",
      });

      await user.save({ session });
      await session.commitTransaction();
      return res.status(201).json({ success: true, user });
    } catch (error) {
      await session.abortTransaction();

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(409).json({ error: `User already exists`, key: error.keyValue });
      }

      console.error("Webhook error:", error);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  return res.status(200).json({ received: true });
};
