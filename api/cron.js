import cron from "node-cron";
import dayjs from "dayjs";
import { prisma } from "./config/prismaConfig.js";

// Schedule a cron job to run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("Cron job started at:", new Date().toISOString());

    // Get the current date and time
    const now = new Date();
    const currentDate = dayjs(now).format("YYYY-MM-DD");
    const currentTime = dayjs(now).format("HH:mm");

    console.log("Current date:", currentDate);
    console.log("Current time:", currentTime);

    // Fetch all users with their bookedVisit data
    const users = await prisma.user.findMany({
      select: { email: true, bookedVisit: true },
    });

    console.log(`Found ${users.length} users to process.`);

    // Loop through each user
    for (const user of users) {
      console.log(`Processing user: ${user.email}`);

      // Filter out expired or completed bookings
      const updatedBookings = user.bookedVisit.filter((visit) => {
        const bookingDateTime = dayjs(`${visit.date} ${visit.time}`);
        const currentDateTime = dayjs(`${currentDate} ${currentTime}`);

        // Keep the booking if:
        // 1. The booking datetime is after the current datetime (not expired)
        // 2. The booking status is not "completed"
        return (
          bookingDateTime.isAfter(currentDateTime) &&
          visit.visitStatus !== "completed"
        );
      });

      console.log("Updated bookings for user:", user.email, JSON.stringify(updatedBookings, null, 2));

      // Update the user's bookedVisit array in the database
      const updatedUser = await prisma.user.update({
        where: { email: user.email },
        data: { bookedVisit: updatedBookings },
      });

      console.log("Updated user:", updatedUser);
    }

    console.log("Cron job completed successfully.");
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

// Schedule a cron job to run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("Cron job started at:", new Date().toISOString());

    // Get the current date and time
    const now = new Date();
    const currentDate = dayjs(now).format("YYYY-MM-DD");
    const currentTime = dayjs(now).format("HH:mm");

    console.log("Current date:", currentDate);
    console.log("Current time:", currentTime);

    // Fetch all users with their bookedVisit data
    const users = await prisma.user.findMany({
      select: { email: true, bookedVisit: true },
    });

    console.log(`Found ${users.length} users to process.`);

    // Loop through each user
    for (const user of users) {
      console.log(`Processing user: ${user.email}`);

      // Filter out expired or completed bookings
      const updatedBookings = user.bookedVisit.filter((visit) => {
        const bookingDateTime = dayjs(`${visit.date} ${visit.time}`);
        const currentDateTime = dayjs(`${currentDate} ${currentTime}`);

        // Keep the booking if:
        // 1. The booking datetime is after the current datetime (not expired)
        // 2. The booking status is not "completed"
        return (
          bookingDateTime.isAfter(currentDateTime) &&
          visit.visitStatus !== "completed"
        );
      });

      console.log("Updated bookings for user:", user.email, JSON.stringify(updatedBookings, null, 2));

      // Update the user's bookedVisit array in the database
      const updatedUser = await prisma.user.update({
        where: { email: user.email },
        data: { bookedVisit: updatedBookings },
      });

      console.log("Updated user:", updatedUser);
    }

    console.log("Cron job completed successfully.");
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

// Export the cron job for manual testing (optional)
export const runCronJob = async () => {
  try {
    console.log("Manually running cron job at:", new Date().toISOString());

    const now = new Date();
    const currentDate = dayjs(now).format("YYYY-MM-DD");
    const currentTime = dayjs(now).format("HH:mm");

    console.log("Current date:", currentDate);
    console.log("Current time:", currentTime);

    const users = await prisma.user.findMany({
      select: { email: true, bookedVisit: true },
    });

    console.log(`Found ${users.length} users to process.`);

    for (const user of users) {
      console.log(`Processing user: ${user.email}`);
      const updatedBookings = user.bookedVisit.filter((visit) => {
        const bookingDateTime = dayjs(`${visit.date} ${visit.time}`);
        const currentDateTime = dayjs(`${currentDate} ${currentTime}`);
        return (
          bookingDateTime.isAfter(currentDateTime) &&
          visit.visitStatus !== "completed"
        );
      });

      console.log("Updated bookings for user:", user.email, JSON.stringify(updatedBookings, null, 2));

      const updatedUser = await prisma.user.update({
        where: { email: user.email },
        data: { bookedVisit: updatedBookings },
      });

      console.log("Updated user:", updatedUser);
    }

    console.log("Cron job completed successfully.");
  } catch (error) {
    console.error("Error in cron job:", error);
  }
};

// Export the cron job for use in other files (optional)
export default cron;