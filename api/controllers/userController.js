import asyncHandler from "express-async-handler";
import User from "../models/user.js";
import Residency from "../models/residency.js";
import Subscription from "../models/subscription.js";
import dayjs from "dayjs";
import mongoose from "mongoose";
import checkAndRemoveExpiredBookings from "../config/expiredBookings.js";
import nodemailer from "nodemailer";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import { getPayPalClient } from "./paypalConfig.js";
import crypto from "crypto";
import axios from "axios";
import {
  getConfirmationEmail,
  getOwnerNotificationEmail,
  getVisitCancellationNotification,
  getOwnerVisitCancellation,
  getAdminSubscriptionNotification,
  getSubscriptionEmail,
  getUnsubscriptionEmail,
  getAdminUnsubscriptionNotification,
  generateUserStatusEmail,
  generateOwnerStatusEmail,
  generateAdminStatusEmail,
} from "../src/utils/emailTemplates.js";
import dotenv from "dotenv";
import stripHtml from "strip-html";

dotenv.config();

// Email Utility Functions ====================================================

const sendEmail = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
      text: stripHtml(htmlContent).result,
    });
  } catch (error) {
    console.error("Email error:", error);
  }
};

// Email Transport Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// utils/paypalUtils.js
// Payment Handlers ======================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
console.log("Using Paystack Secret Key:", PAYSTACK_SECRET_KEY);

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;

// PayPal client setup
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID, // Replace with your PayPal client ID
    process.env.PAYPAL_SECRET // Replace with your PayPal secret
  )
);

// stripe payment

const CURRENCY = "usd";

export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { paymentMethodId, amount, userId } = req.body;

  try {
    // Validate input
    if (!paymentMethodId || !amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
      });
    }

    // Convert amount to cents
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create payment intent with automatic confirmation
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: CURRENCY,
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: true,
      metadata: {
        userId,
      },
      return_url: process.env.PAYMENT_SUCCESS_URL,
      payment_method_types: ["card"],
      use_stripe_sdk: true, // Enable Stripe.js for handling authentication
    });

    // Enhanced response with more payment status details
    const responseData = {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
      requiresAction: paymentIntent.status === "requires_action",
      nextAction: paymentIntent.next_action,
    };

    res.json({
      success: true,
      message:
        paymentIntent.status === "succeeded"
          ? "Payment completed successfully"
          : "Payment requires additional action",
      data: responseData,
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);

    // Enhanced error handling
    const statusCode = error.type === "StripeInvalidRequestError" ? 400 : 500;
    const errorMessage =
      error.code === "card_declined"
        ? `Card was declined: ${error.message}`
        : "Payment initialization failed";

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: {
        code: error.code || "payment_error",
        message: error.message,
        decline_code: error.decline_code,
        payment_method: error.payment_method,
      },
    });
  }
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.query;

  try {
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(paymentIntent);

    res.json({
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        lastPaymentError: paymentIntent.last_payment_error,
        charges: paymentIntent.charges.data.map((charge) => ({
          id: charge.id,
          amount: charge.amount,
          status: charge.status,
        })),
      },
    });
  } catch (error) {
    console.error("Payment status check error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve payment status",
      error: {
        code: error.code || "status_check_error",
        message: error.message,
      },
    });
  }
});

export const cancelPaymentIntent = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    res.json({
      success: true,
      message: "Payment intent canceled",
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        cancellationReason: paymentIntent.cancellation_reason,
        canceledAt: paymentIntent.canceled_at,
      },
    });
  } catch (error) {
    console.error("Payment cancellation error:", error);

    const statusCode = error.type === "StripeInvalidRequestError" ? 400 : 500;
    const errorMessage =
      error.code === "resource_missing"
        ? "Payment intent not found"
        : "Failed to cancel payment";

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: {
        code: error.code || "cancellation_error",
        message: error.message,
      },
    });
  }
});

// paystack payment

const MOBILE_MONEY_PROVIDERS = new Set(["mtn", "vodafone", "airtel", "tigo"]);

// Helper: Validate phone number based on provider
const validatePhoneNumber = (phone, provider) => {
  const patterns = {
    mtn: /^(055|054|053|024|059)\d{7}$/,
    vodafone: /^(050|020|010)\d{7}$/,
    airtel: /^(026|056|027)\d{7}$/,
    tigo: /^(057|027|067)\d{7}$/,
  };
  return patterns[provider]?.test(phone);
};

export const payWithMoMo = asyncHandler(async (req, res) => {
  const { email, amount, phone, provider } = req.body;
  console.log(req.body);

  try {
    // Validate input
    if (!email || !amount || !phone || !provider) {
      return res.status(400).json({
        success: false,
        code: "MISSING_FIELDS",
        message: "All payment fields are required",
      });
    }

    if (!MOBILE_MONEY_PROVIDERS.has(provider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PROVIDER",
        message: "Unsupported mobile money provider",
        supportedProviders: Array.from(MOBILE_MONEY_PROVIDERS),
      });
    }

    if (!validatePhoneNumber(phone, provider)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PHONE",
        message: "Invalid phone number format for provider",
      });
    }

    // Create payment request
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/charge`,
      {
        email,
        amount: Math.round(amount * 100),
        currency: "GHS",
        mobile_money: { phone, provider },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15-second timeout
      }
    );

    if (!response.data.status) {
      return res.status(400).json({
        success: false,
        code: "PAYMENT_INIT_FAILED",
        message: response.data.message || "Payment initialization failed",
      });
    }

    res.json({
      success: true,
      data: {
        reference: response.data.data.reference,
        verificationUrl: response.data.data.verification_url,
        status: response.data.data.status,
      },
    });
  } catch (error) {
    console.error("MoMo payment error:", error.response?.data || error.message);

    const statusCode = error.response?.status || 500;
    const errorCode = error.response?.data?.code || "PAYMENT_ERROR";

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.response?.data?.message || "Mobile money payment failed",
    });
  }
});

export const verifyMoMoPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  try {
    if (!reference) {
      return res.status(400).json({
        success: false,
        code: "MISSING_REFERENCE",
        message: "Transaction reference is required",
      });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        timeout: 10000,
      }
    );

    if (!response.data.status || response.data.data.status !== "success") {
      return res.status(400).json({
        success: false,
        code: "VERIFICATION_FAILED",
        message: response.data.message || "Payment verification failed",
        status: response.data.data?.status,
      });
    }

    res.json({
      success: true,
      data: {
        status: response.data.data.status,
        amount: response.data.data.amount / 100,
        currency: response.data.data.currency,
        reference: response.data.data.reference,
        paidAt: response.data.data.paid_at,
      },
    });
  } catch (error) {
    console.error("Verification error:", error.response?.data || error.message);

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      code: "VERIFICATION_ERROR",
      message: error.response?.data?.message || "Payment verification failed",
    });
  }
});

export const paystackWebhook = asyncHandler(async (req, res) => {
  // IMPORTANT: Get the raw body first
  const rawBody = JSON.stringify(req.body);

  // Verify signature
  const secret = PAYSTACK_SECRET_KEY;
  const signature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  // Debug logging
  console.log("Computed Signature:", signature);
  console.log("Received Signature:", req.headers["x-paystack-signature"]);
  console.log("Event Type:", req.body?.event);

  if (signature !== req.headers["x-paystack-signature"]) {
    console.error("❌ Signature verification failed");
    return res.status(401).send("Unauthorized - Invalid signature");
  }

  // Immediately respond to Paystack
  res.status(200).send("Webhook received");

  // Process event asynchronously
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, customer } = event.data;
      console.log("Processing successful payment for reference:", reference);

      // Update user booking
      const updatedUser = await User.findOneAndUpdate(
        {
          email: customer.email,
          "bookedVisit.payment.reference": reference,
        },
        {
          $set: {
            "bookedVisit.$.payment.status": "paid",
            "bookedVisit.$.visitStatus": "confirmed",
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        console.error("User booking not found for reference:", reference);
        return;
      }

      console.log("✅ Booking updated successfully");
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});
// ===============================================================================

// USER
//++++++++++++++++++++++++++++++++++++++++++++++++==============

export const createUser = asyncHandler(async (req, res) => {
  const { email, clerkId } = req.body;

  try {
    // 1. Check for existing user by email only
    const existingUser = await User.findOne({ email });

    // 2. If user exists, update Clerk ID if missing/different
    if (existingUser) {
      if (existingUser.clerkId !== clerkId) {
        existingUser.clerkId = clerkId;
        await existingUser.save();
      }

      await checkAndRemoveExpiredBookings(email);

      return res.status(200).json({
        success: true,
        message: "User already exists",
        user: {
          id: existingUser._id,
          clerkId: existingUser.clerkId,
          email: existingUser.email,
          name: existingUser.name,
          image: existingUser.image,
        },
      });
    }

    // 3. Create new user if no existing email found
    const newUser = new User({
      ...req.body,
      clerkId, // Ensure Clerk ID is saved
    });

    const savedUser = await newUser.save();
    await checkAndRemoveExpiredBookings(email);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: savedUser._id,
        clerkId: savedUser.clerkId,
        email: savedUser.email,
        name: savedUser.name,
        image: savedUser.image,
      },
    });
  } catch (error) {
    console.error("User creation error:", error);

    // Handle duplicate Clerk ID errors
    if (error.code === 11000 && error.keyPattern?.clerkId) {
      const existing = await User.findOne({ clerkId: error.keyValue.clerkId });
      return res.status(409).json({
        success: false,
        message: "Clerk ID already exists",
        existingUser: {
          id: existing._id,
          email: existing.email,
        },
      });
    }

    // Existing error handlers remain the same
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
// User Management Handlers ==============================================

export const editUserDetails = asyncHandler(async (req, res) => {
  const { email } = req.params;
  let updates = req.body;

  // Pre-process updates to handle empty strings
  if (updates) {
    updates = Object.fromEntries(
      Object.entries(updates)
        // Convert empty strings to undefined
        .map(([key, value]) => [
          key,
          typeof value === "string" && value.trim() === "" ? undefined : value,
        ])
        // Remove undefined values to avoid overwriting with undefined
        .filter(([_, value]) => value !== undefined)
    );
  }

  try {
    // First validate required fields if name is being updated
    if ("name" in updates) {
      if (!updates.name || typeof updates.name !== "string") {
        return res.status(400).json({
          message: "Name is required and must be a non-empty string",
        });
      }
    }

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updates },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("User update error:", error);

    // Handle specific error cases
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate field value",
        field: Object.keys(error.keyPattern)[0],
      });
    }

    return res.status(400).json({ message: "Invalid update data" });
  }
});

export const fetchAllUsers = asyncHandler(async (req, res) => {
  try {
    // Extract parameters
    const { role } = req.params;
    const { email } = req.query;

    // Validate input
    if (!role || !email) {
      return res.status(400).json({
        success: false,
        message: "Both role parameter and email query are required",
      });
    }

    // Verify requesting user exists and has correct role
    const currentUser = await User.findOne({ email }).select("role").lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Requesting user not found",
      });
    }

    if (currentUser.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized access: Requires ${role} privileges`,
      });
    }

    // Fetch users with sensitive field filtering
    const users = await User.find()
      .select({
        name: 1,
        email: 1,
        avatar: 1, // Changed from 'image' to match common schema conventions
        role: 1,
        status: 1,
        telephone: 1,
        address: 1,
        bookedVisit: 1,
        favResidenciesID: 1,
        ownedResidencies: 1,
        createdAt: 1, // Added for better auditing
      })
      .populate({
        path: "ownedResidencies",
        select: "title status price", // Limit populated residency data
        match: { status: "published" },
      })
      .lean();

    if (!users.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No users found in database",
        users: [],
      });
    }

    // Sanitize output
    const sanitizedUsers = users.map((user) => ({
      ...user,
      // Remove internal IDs from response
      _id: undefined,
      __v: undefined,
      ownedResidencies: user.ownedResidencies?.map((residency) => ({
        ...residency,
        _id: undefined,
        __v: undefined,
      })),
    }));

    res.status(200).json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error("User fetch error:", error);

    // Mongoose error handling
    let statusCode = 500;
    let errorMessage = "Failed to fetch users";

    if (error.name === "CastError") {
      statusCode = 400;
      errorMessage = "Invalid data format in request";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
    });
  }
});

export const fetchUserDetails = asyncHandler(async (req, res) => {
  const { email } = req.params;

  // Validate email presence and format
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email parameter is required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  try {
    // Clean up expired bookings first
    await checkAndRemoveExpiredBookings(email);

    // Fetch user with sensitive fields excluded
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("-password -__v -updatedAt") // Exclude sensitive/uneeded fields
      .populate({
        path: "bookedVisit.propertyId",
        select: "title images price status",
        match: { status: "published" },
      })
      .populate({
        path: "favResidenciesID",
        select: "_id title images price status",
        match: { status: "published" },
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Sanitize output
    const sanitizedUser = {
      ...user,
      // Remove MongoDB internal fields
      _id: undefined,
      // Filter populated documents
      bookedVisit: user.bookedVisit?.filter((b) => b.propertyId !== null),
      favResidenciesID: user.favResidenciesID?.filter((id) => id !== null),
    };

    res.status(200).json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    console.error("User fetch error:", error);

    // Handle specific Mongoose errors
    let statusCode = 500;
    let errorMessage = "Failed to fetch user details";

    if (error.name === "CastError") {
      statusCode = 400;
      errorMessage = "Invalid data format in request";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
    });
  }
});

export const fetchSingleSubscriptions = asyncHandler(async (req, res) => {
  const { email } = req.query;

  try {
    const subscription = await Subscription.findOne({ email });
    subscription
      ? res.json(subscription)
      : res.status(404).json({ message: "Subscription not found" });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const fetchAllSubscriptions = asyncHandler(async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.json(subscriptions);
  } catch (error) {
    console.error("Subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const userFavourites = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { resId } = req.params;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isFavorite = user.favResidenciesID.includes(resId);
    const operation = isFavorite ? "$pull" : "$addToSet";

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { [operation]: { favResidenciesID: resId } },
      { new: true, select: "favResidenciesID" }
    );

    res.json({
      message: isFavorite ? "Removed from favorites" : "Added to favorites",
      favourites: updatedUser.favResidenciesID,
    });
  } catch (error) {
    console.error("Favorites error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export const fetchUserFavourites = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email })
      .select("favResidenciesID")
      .populate("favResidenciesID", "title images price");

    res.json(user?.favResidenciesID || []);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// =================================================================================

// BOOKING

// Booking Handlers ======================================================

export const bookVisit = asyncHandler(async (req, res) => {
  const {
    email,
    date,
    time,
    paymentMethod,
    paymentReference,
    paypalOrderId,
    phone,
    provider,
    amount,
  } = req.body;
  const { id: propertyId } = req.params;

  // ============= INPUT VALIDATION =============
  // Check required fields
  if (!email || !date || !time || !paymentMethod || !propertyId) {
    return res.status(400).json({
      success: false,
      code: "MISSING_REQUIRED_FIELDS",
      message: "Email, date, time, payment method and property ID are required",
    });
  }

  // Validate date format and ensure it's in the future
  const bookingDate = dayjs(date, "DD/MM/YYYY", true);
  if (!bookingDate.isValid()) {
    return res.status(400).json({
      success: false,
      code: "INVALID_DATE",
      message: "Invalid date format. Use DD/MM/YYYY",
    });
  }
  if (bookingDate.isBefore(dayjs(), "day")) {
    return res.status(400).json({
      success: false,
      code: "PAST_DATE",
      message: "Booking date cannot be in the past",
    });
  }

  // Validate time format
  if (!dayjs(time, "HH:mm", true).isValid()) {
    return res.status(400).json({
      success: false,
      code: "INVALID_TIME",
      message: "Invalid time format. Use HH:mm",
    });
  }

  // Validate payment method
  const validPaymentMethods = [
    "pay_on_arrival",
    "stripe",
    "paypal",
    "paystack",
    "mobile_money",
  ];
  if (!validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_PAYMENT_METHOD",
      message: `Supported methods: ${validPaymentMethods.join(", ")}`,
    });
  }

  // Mobile money specific validation
  if (paymentMethod === "mobile_money") {
    if (!phone || !provider) {
      return res.status(400).json({
        success: false,
        code: "MISSING_MOBILE_DETAILS",
        message: "Phone and provider required for mobile money",
      });
    }

    if (!validatePhoneNumber(phone, provider)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PHONE",
        message: "Invalid phone number for selected provider",
      });
    }
  }

  try {
    // ============= DATA VERIFICATION =============
    const [property, user] = await Promise.all([
      Residency.findById(propertyId).select("title userEmail images"),
      User.findOne({ email }).select(
        "bookedVisit email name telephone address"
      ),
    ]);

    if (!property) {
      return res.status(404).json({
        success: false,
        code: "PROPERTY_NOT_FOUND",
        message: "Property does not exist",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "No user with this email exists",
      });
    }

    // Check for existing active booking
    const hasActiveBooking = user.bookedVisit.some(
      (b) => b.propertyId.equals(propertyId) && b.bookingStatus === "active"
    );
    if (hasActiveBooking) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_BOOKING",
        message: "Active booking already exists for this property",
      });
    }

    // ============= PAYMENT PROCESSING =============
    let paymentStatus = "pending";
    let paymentDetails = {};
    const paymentAmount = amount || 0; // Fixed line

    if (paymentMethod !== "pay_on_arrival") {
      if (!paymentReference) {
        return res.status(400).json({
          success: false,
          code: "MISSING_REFERENCE",
          message: "Payment reference required",
        });
      }

      try {
        switch (paymentMethod) {
          case "stripe":
            const pi = await stripe.paymentIntents.retrieve(paymentReference, {
              expand: ["charges.data.balance_transaction"],
            });

            if (pi.status !== "succeeded") {
              throw new Error(`Payment not completed: ${pi.status}`);
            }

            if (pi.amount / 100 !== paymentAmount) {
              // Changed to paymentAmount
              throw new Error(
                `Amount mismatch: Paid ${
                  pi.amount / 100
                } vs Expected ${paymentAmount}`
              );
            }
            break;

          case "paypal":
            if (paypalOrderId) {
              try {
                const request = new paypal.orders.OrdersCaptureRequest(
                  paypalOrderId
                );
                request.requestBody({});

                const response = await paypalClient.execute(request);

                if (response.result.status !== "COMPLETED") {
                  return res.status(400).json({
                    message: "PayPal payment failed. Please try again.",
                  });
                }
              } catch (paypalError) {
                console.error("PayPal payment error:", paypalError);
                return res.status(400).json({
                  message: "PayPal payment failed. Please try again.",
                });
              }
            }

            break;

          case "paystack":
          case "mobile_money":
            const verification = await axios.get(
              `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${paymentReference}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
              }
            );

            if (verification.data.data.status !== "success") {
              throw new Error("Payment verification failed");
            }
            if (verification.data.data.amount / 100 !== amount) {
              throw new Error("Payment amount doesn't match visiting fee");
            }
            paymentDetails = {
              amount: verification.data.data.amount / 100,
              currency: verification.data.data.currency,
              reference: verification.data.data.reference,
              channel: verification.data.data.channel,
            };
            break;
        }

        paymentStatus = "paid";
      } catch (paymentError) {
        console.error("Payment verification failed:", paymentError);
        return res.status(402).json({
          success: false,
          code: "PAYMENT_FAILURE",
          message: paymentError.response?.data?.message || paymentError.message,
          details: paymentError.response?.data || null,
        });
      }
    }

    // ============= BOOKING CREATION =============
    const bookingNumber = await generateUniqueBookingNumber();
    const formattedDate = bookingDate.format("DD/MM/YYYY");
    const formattedTime = dayjs(time, "HH:mm").format("HH:mm");

    const newBooking = {
      id: bookingNumber,
      propertyId,
      date: formattedDate,
      time: formattedTime,
      visitStatus: "pending",
      bookingStatus: "active",
      payment: {
        method: paymentMethod,
        status: paymentStatus,
        reference: paymentReference,
        details: paymentDetails,
        fee: amount,
        currency: paymentDetails.currency || "USD",
      },
      metadata: {
        bookedAt: new Date(),
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    };

    // Database operation
    const updateResult = await User.updateOne(
      { email },
      { $push: { bookedVisit: newBooking } }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Database update failed");
    }

    // ============= NOTIFICATIONS =============
    const [owner, admins] = await Promise.all([
      User.findOne({ email: property.userEmail }),
      User.find({ role: "admin" }).select("email"),
    ]);

    const emailData = {
      userName: user.name,
      userEmail: user.email,
      userPhone: user.telephone,
      propertyTitle: property.title,
      bookingNumber,
      date: formattedDate,
      time: formattedTime,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus,
      amount: amount,
      currency: newBooking.payment.currency,
      propertyLink: `${process.env.FRONTEND_URL}/properties/${propertyId}`,
      supportEmail: process.env.SUPPORT_EMAIL,
      year: new Date().getFullYear(),
    };

    // Enhanced email sending with proper error handling
    const sendBookingEmail = async (recipient, templateFn, subject) => {
      if (!recipient) return;

      try {
        const emailContent = templateFn(emailData);

        await transporter.sendMail({
          from: process.env.NOREPLY_EMAIL,
          to: recipient,
          subject: subject,
          html: emailContent,
          text: stripHtml(emailContent).result,
        });

        console.log(`Booking email sent to ${recipient}`);
      } catch (emailError) {
        console.error(
          `Failed to send booking email to ${recipient}:`,
          emailError
        );
        // Consider logging this to a monitoring service
      }
    };

    // Send emails in parallel with proper error handling
    await Promise.all([
      sendBookingEmail(
        user.email,
        getConfirmationEmail,
        `Your Booking Confirmation #${bookingNumber}`
      ),
      owner?.email &&
        sendBookingEmail(
          owner.email,
          getOwnerNotificationEmail,
          `New Booking for ${property.title}`
        ),
      ...admins.map((admin) =>
        sendBookingEmail(
          admin.email,
          getOwnerNotificationEmail,
          `New Booking Notification #${bookingNumber}`
        )
      ),
    ]);

    // Optional: Send to additional stakeholders if needed
    if (process.env.BOOKING_NOTIFICATION_EMAIL) {
      await sendBookingEmail(
        process.env.BOOKING_NOTIFICATION_EMAIL,
        getOwnerNotificationEmail,
        `[System] New Booking #${bookingNumber}`
      );
    }

    // ============= FINAL RESPONSE =============
    res.status(201).json({
      success: true,
      code: "BOOKING_CREATED",
      message: "Visit booked successfully",
      data: {
        bookingId: bookingNumber,
        property: property.title,
        date: formattedDate,
        time: formattedTime,
        paymentStatus,
        nextSteps:
          paymentStatus === "paid"
            ? "Your payment was successful. Check email for details."
            : "Complete payment on arrival during your visit.",
      },
      _links: {
        viewBooking: `${process.env.FRONTEND_URL}/bookings/${bookingNumber}`,
        cancelPolicy: `${process.env.FRONTEND_URL}/cancellation-policy`,
      },
    });
  } catch (error) {
    console.error("Booking error:", error);

    const errorResponse = {
      success: false,
      code: "BOOKING_FAILURE",
      message: "Failed to create booking",
      details: null,
    };

    if (error.name === "ValidationError") {
      errorResponse.code = "SCHEMA_VALIDATION";
      errorResponse.message = "Invalid booking data";
      errorResponse.details = Object.values(error.errors).map((e) => e.message);
      res.status(400);
    } else if (error.code === 11000) {
      errorResponse.code = "DUPLICATE_BOOKING";
      errorResponse.message = "Booking already exists";
      res.status(409);
    } else if (error instanceof Stripe.errors.StripeError) {
      errorResponse.code = `STRIPE_${error.type.toUpperCase()}`;
      errorResponse.message = error.message;
      res.status(402);
    } else {
      res.status(500);
    }

    res.json(errorResponse);
  }
});

// Helper: Retrieve PayPal order details
// const getPayPalOrderDetails = async (orderId) => {
//   const client = new paypal.core.PayPalHttpClient(
//     new paypal.core.SandboxEnvironment(
//       process.env.PAYPAL_CLIENT_ID,
//       process.env.PAYPAL_CLIENT_SECRET
//     )
//   );

//   const request = new paypal.orders.OrdersGetRequest(orderId);
//   const response = await client.execute(request);
//   return response.result;
// };

// Helper: Generate unique booking ID
const generateUniqueBookingNumber = async () => {
  const prefix = "BN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}-${timestamp}-${randomString}`;
};


/**
 * Updates all expired bookings across all users in the database
 * Finds and marks active bookings with past dates as expired
 * @returns {Promise<void>}
 * @throws {Error} - Throws error if the update operation fails
 */
export const updateExpiredBookings = async () => {
  try {
    // Perform a bulk update operation across all users
    const result = await User.updateMany(
      {
        // Query criteria:
        // 1. Find users who have at least one booking with 'active' status
        "bookedVisit.bookingStatus": "active",
        // 2. And where the booking date is before today's date
        //    (using dayjs().format() to get current date in DD/MM/YYYY format)
        "bookedVisit.date": { 
          $lt: dayjs().format("DD/MM/YYYY") 
        },
      },
      {
        // Update operation:
        // $set operator to modify specific fields in matched bookings
        $set: {
          // Update bookingStatus to 'expired'
          "bookedVisit.$[elem].bookingStatus": "expired",
          // Record cancellation timestamp in metadata
          "bookedVisit.$[elem].metadata.cancelledAt": new Date(),
          // Update visitStatus to 'expired'
          "bookedVisit.$[elem].visitStatus": "expired",
        },
      },
      {
        // Array filters for precise targeting within the bookedVisit array:
        // Only apply updates to array elements that match these criteria
        arrayFilters: [
          {
            // Match elements where:
            // 1. bookingStatus is 'active'
            "elem.bookingStatus": "active",
            // 2. date is before today (same format as above)
            "elem.date": { $lt: dayjs().format("DD/MM/YYYY") },
          },
        ],
        // Note: By default, updateMany only updates the first matching
        // array element per document. To update all matches, you would
        // need to use the { multi: true } option, but in this case
        // the arrayFilters handle that for us.
      }
    );

    // Log the number of bookings that were updated
    console.log(`Expired ${result.modifiedCount} bookings`);
  } catch (error) {
    // Log any errors that occur during the bulk update
    console.error("Error updating expired bookings:", error);
    // Re-throw the error to be handled by the calling function
    throw error;
  }
};

// ===================================
export const cancelBooking = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id: propertyId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      });
    }

    // Find the user and booking
    const user = await User.findOne({ email }).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // Find the active booking
    const bookingIndex = user.bookedVisit.findIndex(
      (b) =>
        b.propertyId.toString() === propertyId &&
        b.bookingStatus === "active" &&
        b.visitStatus === "pending"
    );

    if (bookingIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: "BOOKING_NOT_FOUND",
        message: "Active booking not found",
      });
    }

    const booking = user.bookedVisit[bookingIndex];

    // Process refund if payment was made
    let refundStatus = "not_required";
    if (booking.payment.status === "paid") {
      try {
        switch (booking.payment.method) {
          case "stripe":
            await stripe.refunds.create({
              payment_intent: booking.payment.reference,
              amount: Math.round(booking.payment.fee * 100), // Convert to cents
            });
            refundStatus = "initiated";
            break;

          case "paypal":
            try {
              // First verify if we have a PayPal order ID
              const paypalOrderId = booking.payment.reference;
              if (!paypalOrderId) {
                throw new Error("Missing PayPal order ID in payment reference");
              }

              // 1. Get the order details first
              const orderRequest = new paypal.orders.OrdersGetRequest(
                paypalOrderId
              );
              const orderResponse = await paypalClient.execute(orderRequest);

              // Check if order exists and is completed
              if (
                !orderResponse.result ||
                orderResponse.result.status !== "COMPLETED"
              ) {
                throw new Error(
                  `PayPal order not completed (status: ${orderResponse.result?.status})`
                );
              }

              // 2. Try to find the capture ID from the order details
              let captureId =
                orderResponse.result.purchase_units[0]?.payments?.captures[0]
                  ?.id;

              // If no capture ID found, try to capture the order
              if (!captureId) {
                const captureRequest = new paypal.orders.OrdersCaptureRequest(
                  paypalOrderId
                );
                captureRequest.requestBody({});

                const captureResponse = await paypalClient.execute(
                  captureRequest
                );

                if (captureResponse.result.status !== "COMPLETED") {
                  throw new Error("Failed to capture PayPal order");
                }

                captureId =
                  captureResponse.result.purchase_units[0]?.payments
                    ?.captures[0]?.id;

                if (!captureId) {
                  throw new Error("Could not get capture ID from PayPal order");
                }
              }

              // 3. Process the refund with the capture ID
              const refundRequest = new paypal.payments.CapturesRefundRequest(
                captureId
              );
              refundRequest.requestBody({
                amount: {
                  value: booking.payment.fee.toString(),
                  currency_code: booking.payment.currency || "USD",
                },
                note_to_payer: "Booking cancellation refund",
              });

              const refundResponse = await paypalClient.execute(refundRequest);

              if (refundResponse.statusCode !== 201) {
                throw new Error(
                  `PayPal refund failed with status ${refundResponse.statusCode}`
                );
              }

              refundStatus = "initiated";
            } catch (paypalError) {
              console.error("PayPal refund error:", {
                error: paypalError.message,
                debugId: paypalError.response?.headers?.["paypal-debug-id"],
                orderId: booking.payment.reference,
                paymentDetails: booking.payment.details,
              });
              refundStatus = "failed";
            }
            break;

          case "paystack":
          case "mobile_money":
            const paystackResponse = await axios.post(
              `${PAYSTACK_BASE_URL}/refund`,
              {
                transaction: booking.payment.reference,
                amount: Math.round(booking.payment.fee * 100), // Paystack uses amount in kobo/pesewas
                currency: booking.payment.currency || "GHS",
              },
              {
                headers: {
                  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (
              !paystackResponse.data.status ||
              paystackResponse.data.data.status !== "processed"
            ) {
              throw new Error(
                `Paystack refund failed: ${
                  paystackResponse.data.message || "Unknown error"
                }`
              );
            }
            refundStatus = "initiated";
            break;
        }
      } catch (refundError) {
        console.error("Refund failed:", refundError);
        refundStatus = "failed";

        // Log detailed error information
        if (refundError.response) {
          console.error("Refund error details:", {
            status: refundError.response.status,
            data: refundError.response.data,
            headers: refundError.response.headers,
          });
        }
      }
    }

    // Update booking status
    user.bookedVisit[bookingIndex].bookingStatus = "cancelled";
    user.bookedVisit[bookingIndex].visitStatus = "cancelled";
    user.bookedVisit[bookingIndex].cancelledAt = new Date();

    if (refundStatus === "initiated") {
      user.bookedVisit[bookingIndex].payment.status = "refunded";
      user.bookedVisit[bookingIndex].payment.refundedAt = new Date();
    }

    await user.save({ session });

    // Get property and admin details
    const [property, admins] = await Promise.all([
      Residency.findById(propertyId)
        .select("title userEmail images")
        .session(session),
      User.find({ role: "admin" }).select("email").session(session),
    ]);

    if (!property) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: "PROPERTY_NOT_FOUND",
        message: "Property not found",
      });
    }

    // Send notifications
    const emailData = {
      userName: user.name,
      propertyTitle: property.title,
      date: dayjs(booking.date, "DD/MM/YYYY").format("MMMM D, YYYY"),
      time: dayjs(booking.time, "HH:mm").format("h:mm A"),
      bookingNumber: booking.id,
      amount: booking.payment.fee,
      currency: booking.payment.currency,
      refundStatus,
      propertyImage: property.images[0] || null,
      supportEmail: process.env.SUPPORT_EMAIL,
      cancellationLink: `${process.env.FRONTEND_URL}/cancellations/${booking.id}`,
      year: new Date().getFullYear(),
    };

    await Promise.all([
      sendEmail(
        user.email,
        "Booking Cancellation Confirmation",
        getVisitCancellationNotification(emailData)
      ),
      sendEmail(
        property.userEmail,
        `Booking Cancelled: ${property.title}`,
        getOwnerVisitCancellation(emailData)
      ),
      ...admins.map((admin) =>
        sendEmail(
          admin.email,
          `Admin: Booking Cancelled (${booking.id})`,
          getOwnerVisitCancellation(emailData)
        )
      ),
    ]);

    await session.commitTransaction();

    res.json({
      success: true,
      code: "BOOKING_CANCELLED",
      message: "Booking cancelled successfully",
      data: {
        bookingId: booking.id,
        property: property.title,
        cancellationDate: new Date(),
        refundStatus,
        amountRefunded: refundStatus === "initiated" ? booking.payment.fee : 0,
        currency: booking.payment.currency,
      },
      _links: {
        dispute: `${process.env.FRONTEND_URL}/support?case=${booking.id}`,
        newBooking: `${process.env.FRONTEND_URL}/properties/${propertyId}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Cancellation error:", error);

    const errorResponse = {
      success: false,
      code: "CANCELLATION_FAILED",
      message: "Cancellation failed",
      details: null,
    };

    if (error.name === "CastError") {
      errorResponse.code = "INVALID_ID";
      errorResponse.message = "Invalid property ID format";
      res.status(400);
    } else if (error instanceof Stripe.errors.StripeError) {
      errorResponse.code = `STRIPE_${error.type.toUpperCase()}`;
      errorResponse.message = error.message;
      res.status(402);
    } else {
      res.status(500);
    }

    res.json(errorResponse);
  } finally {
    session.endSession();
  }
});
// ==============================================================================

// fetch User bookings

export const fetchUserBookings = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Find user with populated bookings
    const user = await User.findOne({ email })
      .select("bookedVisit")
      .populate({
        path: "bookedVisit.propertyId",
        select: "title images price address status",
        match: { status: "published" }, // Only show published properties
      })
      .lean();

    // Filter out bookings for unpublished properties
    const validBookings =
      user?.bookedVisit.filter((booking) => booking.propertyId !== null) || [];

    // Transform booking data format
    const formattedBookings = validBookings.map((booking) => ({
      id: booking.id,
      date: booking.date,
      time: booking.time,
      status: booking.visitStatus,
      property: {
        id: booking.propertyId._id,
        title: booking.propertyId.title,
        price: booking.propertyId.price,
        mainImage: booking.propertyId.images[0] || null,
        address: booking.propertyId.address,
      },
      paymentStatus: booking.paymentStatus,
      bookedAt: booking.bookedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);

    const response = {
      success: false,
      message: "Failed to fetch bookings",
    };

    if (error.name === "CastError") {
      response.message = "Invalid data format in bookings";
      res.status(400);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});

// fetch all bookings

export const fetchAllBookings = asyncHandler(async (req, res) => {
  try {
    // PAGINATION CONFIGURATION
    // Extract page number from query params, default to 1 if not provided or invalid
    const page = parseInt(req.query.page) || 1;
    // Extract items per page limit from query params, default to 100
    const limit = parseInt(req.query.limit) || 100;
    // Calculate number of documents to skip based on current page
    const skip = (page - 1) * limit;

    // DATABASE QUERIES
    // Execute both data fetch and count queries in parallel for efficiency
    const [bookings, totalCount] = await Promise.all([
      // QUERY 1: Fetch booking data with pagination
      User.find({ "bookedVisit.0": { $exists: true } }) // Find users with at least one booking
        .select("name email telephone bookedVisit") // Only include these user fields
        .populate({
          path: "bookedVisit.propertyId", // Populate property reference in bookings
          select: "title price address status userEmail gpsCode", // Fields to include from Property
          match: { status: "published" }, // Only include published properties
        })
        .skip(skip) // Apply pagination skip
        .limit(limit) // Apply pagination limit
        .lean(), // Convert to plain JS objects for better performance

      // QUERY 2: Get total count of users with bookings for pagination info
      User.countDocuments({ "bookedVisit.0": { $exists: true } }),
    ]);

    // DATA PROCESSING PIPELINE
    const formattedBookings = bookings
      // Convert array of users with bookings to flat array of all bookings
      .flatMap((user) =>
        user.bookedVisit
          // Filter out bookings where property doesn't exist or isn't published
          .filter((booking) => booking.propertyId)
          // Transform each booking to include user and property details
          .map((booking) => ({
            ...booking, // Spread all existing booking fields
            // Add user information to each booking
            user: {
              name: user.name,
              email: user.email,
              telephone: user.telephone,
            },
            // Add structured property information from populated data
            property: {
              title: booking.propertyId.title,
              price: booking.propertyId.price,
              address: booking.propertyId.address,
              owner: booking.propertyId.userEmail, // Property owner's email
              propertyId: booking.propertyId._id, // Actual property ID
              gpsCode: booking.propertyId.gpsCode, // GPS coordinates if available
            },
            // Remove internal fields from response for cleaner output
            propertyId: undefined, // Remove duplicate property reference
            _id: undefined, // Remove MongoDB's internal _id field
          }))
      )
      // Final quality check - ensure all bookings have valid property titles
      .filter((booking) => booking.property.title);

    // SUCCESS RESPONSE
    res.status(200).json({
      success: true, // Operation status flag
      count: formattedBookings.length, // Number of bookings on current page
      totalCount, // Total bookings across all pages
      page, // Current page number
      pageCount: Math.ceil(totalCount / limit), // Total number of pages available
      bookings: formattedBookings, // The processed booking data
    });
  } catch (error) {
    // ERROR HANDLING
    console.error("Fetch all bookings error:", error); // Log full error for debugging

    // Prepare error response object
    const response = {
      success: false, // Operation failed flag
      message: "Failed to retrieve bookings", // Default error message
    };

    // Handle specific error types differently
    if (error.name === "CastError") {
      // Special case for invalid pagination parameters
      response.message = "Invalid pagination parameters";
      res.status(400); // Bad Request status code
    } else {
      // Generic server error for all other cases
      res.status(500); // Internal Server Error status code
    }

    // Send error response to client
    res.json(response);
  }
});

// update visit status
export const updateVisitStatusFromAdmin = asyncHandler(async (req, res) => {
  const { userEmail, bookingId } = req.params;
  const { visitStatus, paymentStatus } = req.body; 

  // Validate input parameters - allowed status values for both visit and payment
  const allowedStatuses = ["pending", "confirmed", "completed", "cancelled", "paid"];
  if (!allowedStatuses.includes(visitStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value",
      allowedStatuses: allowedStatuses,
    });
  }

  // Start database transaction for atomic operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. First find the user to get the current booking details
    const user = await User.findOne({
      email: userEmail,
      "bookedVisit.id": bookingId,
    }).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 2. Find the specific booking to get the current status
    const booking = user.bookedVisit.find((b) => b.id === bookingId);
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 3. Update both visit status and payment status in a single operation
    await User.updateOne(
      { email: userEmail, "bookedVisit.id": bookingId },
      { 
        $set: { 
         "bookedVisit.$.visitStatus": visitStatus,
        "bookedVisit.$.payment.status": paymentStatus // Directly use paymentStatus
        } 
      },
      { session }
    );

    // 4. Fetch the updated booking with property details for notifications
    const updatedUser = await User.findOne({ email: userEmail })
      .select({ bookedVisit: { $elemMatch: { id: bookingId } } })
      .populate({
        path: "bookedVisit.propertyId",
        select: "title userEmail address images",
      })
      .session(session);

    if (!updatedUser || !updatedUser.bookedVisit || updatedUser.bookedVisit.length === 0) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found after update",
      });
    }

    const updatedBooking = updatedUser.bookedVisit[0];

    // Verify property exists and has required fields
    if (!updatedBooking.propertyId) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Property not found for this booking",
      });
    }

    const property = updatedBooking.propertyId;
    const ownerEmail = property.userEmail;

    if (!ownerEmail) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Property owner email not found",
      });
    }

    // Get owner and admin details for notifications
    const [owner, admins] = await Promise.all([
      User.findOne({ email: ownerEmail }).select("name email").session(session),
      User.find({ role: "admin" }).select("email").session(session),
    ]);

    // Prepare notification data with both visit and payment status
    const emailData = {
      bookingId,
      oldStatus: booking.visitStatus,
      newStatus: visitStatus,
      paymentStatus: visitStatus === "completed" ? "paid" : booking.payment.status,
      propertyTitle: property.title || "Unknown Property",
      propertyAddress: property.address || "Address not available",
      bookingDate: dayjs(updatedBooking.date, "DD/MM/YYYY").format("MMM D, YYYY"),
      bookingTime: dayjs(updatedBooking.time, "HH:mm").format("h:mm A"),
      propertyImage: property.images?.[0] || null,
      supportEmail: process.env.SUPPORT_EMAIL,
      userName: user.name || "Customer",
    };

    // Send notifications (only if owner exists)
    const notificationPromises = [
      sendEmail(
        userEmail,
        `Booking Status Update - ${visitStatus.toUpperCase()}`,
        generateUserStatusEmail(emailData)
      ).catch((e) => console.error("Failed to send user email:", e)),
    ];

    if (owner?.email) {
      notificationPromises.push(
        sendEmail(
          owner.email,
          `Booking Update for ${emailData.propertyTitle}`,
          generateOwnerStatusEmail(emailData)
        ).catch((e) => console.error("Failed to send owner email:", e))
      );
    }

    // Send admin notifications with payment status info
    admins.forEach((admin) => {
      notificationPromises.push(
        sendEmail(
          admin.email,
          `Admin: Booking ${bookingId} Status Update`,
          generateAdminStatusEmail({
            ...emailData,
            ownerEmail: owner?.email || "Not available",
            paymentStatus: emailData.paymentStatus,
          })
        ).catch((e) =>
          console.error(`Failed to send admin email to ${admin.email}:`, e)
        )
      );
    });

    await Promise.all(notificationPromises);
    await session.commitTransaction();

    // Return success response with both statuses
    res.json({
      success: true,
      message: "Booking status updated successfully",
      updateDetails: {
        bookingId,
        previousStatus: emailData.oldStatus,
        newVisitStatus: emailData.newStatus,
        newPaymentStatus: emailData.paymentStatus,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Status update error:", error);

    const response = {
      success: false,
      message: "Status update failed",
    };

    if (error.name === "CastError") {
      response.message = "Invalid booking ID format";
      res.status(400);
    } else if (error.name === "ValidationError") {
      response.message = "Invalid status transition";
      res.status(409);
    } else {
      res.status(500);
    }

    res.json(response);
  } finally {
    session.endSession();
  }
});


// =========================================================================

// Subscription Handlers ================================================

export const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format",
        errorCode: "INVALID_EMAIL",
      });
    }

    // Normalize email input
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing subscription (case insensitive)
    const existingSub = await Subscription.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
    });

    if (existingSub) {
      // If already subscribed and not unsubscribed
      if (!existingSub.unsubscribedAt) {
        return res.status(409).json({
          success: false,
          message: "This email is already subscribed",
          errorCode: "DUPLICATE_SUBSCRIPTION",
          existingSince: existingSub.createdAt,
        });
      }

      // If previously unsubscribed, resubscribe them
      existingSub.unsubscribedAt = undefined;
      existingSub.unsubscribeSource = undefined;
      existingSub.confirmationSentAt = new Date();
      await existingSub.save();

      // Send confirmation email
      const emailContent = getSubscriptionEmail({
        email: existingSub.email,
        unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe/${existingSub._id}`,
        year: new Date().getFullYear(),
      });

      await transporter.sendMail({
        from: process.env.NOREPLY_EMAIL,
        to: existingSub.email,
        subject: "Resubscription Confirmation",
        html: emailContent,
        text: stripHtml(emailContent).result,
      });

      return res.status(200).json({
        success: true,
        message: "Resubscribed successfully",
        data: {
          id: existingSub._id,
          email: existingSub.email,
          createdAt: existingSub.createdAt,
          updatedAt: existingSub.updatedAt,
        },
      });
    }

    // Create new subscription
    const newSubscription = await Subscription.create({
      email: normalizedEmail,
      source: "website_form",
      confirmationSentAt: new Date(),
    });

    // Send confirmation email for new subscription
    const emailContent = getSubscriptionEmail({
      email: newSubscription.email,
      unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe/${newSubscription._id}`,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: process.env.NOREPLY_EMAIL,
      to: newSubscription.email,
      subject: "Subscription Confirmation",
      html: emailContent,
      text: stripHtml(emailContent).result,
    });

    // Notify admins
    const admins = await User.find({ role: "admin" }).select("email");
    await Promise.all(
      admins.map((admin) =>
        transporter.sendMail({
          from: process.env.NOREPLY_EMAIL,
          to: admin.email,
          subject: "New Newsletter Subscription",
          html: getAdminSubscriptionNotification({
            email: newSubscription.email,
            subscriptionDate: newSubscription.createdAt,
          }),
        })
      )
    );

    res.status(201).json({
      success: true,
      message: "Subscription successful",
      data: {
        id: newSubscription._id,
        email: newSubscription.email,
        createdAt: newSubscription.createdAt,
      },
      _links: {
        unsubscribe: `${process.env.API_URL}/subscriptions/${newSubscription._id}`,
      },
    });
  } catch (error) {
    console.error("Subscription error:", error);

    const response = {
      success: false,
      message: "Subscription failed",
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid subscription data";
      response.errors = Object.values(error.errors).map((e) => e.message);
      res.status(400);
    } else if (error.code === 11000) {
      response.message = "Duplicate subscription detected";
      res.status(409);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});

export const unSubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format",
        errorCode: "INVALID_EMAIL",
      });
    }

    // Normalize email input
    const normalizedEmail = email.toLowerCase().trim();

    // Find subscription (whether currently subscribed or not)
    const subscription = await Subscription.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this email",
        errorCode: "SUBSCRIPTION_NOT_FOUND",
      });
    }

    // If already unsubscribed
    if (subscription.unsubscribedAt) {
      return res.status(200).json({
        success: true,
        message: "This email is already unsubscribed",
        data: {
          email: subscription.email,
          subscribedAt: subscription.createdAt,
          unsubscribedAt: subscription.unsubscribedAt,
        },
      });
    }

    // Update subscription to mark as unsubscribed
    subscription.unsubscribedAt = new Date();
    subscription.unsubscribeSource = "user_request";
    await subscription.save();

    // Send confirmation email
    const emailContent = getUnsubscriptionEmail({
      email: subscription.email,
      subscribedDate: subscription.createdAt,
      resubscribeLink: `${process.env.FRONTEND_URL}/subscribe`,
      supportEmail: process.env.SUPPORT_EMAIL,
    });

    await transporter.sendMail({
      from: process.env.NOREPLY_EMAIL,
      to: subscription.email,
      subject: "Unsubscription Confirmation",
      html: emailContent,
      text: stripHtml(emailContent).result,
    });

    // Notify admins
    const admins = await User.find({ role: "admin" }).select("email");
    await Promise.all(
      admins.map((admin) =>
        transporter.sendMail({
          from: process.env.NOREPLY_EMAIL,
          to: admin.email,
          subject: "User Unsubscribed from Newsletter",
          html: getAdminUnsubscriptionNotification({
            email: subscription.email,
            unsubscribeDate: subscription.unsubscribedAt,
          }),
        })
      )
    );

    res.json({
      success: true,
      message: "Successfully unsubscribed",
      data: {
        email: subscription.email,
        subscribedAt: subscription.createdAt,
        unsubscribedAt: subscription.unsubscribedAt,
      },
      _links: {
        resubscribe: `${process.env.API_URL}/subscriptions`,
        privacyPolicy: `${process.env.FRONTEND_URL}/privacy`,
      },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);

    const response = {
      success: false,
      message: "Unsubscription failed",
    };

    if (error.name === "ValidationError") {
      response.message = "Invalid subscription data";
      response.errors = Object.values(error.errors).map((e) => e.message);
      res.status(400);
    } else if (error.code === 11000) {
      response.message = "Subscription conflict detected";
      res.status(409);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});
