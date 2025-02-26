import express from "express";
import {
  bookVisit,
  cancelBooking,
  createUser,
  fetchUserBookings,
  fetchUserDetails,
  fetchUserFavourites,
  userFavourites,
} from "../controllers/userController.js";
import jwtCheck from "../config/auth0Config.js";

const router = express.Router();

router.post("/register", createUser);

router.post("/bookVisit/:id", jwtCheck, bookVisit);
router.get("/userDetails/:email", jwtCheck, fetchUserDetails);
router.post("/bookedVisits", jwtCheck, fetchUserBookings);
router.post("/cancelBooking/:id", jwtCheck, cancelBooking);
router.post("/addFavourites/:resId", jwtCheck, userFavourites);
router.post("/fetchUserfavourites", jwtCheck, fetchUserFavourites);

export default router;
