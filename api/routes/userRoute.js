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
  subscribe,
  unSubscribe,
  updateExpiredBookings,
  userFavourites,
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
router.post("/update-expired-bookings", updateExpiredBookings)


export default router;
