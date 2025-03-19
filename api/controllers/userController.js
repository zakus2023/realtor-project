import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import dayjs from "dayjs";
import checkAndRemoveExpiredBookings from "../config/expiredBookings.js";
import nodemailer from "nodemailer";
import { nanoid } from "nanoid"; // For generating unique IDs
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk"; // Import PayPal SDK


// PayPal client setup
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    "ASVLCVJ4a62t_sauBvKf93ifWTkn-4uooOK6Sdnx57USnTnkMADS3mja6sa1zdd8GfuoLUvPQR0aiowv", // Replace with your PayPal client ID
    "EHaECb1kuoJRbrjjbBEbyq5OCpaSODl5n7Jy8UQVj_Uz4KCKvvvO97pJSSNv4FTL2mkjN99sx7B4VO8S" // Replace with your PayPal secret
  )
);

const stripe = new Stripe(
  "sk_test_51N5quMDHDtaIvDO2D6yFfk02OWESvcXd8jKNJ0V5yQ6BbvuQaN2fEg5rH1S6ywh0Aunqq3yuBZpqtkwDM6y2JsAg00rrnsu5xi"
);

// Nodemailer setup
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "idbsch2012@gmail.com",
      pass: "bmdu vqxi dgqj dqoi",
    },
  });

  const mailOptions = {
    from: "idbsch2012@gmail.com",
    to,
    subject,
    text,
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
  console.log("Email: ", email);

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

export const bookVisit = asyncHandler(async (req, res) => {
  const {
    email,
    date,
    time,
    visitStatus,
    paymentMethod,
    paymentStatus,
    paymentMethodId,
    paypalOrderId, // Add PayPal order ID to the request body
  } = req.body;
  const id = req.params.id;

  try {
    // Validate date and time
    const bookingDate = dayjs(date, "YYYY-MM-DD", true); // Strict parsing
    const bookingTime = dayjs(time, "HH:mm", true); // Strict parsing

    if (!bookingDate.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Expected format: YYYY-MM-DD" });
    }

    if (!bookingTime.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid time format. Expected format: HH:mm" });
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
            .json({ message: "Payment failed. Please try again." });
        }
      } catch (stripeError) {
        console.error("Stripe payment error:", stripeError);
        return res
          .status(400)
          .json({ message: "Payment failed. Please try again." });
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

    // Generate a unique booking number
    const bookingNumber = await generateUniqueBookingNumber();

    // Add the new booking
    await prisma.user.update({
      where: { email },
      data: {
        bookedVisit: {
          push: {
            id: bookingNumber, // Use the booking number as the ID
            propertyId: id,
            date,
            time,
            visitStatus: visitStatus || "pending",
            bookingStatus: "active",
            paymentMethod, // Include payment method
            paymentStatus:
              paymentMethod === "pay_on_arrival" ? "pending" : "paid", // Update payment status
          },
        },
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

    // Email content for user and admin
    const userAdminEmailSubject = "Visit Booked Successfully";
    const userAdminEmailText = `
      Visit Details:
      - Property: ${property.title}
      - Date: ${date}
      - Time: ${time}
      - User: ${user.name}
      - Address: ${user.address}
      - Telephone: ${user.telephone}
      - Booking Number: ${bookingNumber}
      - Payment Method: ${paymentMethod}
      - Payment Status: ${paymentStatus}
    `;

    // Email content for owner
    const ownerEmailSubject = "New Visit Booked for Your Property";
    const ownerEmailText = `
      Visit Details:
      - Property: ${property.title}
      - Date: ${date}
      - Time: ${time}
      - Booking Number: ${bookingNumber}
      - Payment Method: ${paymentMethod}
      - Payment Status: ${paymentStatus}
    `;

    // Send email to the user
    try {
      await sendEmail(email, userAdminEmailSubject, userAdminEmailText);
    } catch (emailError) {
      console.error("Failed to send email to user:", emailError);
    }

    // Send email to all admins
    const adminEmails = admins.map((admin) => admin.email);
    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(adminEmail, userAdminEmailSubject, userAdminEmailText)
    );

    // Send email to the owner
    try {
      await sendEmail(owner.email, ownerEmailSubject, ownerEmailText);
    } catch (emailError) {
      console.error("Failed to send email to owner:", emailError);
    }

    try {
      await Promise.all(adminEmailPromises);
    } catch (emailError) {
      console.error("Failed to send email to admins:", emailError);
    }

    res.json({
      message: "You have booked to visit the property successfully",
      bookingNumber,
    });
  } catch (error) {
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

    // Email content for user and admin
    const userAdminEmailSubject = "Booking Cancelled";
    const userAdminEmailText = `
      Booking Cancelled:
      - Property: ${property.title}
      - Date: ${booking.date}
      - Time: ${booking.time}
      - User: ${user.name}
      - Address: ${user.address}
      - Telephone: ${user.telephone}
    `;

    // Email content for owner
    const ownerEmailSubject = "Visit Cancelled for Your Property";
    const ownerEmailText = `
      Booking Cancelled:
      - Property: ${property.title}
      - Date: ${booking.date}
      - Time: ${booking.time}
    `;

    // Send email to the user
    await sendEmail(email, userAdminEmailSubject, userAdminEmailText);

    // Send email to all admins
    const adminEmails = admins.map((admin) => admin.email);
    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(adminEmail, userAdminEmailSubject, userAdminEmailText)
    );

    // Send email to the owner
    await sendEmail(owner.email, ownerEmailSubject, ownerEmailText);

    await Promise.all(adminEmailPromises);

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
// cancel booking

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

  console.log("Email: ", email);
  console.log("Updated Data: ", { name, address, telephone, role, status });

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

export const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validate email
  if (!email || !email.includes("@")) {
    return res
      .status(400)
      .json({ error: "Please enter a valid email address." });
  }

  try {
    // Check if email is already subscribed
    const existingSubscription = await prisma.subscription.findUnique({
      where: { email },
    });

    if (existingSubscription) {
      return res
        .status(400)
        .json({ error: "This email is already subscribed." });
    }

    // Add email to subscriptions
    await prisma.subscription.create({
      data: { email },
    });

    console.log("New subscription:", email);

    // Send email to the user
    await sendEmail(
      email,
      "Subscription Successful",
      "Thank you for subscribing to our newsletter!"
    );

    // Fetch all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });

    // Send email to all admins
    const adminEmails = admins.map((admin) => admin.email);
    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(
        adminEmail,
        "New Subscriber",
        `A new user with email ${email} has subscribed to the newsletter.`
      )
    );

    await Promise.all(adminEmailPromises);

    // Send success response
    res.status(200).json({ message: "Subscription successful!" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res
      .status(500)
      .json({ error: "An error occurred. Please try again later." });
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

export const unSubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    // Check if the email exists in the subscriptions
    const existingSubscription = await prisma.subscription.findUnique({
      where: { email },
    });

    if (!existingSubscription) {
      return res
        .status(404)
        .json({ error: "Email not found in subscriptions." });
    }

    // Delete the subscription
    await prisma.subscription.delete({
      where: { email },
    });

    // Send email to the user
    await sendEmail(
      email,
      "Unsubscription Successful",
      "You have successfully unsubscribed from our newsletter."
    );

    // Fetch all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
    });

    // Send email to all admins
    const adminEmails = admins.map((admin) => admin.email);
    const adminEmailPromises = adminEmails.map((adminEmail) =>
      sendEmail(
        adminEmail,
        "User Unsubscribed",
        `The user with email ${email} has unsubscribed from the newsletter.`
      )
    );

    await Promise.all(adminEmailPromises);

    res.status(200).json({ message: "Unsubscribed successfully!" });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "An error occurred while unsubscribing." });
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
