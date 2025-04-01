import asyncHandler from "express-async-handler";
import User from "../models/user.js";
import Residency from "../models/residency.js";
import Subscription from "../models/subscription.js";
import dayjs from "dayjs";
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
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;

// paypal
class PayPalError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "PayPalError";
    this.originalError = originalError;
  }
}

class PayPalVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PayPalVerificationError";
  }
}

const CURRENCY_CODE = "USD"; // Default currency

// 1. Payment Order Creation
export const createPayPalOrder = async (amount, currency = CURRENCY_CODE) => {
  try {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();

    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: parseFloat(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: process.env.APP_NAME,
        user_action: "PAY_NOW",
        return_url: process.env.PAYPAL_RETURN_URL,
        cancel_url: process.env.PAYPAL_CANCEL_URL,
      },
    });

    const response = await client.execute(request);
    return {
      id: response.result.id,
      status: response.result.status,
      links: response.result.links,
    };
  } catch (error) {
    throw new PayPalError("Failed to create PayPal order", error);
  }
};

// 2. Payment Capture
export const capturePayPalPayment = async (orderId) => {
  try {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({}); // Required empty body

    const response = await client.execute(request);
    const capture = response.result.purchase_units[0].payments.captures[0];

    return {
      status: capture.status,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      captureId: capture.id,
      createTime: capture.create_time,
    };
  } catch (error) {
    throw new PayPalError("Failed to capture PayPal payment", error);
  }
};

// 3. Webhook Verification
export const verifyWebhookSignature = async (webhookBody, headers) => {
  try {
    const client = getPayPalClient();
    const request = new paypal.notifications.WebhooksVerifySignatureRequest();

    request.requestBody({
      transmission_id: headers["paypal-transmission-id"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      transmission_sig: headers["paypal-transmission-sig"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: webhookBody,
    });

    const response = await client.execute(request);
    if (response.result.verification_status !== "SUCCESS") {
      throw new PayPalVerificationError("Invalid webhook signature");
    }

    return true;
  } catch (error) {
    if (error instanceof PayPalVerificationError) throw error;
    throw new PayPalError("Webhook verification failed", error);
  }
};

// 4. Refund Processing
export const refundPayPalPayment = async (captureId, amount = null) => {
  try {
    const client = getPayPalClient();
    const request = new paypal.payments.CapturesRefundRequest(captureId);

    request.requestBody({
      amount: amount
        ? {
            value: parseFloat(amount).toFixed(2),
            currency_code: CURRENCY_CODE,
          }
        : undefined,
      note_to_payer: "Refund initiated",
    });

    const response = await client.execute(request);
    return {
      refundId: response.result.id,
      status: response.result.status,
      amount: response.result.amount?.value || amount,
    };
  } catch (error) {
    throw new PayPalError("Failed to process refund", error);
  }
};

// 5. Order Details
export const getOrderDetails = async (orderId) => {
  try {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersGetRequest(orderId);

    const response = await client.execute(request);
    return {
      id: response.result.id,
      status: response.result.status,
      createTime: response.result.create_time,
      amount: response.result.purchase_units[0].amount,
      payer: response.result.payer,
      links: response.result.links,
    };
  } catch (error) {
    throw new PayPalError("Failed to fetch order details", error);
  }
};

// 6. Webhook Event Parsing
export const getPayPalEventType = (webhookBody) => {
  try {
    return webhookBody.event_type;
  } catch (error) {
    throw new PayPalError("Invalid webhook event format", error);
  }
};

// 7. Validate Currency
export const validateCurrency = (currency) => {
  const allowedCurrencies = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]); // Add more as needed
  return allowedCurrencies.has(currency.toUpperCase());
};

// 8. Payment Validation
export const validatePaymentAmount = (amount) => {
  const amountValue = parseFloat(amount);
  return !isNaN(amountValue) && amountValue > 0;
};

// stripe payment

const CURRENCY = "usd";

export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { paymentMethodId, amount, userId, ipAddress } = req.body;

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: CURRENCY,
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      metadata: {
        userId,
        ipAddress,
      },
      return_url: process.env.PAYMENT_SUCCESS_URL,
      payment_method_types: ["card"],
    });

    res.json({
      success: true,
      message: "Payment intent created",
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);

    const statusCode = error.type === "StripeInvalidRequestError" ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Payment initialization failed",
      error: {
        code: error.code || "payment_error",
        message: error.message,
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
  const signature = req.headers["x-paystack-signature"];
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    console.warn("Invalid webhook signature");
    return res.status(401).json({ status: "Unauthorized" });
  }

  const event = req.body;
  if (event.event === "charge.success") {
    try {
      const { reference } = event.data;
      const userEmail = event.data.customer?.email;

      // Verify transaction
      const verification = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );

      if (verification.data.data.status === "success") {
        const user = await User.findOne({ email: userEmail });
        if (!user) {
          console.warn(`User not found for email: ${userEmail}`);
          return res.sendStatus(200);
        }

        // Update booking status
        const bookingIndex = user.bookedVisit.findIndex(
          (b) => b.paymentReference === reference
        );

        if (bookingIndex === -1) {
          console.warn(`Booking not found for reference: ${reference}`);
          return res.sendStatus(200);
        }

        user.bookedVisit[bookingIndex].paymentStatus = "paid";
        user.bookedVisit[bookingIndex].verifiedAt = new Date();

        await user.save();

        console.log(`Updated booking for user: ${userEmail}`);
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Log error but still return 200 to prevent retries
    }
  }

  res.sendStatus(200);
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
          typeof value === 'string' && value.trim() === '' ? undefined : value
        ])
        // Remove undefined values to avoid overwriting with undefined
        .filter(([_, value]) => value !== undefined)
    );
  }

  try {
    // First validate required fields if name is being updated
    if ('name' in updates) {
      if (!updates.name || typeof updates.name !== 'string') {
        return res.status(400).json({ 
          message: "Name is required and must be a non-empty string" 
        });
      }
    }

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updates },
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("User update error:", error);
    
    // Handle specific error cases
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation failed",
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate field value",
        field: Object.keys(error.keyPattern)[0]
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
    phone,
    provider,
  } = req.body;
  const { id: propertyId } = req.params;

  try {
    // ============= INPUT VALIDATION =============
    // Date/time validation
    if (
      !dayjs(date, "DD/MM/YYYY", true).isValid() ||
      !dayjs(time, "HH:mm", true).isValid()
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DATETIME",
        message: "Invalid date/time format. Use DD/MM/YYYY and HH:mm",
      });
    }

    // Payment method validation
    const validPaymentMethods = new Set([
      "pay_on_arrival",
      "stripe",
      "paypal",
      "paystack",
      "mobile_money",
    ]);

    if (!validPaymentMethods.has(paymentMethod)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PAYMENT_METHOD",
        message: `Supported methods: ${Array.from(validPaymentMethods).join(
          ", "
        )}`,
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

    // ============= DATA VERIFICATION =============
    // Property verification
    const property = await Residency.findById(propertyId).select(
      "title userEmail images visitingFee"
    );
    if (!property) {
      return res.status(404).json({
        success: false,
        code: "PROPERTY_NOT_FOUND",
        message: "Property does not exist",
      });
    }

    // User verification
    const user = await User.findOne({ email }).select(
      "bookedVisit name telephone address"
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "No user with this email exists",
      });
    }

    // Existing booking check
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
    const visitingFee = property.visitingFee || 0;

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
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentReference
            );
            if (paymentIntent.status !== "succeeded") {
              throw new Error("Payment not completed");
            }
            paymentDetails = {
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              paymentId: paymentIntent.id,
              charges: paymentIntent.charges.data.map((c) => ({
                id: c.id,
                amount: c.amount,
                receipt_url: c.receipt_url,
              })),
            };
            break;

          case "paypal":
            const order = await getPayPalOrderDetails(paymentReference);
            if (order.status !== "COMPLETED") {
              throw new Error("Payment not completed");
            }
            paymentDetails = {
              amount: order.purchase_units[0].amount.value,
              currency: order.purchase_units[0].amount.currency_code,
              captureId: order.purchase_units[0].payments.captures[0].id,
              payer: order.payer.email_address,
            };
            break;

          case "paystack":
          case "mobile_money":
            const verification = await axios.get(
              `${PAYSTACK_BASE_URL}/transaction/verify/${paymentReference}`,
              { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
            );

            if (verification.data.data.status !== "success") {
              throw new Error("Payment verification failed");
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
    const formattedDate = dayjs(date, "DD/MM/YYYY").format("DD/MM/YYYY");
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
        fee: visitingFee,
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
      amount: visitingFee,
      currency: newBooking.payment.currency,
      propertyLink: `${process.env.FRONTEND_URL}/properties/${propertyId}`,
      supportEmail: process.env.SUPPORT_EMAIL,
      year: new Date().getFullYear(),
    };

    // Parallel email sending
    await Promise.all([
      getConfirmationEmail(user.email, emailData),
      owner?.email && getOwnerNotificationEmail(owner.email, emailData),
      getOwnerNotificationEmail(admins, emailData),
    ]);

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

    // Error classification
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
const getPayPalOrderDetails = async (orderId) => {
  const client = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    )
  );

  const request = new paypal.orders.OrdersGetRequest(orderId);
  const response = await client.execute(request);
  return response.result;
};

// Helper: Generate unique booking ID
const generateUniqueBookingNumber = async () => {
  const prefix = "BN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}-${timestamp}-${randomString}`;
};

// controllers/userController.js
export const updateExpiredBookings = async () => {
  try {
    const result = await User.updateMany(
      {
        // Find users with active bookings that have passed
        "bookedVisit.bookingStatus": "active",
        "bookedVisit.date": { $lt: new Date() },
      },
      {
        // Update matching bookings to 'expired'
        $set: {
          "bookedVisit.$[elem].bookingStatus": "expired",
          "bookedVisit.$[elem].metadata.cancelledAt": new Date(),
        },
      },
      {
        // Array filters for precise targeting
        arrayFilters: [
          {
            "elem.bookingStatus": "active",
            "elem.date": { $lt: new Date() },
          },
        ],
      }
    );

    console.log(`Expired ${result.modifiedCount} bookings`);
  } catch (error) {
    console.error("Error updating expired bookings:", error);
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
    // ============= INPUT VALIDATION =============
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      });
    }

    // ============= BOOKING CANCELLATION =============
    const updatedUser = await User.findOneAndUpdate(
      {
        email,
        "bookedVisit.propertyId": propertyId,
        "bookedVisit.bookingStatus": "active",
        "bookedVisit.visitStatus": "pending",
      },
      {
        $set: {
          "bookedVisit.$.bookingStatus": "expired",
          "bookedVisit.$.visitStatus": "cancelled",
          "bookedVisit.$.cancelledAt": new Date(),
        },
      },
      {
        new: true,
        session,
        projection: { bookedVisit: 1, name: 1, telephone: 1, address: 1 },
      }
    ).lean();

    if (!updatedUser) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: "BOOKING_NOT_FOUND",
        message: "Active booking not found",
      });
    }

    // ============= PAYMENT PROCESSING =============
    const cancelledBooking = updatedUser.bookedVisit.find(
      (b) => b.propertyId.toString() === propertyId
    );

    let refundStatus = "not_required";
    if (cancelledBooking.payment.status === "paid") {
      try {
        switch (cancelledBooking.payment.method) {
          case "stripe":
            await stripe.refunds.create({
              payment_intent: cancelledBooking.payment.reference,
            });
            break;

          case "paypal":
            await refundPayPalPayment(
              cancelledBooking.payment.details.captureId
            );
            break;

          case "paystack":
          case "mobile_money":
            await axios.post(
              `${PAYSTACK_BASE_URL}/refund`,
              { transaction: cancelledBooking.payment.reference },
              { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
            );
            break;
        }

        refundStatus = "initiated";
        await User.updateOne(
          { email, "bookedVisit.id": cancelledBooking.id },
          { $set: { "bookedVisit.$.payment.status": "refunded" } },
          { session }
        );
      } catch (refundError) {
        console.error("Refund failed:", refundError);
        refundStatus = "failed";
      }
    }

    // ============= DATA RETRIEVAL =============
    const [property, owner, admins] = await Promise.all([
      Residency.findById(propertyId)
        .select("title userEmail images visitingFee")
        .session(session),
      User.findOne({ email: property.userEmail })
        .select("email")
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

    // ============= NOTIFICATIONS =============
    const emailData = {
      userName: updatedUser.name,
      propertyTitle: property.title,
      date: dayjs(cancelledBooking.date, "DD/MM/YYYY").format("MMMM D, YYYY"),
      time: dayjs(cancelledBooking.time, "HH:mm").format("h:mm A"),
      bookingNumber: cancelledBooking.id,
      amount: cancelledBooking.payment.fee,
      currency: cancelledBooking.payment.currency,
      refundStatus,
      propertyImage: property.images[0] || null,
      supportEmail: process.env.SUPPORT_EMAIL,
      cancellationLink: `${process.env.FRONTEND_URL}/cancellations/${cancelledBooking.id}`,
      year: new Date().getFullYear(),
    };

    await Promise.all([
      getVisitCancellationNotification(email, emailData),
      owner?.email && getOwnerVisitCancellation(owner.email, emailData),
      getOwnerVisitCancellation(admins, emailData),
    ]);

    await session.commitTransaction();

    // ============= FINAL RESPONSE =============
    res.json({
      success: true,
      code: "BOOKING_CANCELLED",
      message: "Booking cancelled successfully",
      data: {
        bookingId: cancelledBooking.id,
        property: property.title,
        cancellationDate: new Date(),
        refundStatus,
        amountRefunded:
          refundStatus === "initiated" ? cancelledBooking.payment.fee : 0,
        currency: cancelledBooking.payment.currency,
      },
      _links: {
        dispute: `${process.env.FRONTEND_URL}/support?case=${cancelledBooking.id}`,
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
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Base query with count
    const [bookings, totalCount] = await Promise.all([
      User.find({ "bookedVisit.0": { $exists: true } })
        .select("name email bookedVisit -_id")
        .populate({
          path: "bookedVisit.propertyId",
          select: "title price address status userEmail",
          match: { status: "published" }, // Only include published properties
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments({ "bookedVisit.0": { $exists: true } }),
    ]);

    // Process and filter bookings
    const formattedBookings = bookings
      .flatMap((user) =>
        user.bookedVisit
          .filter((booking) => booking.propertyId) // Remove deleted properties
          .map((booking) => ({
            ...booking,
            user: {
              name: user.name,
              email: user.email,
            },
            property: {
              title: booking.propertyId.title,
              price: booking.propertyId.price,
              address: booking.propertyId.address,
              owner: booking.propertyId.userEmail,
            },
            // Remove internal IDs from response
            propertyId: undefined,
            _id: undefined,
          }))
      )
      .filter((booking) => booking.property.title); // Final cleanup

    res.status(200).json({
      success: true,
      count: formattedBookings.length,
      totalCount,
      page,
      pageCount: Math.ceil(totalCount / limit),
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Fetch all bookings error:", error);

    const response = {
      success: false,
      message: "Failed to retrieve bookings",
    };

    if (error.name === "CastError") {
      response.message = "Invalid pagination parameters";
      res.status(400);
    } else {
      res.status(500);
    }

    res.json(response);
  }
});

// update visit status
export const updateVisitStatusFromAdmin = asyncHandler(async (req, res) => {
  const { userEmail, bookingId } = req.params;
  const { visitStatus } = req.body;

  // Validate input parameters
  const allowedStatuses = ["pending", "confirmed", "completed", "cancelled"];
  if (!allowedStatuses.includes(visitStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value",
      allowedStatuses: allowedStatuses,
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Update booking status with atomic operation
    const updateResult = await User.findOneAndUpdate(
      { email: userEmail, "bookedVisit.id": bookingId },
      { $set: { "bookedVisit.$.visitStatus": visitStatus } },
      {
        new: true,
        projection: { "bookedVisit.$": 1 },
        session,
      }
    ).session(session);

    if (!updateResult) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 2. Fetch related data for notifications
    const updatedBooking = updateResult.bookedVisit[0];
    const [property, owner, admins] = await Promise.all([
      Residency.findById(updatedBooking.propertyId)
        .select("title userEmail address images")
        .session(session),
      User.findOne({ email: updatedBooking.propertyId.userEmail })
        .select("name email")
        .session(session),
      User.find({ role: "admin" }).select("email").session(session),
    ]);

    // 3. Prepare notification data
    const emailData = {
      bookingId,
      oldStatus: updatedBooking.visitStatus,
      newStatus: visitStatus,
      propertyTitle: property.title,
      propertyAddress: property.address,
      bookingDate: dayjs(updatedBooking.date, "DD/MM/YYYY").format(
        "MMM D, YYYY"
      ),
      bookingTime: dayjs(updatedBooking.time, "HH:mm").format("h:mm A"),
      propertyImage: property.images[0] || null,
      supportEmail: process.env.SUPPORT_EMAIL,
    };

    // 4. Send notifications in parallel
    await Promise.all([
      sendUserNotification(userEmail, emailData),
      sendOwnerNotification(owner.email, emailData),
      sendAdminNotifications(admins, emailData),
    ]);

    await session.commitTransaction();

    // 5. Return success response
    res.json({
      success: true,
      message: "Booking status updated successfully",
      updateDetails: {
        bookingId,
        previousStatus: emailData.oldStatus,
        newStatus: emailData.newStatus,
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

// Helper Functions ------------------------------------------------------

async function sendUserNotification(email, data) {
  try {
    await transporter.sendMail({
      to: email,
      subject: `Booking Status Update - ${data.newStatus.toUpperCase()}`,
      html: generateUserStatusEmail(data),
      text: stripHtml(generateUserStatusEmail(data)).result,
    });
  } catch (error) {
    console.error("Failed to send user notification:", error);
  }
}

async function sendOwnerNotification(ownerEmail, data) {
  if (!ownerEmail) return;

  try {
    await transporter.sendMail({
      to: ownerEmail,
      subject: `Booking Update for ${data.propertyTitle}`,
      html: generateOwnerStatusEmail(data),
      text: stripHtml(generateOwnerStatusEmail(data)).result,
    });
  } catch (error) {
    console.error("Failed to send owner notification:", error);
  }
}

async function sendAdminNotifications(admins, data) {
  const adminEmails = admins.map((a) => a.email);
  if (adminEmails.length === 0) return;

  try {
    await transporter.sendMail({
      bcc: adminEmails,
      subject: `Admin Alert: Booking ${data.bookingId} Updated`,
      html: generateAdminStatusEmail(data),
      text: stripHtml(generateAdminStatusEmail(data)).result,
    });
  } catch (error) {
    console.error("Failed to send admin notifications:", error);
  }
}

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
