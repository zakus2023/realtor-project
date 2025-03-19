import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs"; // Import dayjs for date manipulation
import cron from 'node-cron'

// Import routes
import userRoute from "./routes/userRoute.js";
import residenceRouter from "./routes/residenceRoute.js";
import { updateExpiredBookings } from "./controllers/userController.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();
const prisma = new PrismaClient();

// Schedule the function to run every hour
cron.schedule("0 * * * *", () => {
  console.log("Running expired bookings check...");
  updateExpiredBookings();
});

// Optionally, run it immediately when the server starts
updateExpiredBookings();

// Increase request body size limit
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "idbsch2012@gmail.com", // Your Gmail address from .env
    pass: "bmdu vqxi dgqj dqoi", // Your Gmail app password from .env
  },
});

// Email endpoint
app.post("/api/send-email", (req, res) => {
  const { to_email, from_name, from_email, subject, message } = req.body;

  const mailOptions = {
    from: `"${from_name}" <${from_email}>`, // Sender address
    to: to_email, // Recipient address
    replyTo: `${from_email}`,
    subject: subject, // Email subject
    text: message, // Plain text body
    html: `<p><strong>From:</strong> ${from_name} (${from_email})</p><p>${message}</p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, message: "Failed to send email" });
    } else {
      console.log("Email sent:", info.response);
      res.status(200).json({ success: true, message: "Email sent successfully" });
    }
  });
});


// API Routes
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter);


// Start server
app.listen(PORT, () => {
  console.log("Server is listening on port " + PORT);
});