import express from "express";
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
  createPaymentIntent,
  sendContactEmail
} from "../controllers/userController.js";

const router = express.Router();

// ================ Public Routes ================
router.post("/register", createUser);
router.post("/stripe/create-payment-intent", createPaymentIntent);
router.get("/payment-status", getPaymentStatus);
router.post("/paystack/momo", payWithMoMo);
router.get("/paystack/verify", verifyMoMoPayment);
router.post("/paystack/webhook", paystackWebhook);
router.post("/send-email", sendContactEmail);

// ================ Authenticated Routes ================
router.post("/bookVisit/:id", bookVisit);
router.get("/userDetails/:email", fetchUserDetails);
router.put("/editUserDetails/:email", editUserDetails);
router.get("/fetchAllUsers/:role", fetchAllUsers);
router.post("/bookedVisits", fetchUserBookings);
router.post("/cancelBooking/:id", cancelBooking);
router.post("/addFavourites/:resId", userFavourites);
router.post("/fetchUserfavourites", fetchUserFavourites);
router.get("/fetchAllBookings", fetchAllBookings);
router.post("/subscribe", subscribe);
router.get("/getSubscription", fetchSingleSubscriptions);
router.delete("/unsubscribe", unSubscribe);
router.get("/fetchAllSubscriptions", fetchAllSubscriptions);
router.put("/:userEmail/bookings/:bookingId", updateVisitStatusFromAdmin);

export default router;