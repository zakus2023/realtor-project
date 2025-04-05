// Import dayjs library for date manipulation
import dayjs from "dayjs";
// Import User model to interact with user data
import User from "../models/user.js";
// Import UTC plugin to handle UTC dates
import utc from "dayjs/plugin/utc.js";
// Import custom parse format plugin to parse non-standard date formats
import customParseFormat from "dayjs/plugin/customParseFormat.js";

// Extend dayjs with UTC and custom parse format capabilities
dayjs.extend(utc);
dayjs.extend(customParseFormat);

/**
 * Checks and updates booking statuses without removing any bookings
 * @param {string} email - User's email address to identify the user
 * @returns {Promise<Array>} - Returns array of all bookings with updated statuses
 * @throws {Error} - Throws error if user not found or other issues occur
 */
const checkAndRemoveExpiredBookings = async (email) => {
  try {
    // Find user by email and only select the bookedVisit field
    // Using lean() for faster query as we don't need mongoose document
    const user = await User.findOne({ email })
      .select("bookedVisit")
      .lean();

    // If user doesn't exist, throw error
    if (!user) {
      throw new Error("User not found");
    }

    // Get current date and time
    const now = new Date();
    // Convert current time to UTC using dayjs
    const currentUTC = dayjs.utc(now);

    // Create a copy of the bookings array to avoid modifying the original
    // Using optional chaining (user.bookedVisit || []) as fallback if bookedVisit doesn't exist
    const updatedBookings = (user.bookedVisit || []).map(booking => {
      // Parse booking date and time from the booking object
      // Assumes date is in DD/MM/YYYY format and time is in HH:mm format
      const bookingDate = dayjs.utc(
        `${booking.date} ${booking.time}`,
        "DD/MM/YYYY HH:mm"
      );

      // Check if booking is expired (booking time is before current time)
      const isExpired = bookingDate.isBefore(currentUTC);
      // Check if visit is marked as completed
      const isCompleted = booking.visitStatus === "completed";
      // Check if booking is marked as cancelled
      const isCancelled = booking.bookingStatus === "cancelled";

      // Create a copy of the booking to potentially modify
      const updatedBooking = { ...booking };

      // Update statuses based on conditions (only if not already set)
      if (isExpired && !isCompleted && !isCancelled) {
        updatedBooking.visitStatus = "expired";
        updatedBooking.bookingStatus = "expired";
      }
      // Note: For cancelled and completed, we assume they're already set
      // so we don't need to modify them

      return updatedBooking;
    });

    // Check if any bookings were actually modified
    const hasChanges = updatedBookings.some((booking, index) => {
      return JSON.stringify(booking) !== JSON.stringify(user.bookedVisit[index]);
    });

    // Only update database if there are changes
    if (hasChanges) {
      // Update user's entire bookedVisit array with updated statuses
      await User.updateOne(
        { email },
        { $set: { bookedVisit: updatedBookings } }
      );
    }

    // Return the array of all bookings with updated statuses
    return updatedBookings;
  } catch (error) {
    // Log any errors that occur during the process
    console.error("Booking status update error:", error);
    // Re-throw the error to be handled by the calling function
    throw error;
  }
};

export default checkAndRemoveExpiredBookings;