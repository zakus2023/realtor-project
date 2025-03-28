import express from "express";
import { attachUser, requireAuth } from "../middleware/authMiddleware.js"; // Added requireAuth import
import {
  bookVisit,
  cancelBooking,
  createUser,
  editUserDetails,
  fetchAllBookings,
  fetchAllSubscriptions,
  fetchAllUsers,
  fetchSingleSubscriptions,
  fetchUserBookings,
  fetchUserDetails,
  fetchUserFavourites,
  getPaymentStatus,
  paystackWebhook,
  payWithMoMo,
  subscribe,
  unSubscribe,
  updateVisitStatusFromAdmin,
  userFavourites,
  verifyMoMoPayment,
  createPaymentIntent
} from "../controllers/userController.js";

const router = express.Router();

// Public routes
router.post("/register", createUser);
router.post("/stripe/create-payment-intent", createPaymentIntent);
router.get("/payment-status", getPaymentStatus);
router.post("/paystack/momo", payWithMoMo);
router.get("/paystack/verify", verifyMoMoPayment);
router.post("/paystack/webhook", paystackWebhook);

// Authenticated routes
router.post("/bookVisit/:id", requireAuth, attachUser, bookVisit); // Added requireAuth
router.get("/userDetails/:email", requireAuth, attachUser, fetchUserDetails);
router.put("/editUserDetails/:email", requireAuth, attachUser, editUserDetails);
router.get("/fetchAllUsers/:role", requireAuth, attachUser, fetchAllUsers);
router.post("/bookedVisits", requireAuth, attachUser, fetchUserBookings);
router.post("/cancelBooking/:id", requireAuth, attachUser, cancelBooking);
router.post("/addFavourites/:resId", requireAuth, attachUser, userFavourites);
router.post("/fetchUserfavourites", requireAuth, attachUser, fetchUserFavourites);
router.get("/fetchAllBookings", requireAuth, attachUser, fetchAllBookings);
router.post("/subscribe", requireAuth, attachUser, subscribe);
router.get("/getSubscription", requireAuth, attachUser, fetchSingleSubscriptions);
router.delete("/unsubscribe", requireAuth, attachUser, unSubscribe);
router.get("/fetchAllSubscriptions", requireAuth, attachUser, fetchAllSubscriptions);
router.put("/:userEmail/bookings/:bookingId", requireAuth, attachUser, updateVisitStatusFromAdmin);

export default router;