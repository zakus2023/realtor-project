import dayjs from "dayjs";
import { prisma } from "../config/prismaConfig.js";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

// Extend dayjs with UTC and custom parse format plugins
dayjs.extend(utc);
dayjs.extend(customParseFormat);

const checkAndRemoveExpiredBookings = async (email) => {
  try {
    // Find the user and their bookings
    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisit: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the current date and time in UTC
    const now = new Date();
    const currentDate = dayjs.utc(now).format("YYYY-MM-DD");
    const currentTime = dayjs.utc(now).format("HH:mm");

    // Filter out expired or completed bookings
    const updatedBookings = user.bookedVisit.filter((visit) => {
      // Parse the booking date and time using the correct format (DD/MM/YYYY)
      const bookingDateTime = dayjs.utc(`${visit.date} ${visit.time}`, "DD/MM/YYYY HH:mm");
      const currentDateTime = dayjs.utc(`${currentDate} ${currentTime}`, "YYYY-MM-DD HH:mm");

      //console.log("Booking Date Time (UTC):", bookingDateTime.format(), "Current Date Time (UTC):", currentDateTime.format());

      const isExpired = bookingDateTime.isBefore(currentDateTime);
      const isCompleted = visit.visitStatus === "completed";


      // Keep the booking if it is not expired and not completed
      return !isExpired && !isCompleted;
    });

    // Update the user's bookings if there are any changes
    if (updatedBookings.length !== user.bookedVisit.length) {
      await prisma.user.update({
        where: { email },
        data: {
          bookedVisit: updatedBookings,
        },
      });
    }

    return updatedBookings;
  } catch (error) {
    console.error("Error checking expired bookings:", error);
    throw error;
  }
};

export default checkAndRemoveExpiredBookings