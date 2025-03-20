import express from "express";
import {
  bookVisit,
  cancelBooking,
  createPaymentIntent,
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
} from "../controllers/userController.js";
import jwtCheck from "../config/auth0Config.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/bookVisit/:id", jwtCheck, bookVisit);
router.get("/userDetails/:email", jwtCheck, fetchUserDetails);
router.put("/editUserDetails/:email", jwtCheck, editUserDetails);
router.get("/fetchAllUsers/:role", jwtCheck, fetchAllUsers);
router.post("/bookedVisits", jwtCheck, fetchUserBookings);
router.post("/cancelBooking/:id", jwtCheck, cancelBooking);
router.post("/addFavourites/:resId", jwtCheck, userFavourites);
router.post("/fetchUserfavourites", jwtCheck, fetchUserFavourites);
router.get("/fetchAllBookings", jwtCheck, fetchAllBookings);
router.post("/subscribe", jwtCheck, subscribe);
router.get("/getSubscription", jwtCheck, fetchSingleSubscriptions)
router.delete("/unsubscribe", jwtCheck, unSubscribe)
router.get("/fetchAllSubscriptions", jwtCheck, fetchAllSubscriptions)
router.put("/:userEmail/bookings/:bookingId", jwtCheck, updateVisitStatusFromAdmin)
router.post("/stripe/create-payment-intent", createPaymentIntent)
router.get("/payment-status", getPaymentStatus);
//router.post("/mtn-mobile-money/initiate-payment", handleMomoPayment)
//router.post("/initiate", initiatePaystackPaymentController);
router.post("/paystack/momo", payWithMoMo);
router.get("/paystack/verify", verifyMoMoPayment);
router.post("/paystack/webhook", paystackWebhook);


export default router;
