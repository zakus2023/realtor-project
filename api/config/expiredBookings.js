import dayjs from "dayjs";
import User from "../models/user.js";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const checkAndRemoveExpiredBookings = async (email) => {
  try {
    const user = await User.findOne({ email })
      .select("bookedVisit")
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const currentUTC = dayjs.utc(now);

    // Add fallback for bookedVisit array
    const activeBookings = (user.bookedVisit || []).filter(booking => {
      const bookingDate = dayjs.utc(
        `${booking.date} ${booking.time}`,
        "DD/MM/YYYY HH:mm"
      );

      const isExpired = bookingDate.isBefore(currentUTC);
      const isCompleted = booking.visitStatus === "completed";

      return !isExpired && !isCompleted;
    });

    if (activeBookings.length !== (user.bookedVisit || []).length) {
      await User.updateOne(
        { email },
        { $set: { bookedVisit: activeBookings } }
      );
    }

    return activeBookings;
  } catch (error) {
    console.error("Booking cleanup error:", error);
    throw error;
  }
};

export default checkAndRemoveExpiredBookings;