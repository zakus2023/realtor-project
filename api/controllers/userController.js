import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import dayjs from "dayjs";
import checkAndRemoveExpiredBookings from "../config/expiredBookings.js";
import nodemailer from "nodemailer";
import { nanoid } from "nanoid"; // For generating unique IDs
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk"; // Import PayPal SDK
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
// Add these imports at the top
import {
  getConfirmationEmail,
  getOwnerNotificationEmail,
  getVisitCancellationNotification,
  getOwnerVisitCancellation,
  getAdminSubscriptionNotification,
  getSubscriptionEmail,
  getUnsubscriptionEmail,
} from "../src//utils/emailTemplates.js";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;

/**
 * Initiate MTN Mobile Money Payment via Paystack
 */
export const payWithMoMo = asyncHandler(async (req, res) => {
  const { email, amount, phone, provider } = req.body;

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/charge`,
      {
        email,
        amount: amount * 100, // Convert to kobo (smallest unit)
        currency: "GHS", // Change to country currency if needed (e.g., GHS for Ghana)
        mobile_money: {
          phone,
          provider, // Accepts 'mtn', 'vodafone', or 'airtel'
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status) {
      return res.json({
        success: true,
        message: "Payment initiated successfully",
        data: response.data.data,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: response.data.message });
    }
  } catch (error) {
    console.error("Paystack MoMo Error:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Payment failed",
      error: error.message,
    });
  }
});

export const verifyMoMoPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status && response.data.data.status === "success") {
      return res.json({
        success: true,
        message: "Payment successful",
        data: response.data.data,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }
  } catch (error) {
    console.error(
      "Paystack Verification Error:",
      error.response?.data || error
    );
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
});

export const paystackWebhook = asyncHandler(async (req, res) => {
  const secret = PAYSTACK_SECRET_KEY; // Ensure this is set in your environment
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Unauthorized");
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const { reference, customer } = event.data;

    console.log("Payment Reference from Webhook:", reference); // Debugging

    try {
      const verificationResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        }
      );

      const verificationData = verificationResponse.data;
      console.log("VERIFICATION DATA: ", verificationData);

      if (
        verificationData.status &&
        verificationData.data.status === "success"
      ) {
        const email = customer.email;
        console.log("CUSTOMER>EMAIL: ", email);

        // Fetch the user
        const user = await prisma.user.findUnique({
          where: { email },
          select: { bookedVisit: true },
        });

        if (!user) {
          console.error("User not found for email:", email);
          return res.status(404).json({ message: "User not found" });
        }

        // Log the user's bookings for debugging
        console.log("User's Bookings:", user.bookedVisit);

        // Find the booking associated with this payment
        const booking = user.bookedVisit.find(
          (visit) => visit.paymentReference === reference
        );
        console.log("Booking from webhook: ", booking);

        if (booking) {
          // Update the booking status to 'paid'
          booking.paymentStatus = "paid";

          // Update the user's bookedVisit array
          await prisma.user.update({
            where: { email },
            data: {
              bookedVisit: user.bookedVisit,
            },
          });

          console.log("Booking updated successfully:", booking);
        } else {
          console.error("No booking found for payment reference:", reference);
          return res.status(404).json({ message: "Booking not found" });
        }
      } else {
        console.error("Payment verification failed:", verificationData);
        return res.status(400).json({ message: "Payment verification failed" });
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.sendStatus(200);
});

// PayPal client setup
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID, // Replace with your PayPal client ID
    process.env.PAYPAL_SECRET // Replace with your PayPal secret
  )
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Email data

// Nodemailer setup
const sendEmail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

// create user
export const createUser = asyncHandler(async (req, res) => {
  console.log("Creating User");
  let { email } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!userExists) {
      const user = await prisma.user.create({ data: req.body });

      // Check for expired bookings (if any)
      await checkAndRemoveExpiredBookings(email);

      res.send({
        message: "User registered successfully",
        user: user,
      });
    } else {
      // Check for expired bookings (if any)
      await checkAndRemoveExpiredBookings(email);

      res.status(201).send({ message: "User already registered" });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// fetch all users
export const fetchAllUsers = asyncHandler(async (req, res) => {
  try {
    // Extract the role from the request parameters
    const { role } = req.params;

    // Extract the user's email or ID from the request (assuming it's sent in the request body or query)
    const { email } = req.query; // or req.body, depending on how you send it

    // Fetch the current user from the database
    const currentUser = await prisma.user.findUnique({
      where: { email }, // or { id } if you're using ID
      select: { role: true }, // Only fetch the role for the check
    });

    // If the user is not found
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current user's role matches the required role
    if (currentUser.role !== role) {
      return res.status(403).json({
        message: `Unauthorized: Only users with the role '${role}' can fetch all users`,
      });
    }

    // Fetch all users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        telephone: true,
        address: true,
        bookedVisit: true,
        favResidenciesID: true,
        ownedResidencies: true, // Include owned residencies if needed
      },
    });

    // If no users are found
    if (!users || users.length === 0) {
      return res.status(200).json({ message: "No users found", users: [] });
    }

    // Return all users
    res.status(200).json({ users });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
});

// fetch a particular user's details

export const fetchUserDetails = asyncHandler(async (req, res) => {
  const { email } = req.params;

  // Validate email
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check for expired bookings (if any)
    await checkAndRemoveExpiredBookings(email);

    // Fetch user details from the database
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user details
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =====================================================================

// STRIPE PAYMENT INTENT
// ===================================
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.body;

  try {
    // Create a PaymentIntent with a return_url
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // Amount in cents (e.g., $10.00)
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      return_url: "http://localhost:5173/payment-success", // Replace with your frontend success URL
    });

    // Return success response
    res.json({ success: true, paymentIntent });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { payment_intent: paymentIntentId } = req.query;

  try {
    // Retrieve the PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Return the PaymentIntent status
    res.json({ success: true, paymentIntent });
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ===============================================================================================

// book a visit
// Function to generate a unique booking number
const generateUniqueBookingNumber = async () => {
  let bookingNumber = nanoid(8); // Generates a short, unique ID (8 characters)

  // Fetch all users with non-empty bookedVisit arrays
  const usersWithBookings = await prisma.user.findMany({
    where: {
      bookedVisit: {
        isEmpty: false, // Ensure the array is not empty
      },
    },
    select: {
      bookedVisit: true, // Select only the bookedVisit field
    },
  });

  // Manually check if the booking number exists in any user's bookedVisit array
  const bookingNumberExists = usersWithBookings.some((user) =>
    user.bookedVisit.some((visit) => visit.bookingNumber === bookingNumber)
  );

  // If the booking number exists, append the current timestamp to make it unique
  if (bookingNumberExists) {
    const timestamp = dayjs().format("YYYYMMDDHHmmss"); // Current time in a compact format
    bookingNumber = `${bookingNumber}_${timestamp}`;
  }

  return bookingNumber;
};

// Book visit
export const bookVisit = asyncHandler(async (req, res) => {
  const {
    email,
    date,
    time,
    visitStatus,
    paymentMethod,
    paymentStatus,
    paymentMethodId,
    paypalOrderId,
    paymentReference,
  } = req.body;
  const id = req.params.id;

  try {
    // Validate date and time
    const bookingDate = dayjs(date, "YYYY-MM-DD", true);
    const bookingTime = dayjs(time, "HH:mm", true);

    if (!bookingDate.isValid()) {
      return res.status(400).json({
        message: "Invalid date format. Expected format: YYYY-MM-DD",
        receivedDate: date,
      });
    }

    if (!bookingTime.isValid()) {
      return res.status(400).json({
        message: "Invalid time format. Expected format: HH:mm",
        receivedTime: time,
      });
    }

    // Check if the booking date is in the future
    if (bookingDate.isBefore(dayjs(), "day")) {
      return res
        .status(400)
        .json({ message: "Booking date must be in the future" });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true, name: true, telephone: true, address: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize bookedVisit as an empty array if it doesn't exist
    user.bookedVisit = user.bookedVisit || [];

    // Check if the user has already booked this property
    if (
      user.bookedVisit.some(
        (visit) => visit.propertyId === id && visit.bookingStatus === "active"
      )
    ) {
      return res
        .status(400)
        .json({ message: "You have already booked to visit this property" });
    }

    // Handle Stripe payment confirmation
    if (paymentMethod === "stripe" && paymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000, // Amount in cents (e.g., $10.00)
          currency: "usd",
          payment_method: paymentMethodId,
          confirmation_method: "manual",
          confirm: true,
        });

        if (paymentIntent.status !== "succeeded") {
          return res
            .status(400)
            .json({ message: "Stripe payment failed. Please try again." });
        }
      } catch (stripeError) {
        console.error("Stripe payment error:", stripeError);
        return res
          .status(400)
          .json({ message: "Stripe payment failed. Please try again." });
      }
    }

    // Handle PayPal payment confirmation
    if (paymentMethod === "paypal" && paypalOrderId) {
      try {
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        request.requestBody({});

        const response = await paypalClient.execute(request);

        if (response.result.status !== "COMPLETED") {
          return res
            .status(400)
            .json({ message: "PayPal payment failed. Please try again." });
        }
      } catch (paypalError) {
        console.error("PayPal payment error:", paypalError);
        return res
          .status(400)
          .json({ message: "PayPal payment failed. Please try again." });
      }
    }

    // Handle Paystack payment confirmation
    if (paymentMethod === "paystack" && paymentReference) {
      try {
        const verificationResponse = await axios.get(
          `${PAYSTACK_BASE_URL}/transaction/verify/${paymentReference}`,
          {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          }
        );

        const verificationData = verificationResponse.data;
        console.log("Verification data from book visit: ", verificationData);

        if (
          verificationData.status !== true ||
          verificationData.data.status !== "success"
        ) {
          return res
            .status(400)
            .json({ message: "Paystack payment failed. Please try again." });
        }
      } catch (paystackError) {
        console.error(
          "Paystack payment error:",
          paystackError.response?.data || paystackError.message
        );
        return res
          .status(400)
          .json({ message: "Paystack payment verification failed." });
      }
    }

    // Generate booking number and update user (existing code)
    const bookingNumber = await generateUniqueBookingNumber();
    await prisma.user.update({
      where: { email },
      data: {
        bookedVisit: {
          push: {
            id: bookingNumber,
            propertyId: id,
            date,
            time,
            visitStatus: visitStatus || "pending",
            bookingStatus: "active",
            paymentMethod,
            paymentStatus:
              paymentMethod === "pay_on_arrival" ? "pending" : "paid",
            paymentReference,
          },
        },
      },
    });

    // Fetch related data (existing code)
    const property = await prisma.residency.findUnique({ where: { id } });
    const owner = await prisma.user.findUnique({
      where: { email: property.userEmail },
    });
    const admins = await prisma.user.findMany({ where: { role: "admin" } });

    // ========== FIXED EMAIL SECTION START ========== //
    const formatDate = (dateString) => dayjs(dateString).format("MMMM D, YYYY");
    const formatTime = (timeString) =>
      dayjs(timeString, "HH:mm").format("h:mm A");

    // Generate HTML table rows for booking details
    const bookingDetailsRows = `
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Property</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${
          property.title
        }</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Date</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${formatDate(
          date
        )}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Time</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${formatTime(
          time
        )}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Booking Number</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${bookingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Payment Method</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${paymentMethod.toUpperCase()}</td>
      </tr>
    `;

    // Prepare email data
    const emailData = {
      userName: user.name,
      propertyTitle: property.title,
      date: formatDate(date),
      time: formatTime(time),
      bookingNumber,
      paymentMethod,
      userPhone: user.telephone,
      userAddress: user.address,
      bookingDetailsRows,
      year: new Date().getFullYear(),
    };

    // Email sending logic
    const sendEmail = async (to, subject, template) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      });

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: template,
      });
    };

    try {
      // User confirmation
      const userTemplate = await getConfirmationEmail(emailData);
      await sendEmail(email, "Visit Booked Successfully", userTemplate);

      // Owner notification
      const ownerTemplate = await getOwnerNotificationEmail(emailData);
      await sendEmail(owner.email, "New Property Visit Booking", ownerTemplate);

      // Admin notifications
      const adminEmails = admins.map((admin) => admin.email);
      const adminTemplates = await Promise.all(
        adminEmails.map(() => getOwnerNotificationEmail(emailData))
      );

      await Promise.all(
        adminEmails.map((email, i) =>
          sendEmail(
            email,
            "New Visit Booking - Admin Notification",
            adminTemplates[i]
          )
        )
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }
    // ========== FIXED EMAIL SECTION END ========== //

    // Existing response remains unchanged
    res.json({
      message: "You have booked to visit the property successfully",
      bookingNumber,
    });
  } catch (error) {
    // Existing error handling remains unchanged
    console.error("Booking error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const updateExpiredBookings = async () => {
  try {
    console.log("Starting expired bookings check...");

    // Fetch all users with non-empty bookedVisit arrays
    const users = await prisma.user.findMany({
      where: {
        bookedVisit: {
          isEmpty: false, // Ensure the array is not empty
        },
      },
      select: {
        id: true,
        bookedVisit: true,
      },
    });

    const currentDate = new Date();
    let updatedCount = 0;

    // Loop through each user
    for (const user of users) {
      // Parse the bookedVisit array (since it's stored as JSON)
      const bookedVisits = user.bookedVisit;

      // Update expired bookings
      const updatedBookings = bookedVisits.map((booking) => {
        const visitDate = new Date(booking.date);

        // Check if the visit date has passed and the booking is still active
        if (visitDate < currentDate && booking.bookingStatus === "active") {
          updatedCount++;
          return {
            ...booking,
            bookingStatus: "expired",
            visitStatus: "expired",
          };
        }

        return booking;
      });

      // Update the user's bookings in the database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          bookedVisit: updatedBookings,
        },
      });
    }

    console.log(`Updated ${updatedCount} expired bookings.`);
  } catch (error) {
    console.error("Error updating expired bookings:", error);
  }
};

export const cancelBooking = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true, name: true, telephone: true, address: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the index of the booking with the matching id, bookingStatus === "active", and visitStatus === "pending"
    const index = user.bookedVisit.findIndex(
      (visit) =>
        visit.propertyId === id &&
        visit.bookingStatus === "active" &&
        visit.visitStatus === "pending"
    );

    if (index === -1) {
      return res
        .status(404)
        .json({ message: "No active and pending booking found to cancel." });
    }

    const booking = user.bookedVisit[index];

    // Update the booking status to "expired" and visitStatus to "cancelled"
    user.bookedVisit[index] = {
      ...booking,
      bookingStatus: "expired",
      visitStatus: "cancelled",
    };

    await prisma.user.update({
      where: { email },
      data: {
        bookedVisit: user.bookedVisit,
      },
    });

    // Fetch property details
    const property = await prisma.residency.findUnique({
      where: { id },
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Fetch the owner's details
    const owner = await prisma.user.findUnique({
      where: { email: property.userEmail },
    });

    // Fetch all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });

    // ========== FIXED EMAIL SECTION START ========== //
    const formatDate = (dateString) => dayjs(dateString).format("MMMM D, YYYY");
    const formatTime = (timeString) =>
      dayjs(timeString, "HH:mm").format("h:mm A");

    // Generate HTML table rows for booking details
    const bookingDetailsRows = `
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Property</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${
              property.title
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Date</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${formatDate(
              booking.date
            )}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Time</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${formatTime(
              booking.time
            )}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Booking Number</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${
              booking.id
            }</td>
          </tr>
        `;

    // Prepare email data
    const emailData = {
      userName: user.name,
      propertyTitle: property.title,
      date: formatDate(booking.date),
      time: formatTime(booking.time),
      bookingNumber: booking.id,
      paymentMethod: booking.paymentMethod,
      userPhone: user.telephone,
      userAddress: user.address,
      bookingDetailsRows,
      year: new Date().getFullYear(),
    };

    // Email sending logic
    const sendEmail = async (to, subject, template) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      });

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: template,
      });
    };

    try {
      // User confirmation
      const userTemplate = await getVisitCancellationNotification(emailData);
      await sendEmail(email, "Visit Cancelled Successfully", userTemplate);

      // Owner notification
      const ownerTemplate = await getOwnerVisitCancellation(emailData);
      await sendEmail(owner.email, "Visit Cancelled", ownerTemplate);

      // Admin notifications
      const adminEmails = admins.map((admin) => admin.email);
      const adminTemplates = await Promise.all(
        adminEmails.map(() => getOwnerVisitCancellation(emailData))
      );

      await Promise.all(
        adminEmails.map((email, i) =>
          sendEmail(
            email,
            "Visit Cancelled - Admin Notification",
            adminTemplates[i]
          )
        )
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    // ========== FIXED EMAIL SECTION END ========== //

    res.send("Booking cancelled successfully");
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// fetch all user bookings
export const fetchUserBookings = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Check for expired bookings (if any)
    await checkAndRemoveExpiredBookings(email);

    const bookedVisits = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true },
    });

    res.status(200).send("booked visits: ", bookedVisits);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// fetch all bookings
export const fetchAllBookings = asyncHandler(async (req, res) => {
  try {
    // Fetch all users with their bookedVisits and user details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        bookedVisit: true, // Fetch the bookedVisit field
      },
    });

    // Combine all bookedVisits into a single array, including user details
    const allBookings = users.flatMap((user) =>
      user.bookedVisit.map((booking) => ({
        ...booking,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telephone: user.telephone,
        },
      }))
    );

    // If no bookings are found
    if (allBookings.length === 0) {
      return res
        .status(200)
        .json({ message: "No bookings found", bookings: [] });
    }

    // Fetch property details for each booking
    const bookingsWithProperties = await Promise.all(
      allBookings.map(async (booking) => {
        // Ensure booking is a valid object and has a propertyId
        if (!booking || typeof booking !== "object" || !booking.propertyId) {
          console.warn("Invalid booking:", booking);
          return {
            ...booking,
            property: null, // Indicate that the property is missing
          };
        }

        // Fetch the property associated with the booking
        const property = await prisma.residency.findUnique({
          where: {
            id: booking.propertyId, // Assuming booking has a propertyId field
          },
        });

        // Combine booking details with property details and user details
        return {
          ...booking,
          property: property || null, // Handle case where property is not found
        };
      })
    );

    // Return all bookings with their respective properties and user details
    res.status(200).json({ bookings: bookingsWithProperties });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      message: "An error occurred while fetching bookings",
      error: error.message,
    });
  }
});

// ================================================
// update favourites/ add and remove

export const userFavourites = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { resId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { favResidenciesID: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favourites = user.favResidenciesID || [];

    if (favourites.includes(resId)) {
      // Remove the resId from favourites
      const updatedFavourites = favourites.filter((fav) => fav !== resId);

      await prisma.user.update({
        where: { email },
        data: { favResidenciesID: { set: updatedFavourites } },
      });

      return res.status(200).json({
        message: "You have removed the property from your favourite list",
        favourites: updatedFavourites, // Return the updated favourites array
      });
    } else {
      // Add the resId to favourites
      const updatedFavourites = [...favourites, resId];

      await prisma.user.update({
        where: { email },
        data: { favResidenciesID: { set: updatedFavourites } },
      });

      return res.status(200).json({
        message: "Property added to favourites",
        favourites: updatedFavourites, // Return the updated favourites array
      });
    }
  } catch (error) {
    console.error("Error in userFavourites:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================
// fetch all favourites
export const fetchUserFavourites = asyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    const userFavourites = await prisma.user.findUnique({
      where: { email },
      select: { favResidenciesID: true },
    });
    res.status(200).send(userFavourites);
  } catch (error) {
    throw new Error(error.message);
  }
});

// =========================================================
// edit user

export const editUserDetails = asyncHandler(async (req, res) => {
  const { email } = req.params; // Extract email from request parameters
  const { name, address, telephone, role, status } = req.body; // Extract updated fields from request body

  // Validate email
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Validate updated fields
  if (!name && !telephone && !role && !status) {
    return res.status(400).json({ message: "No fields to update" });
  }

  try {
    // Fetch the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user details
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        name: name || user.name, // Use existing value if no update provided
        address: address || user.address,
        telephone: telephone || user.telephone, // Use existing value if no update provided
        role: role || user.role, // Use existing value if no update provided
        status: status || user.status, // Use existing value if no update provided
      },
    });

    // Return updated user details
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ==============================================================================

// subscribe
export const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res
      .status(400)
      .json({ error: "Please enter a valid email address." });
  }

  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { email },
    });
    if (existingSubscription) {
      return res
        .status(400)
        .json({ error: "This email is already subscribed." });
    }

    await prisma.subscription.create({ data: { email } });

    // Send HTML email to user
    const userEmailData = {
      email,
      year: new Date().getFullYear(),
    };
    const userEmailHtml = await getSubscriptionEmail(userEmailData);
    await sendEmail(email, "Subscription Successful", userEmailHtml);

    // Send admin notifications
    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    const adminEmailData = {
      subscriberEmail: email,
      year: new Date().getFullYear(),
    };
    const adminEmailHtml = await getAdminSubscriptionNotification(
      adminEmailData
    );

    await Promise.all(
      adminEmails.map(async (adminEmail) => {
        await sendEmail(
          adminEmail,
          "New Newsletter Subscriber",
          adminEmailHtml
        );
      })
    );

    res.status(200).json({ message: "Subscription successful!" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res
      .status(500)
      .json({ error: "An error occurred. Please try again later." });
  }
});

// unsubscribe
export const unSubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { email },
    });
    if (!existingSubscription) {
      return res
        .status(404)
        .json({ error: "Email not found in subscriptions." });
    }

    await prisma.subscription.delete({ where: { email } });

    // Send HTML email to user
    const userEmailData = {
      email,
      year: new Date().getFullYear(),
      resubscribeLink: "https://yourdomain.com/subscribe",
    };
    const userEmailHtml = await getUnsubscriptionEmail(userEmailData);
    await sendEmail(email, "Unsubscription Successful", userEmailHtml);

    // Send admin notifications
    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    const adminEmails = admins.map((admin) => admin.email);

    const adminEmailData = {
      unsubscribedEmail: email,
      year: new Date().getFullYear(),
    };
    const adminEmailHtml = await getAdminSubscriptionNotification(
      adminEmailData
    );

    await Promise.all(
      adminEmails.map(async (adminEmail) => {
        await sendEmail(adminEmail, "User Unsubscribed", adminEmailHtml);
      })
    );

    res.status(200).json({ message: "Unsubscribed successfully!" });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "An error occurred while unsubscribing." });
  }
});

// fetch all subscriptions

export const fetchSingleSubscriptions = asyncHandler(async (req, res) => {
  const { email } = req.query; // Use req.query for GET requests

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { email },
    });

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    res.status(200).json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the subscription." });
  }
});

// Fetch all subscriptions
export const fetchAllSubscriptions = asyncHandler(async (req, res) => {
  try {
    // Fetch all subscriptions from the database
    const subscriptions = await prisma.subscription.findMany();

    // Return the list of subscriptions
    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching subscriptions." });
  }
});

// Update visitStatus for a specific booking
export const updateVisitStatusFromAdmin = asyncHandler(async (req, res) => {
  const { userEmail, bookingId } = req.params;
  const { visitStatus } = req.body;

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.error("User not found:", userEmail);
      return res.status(404).json({ error: "User not found" });
    }

    // Find the booking in the bookedVisit array
    const bookedVisit = user.bookedVisit;
    const bookingIndex = bookedVisit.findIndex(
      (booking) => booking.id === bookingId
    );

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update the visitStatus
    bookedVisit[bookingIndex].visitStatus = visitStatus;

    // Save the updated bookedVisit array
    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: { bookedVisit },
    });

    console.log("Booking status updated successfully:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
});
