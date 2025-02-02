import express from "express";
import {
  bookVisit,
  cancelBooking,
  createUser,
  fetchUserBookings,
  fetchUserFavourites,
  userFavourites,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", createUser);
router.post("/bookVisit/:id", bookVisit);
router.post("/bookedVisits", fetchUserBookings);
router.post("/cancelBooking/:id", cancelBooking);
router.post("/addFavourites/:resId", userFavourites);
router.post("/fetchUserfavourites", fetchUserFavourites);
//router.post("/removefavourite/:resId", removeFavourite);

export default router;
