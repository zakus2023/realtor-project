import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

// create user
export const createUser = asyncHandler(async (req, res) => {
  console.log("Creating User");
  let { email } = req.body;
  const userExists = await prisma.user.findUnique({ where: { email: email } });

  if (!userExists) {
    const user = await prisma.user.create({ data: req.body });
    res.send({
      message: "User registered successfully",
      user: user,
    });
  } else res.send(201, { message: "User already registered" });
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
// book a visit

export const bookVisit = asyncHandler(async (req, res) => {
  const { email, date } = req.body;
  const id = req.params.id;

  try {
    // Find user and check for existing bookings
    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.bookedVisit.some((visit) => visit.id === id)) {
      return res
        .status(400)
        .json({ message: "You have already booked to visit this property" });
    }

    // Update bookedVisit array
    await prisma.user.update({
      where: { email },
      data: {
        bookedVisit: {
          set: [...(user.bookedVisit || []), { id, date }],
        },
      },
    });

    res.json({ message: "You have booked to visit the property successfully" });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =======================================================

// fetch all bookings
export const fetchUserBookings = asyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    const bookedVisits = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true },
    });
    res.status(200).send(bookedVisits);
  } catch (error) {
    throw new Error(error.message);
  }
});

// ============================================================
// cancel booking

export const cancelBooking = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { bookedVisit: true },
    });
    const index = user.bookedVisit.findIndex((visit) => visit.id === id);
    if (index === -1) {
      res.status(404).json({ message: "Booking not found" });
    } else {
      user.bookedVisit.splice(index, 1);
      await prisma.user.update({
        where: { email },
        data: {
          bookedVisit: user.bookedVisit,
        },
      });
      res.send("Booking cancelled successfully");
    }
  } catch (error) {
    throw new Error(error.message);
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
