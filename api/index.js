import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cron from 'node-cron'

// Import routes
import userRoute from "./routes/userRoute.js";
import residenceRouter from "./routes/residenceRoute.js";
import { updateExpiredBookings } from "./controllers/userController.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

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
// Allow specific origins and credentials
app.use(
  cors({
    origin: [
      "https://aethersoft-frontend.onrender.com", // Production
      "http://localhost:5173"                     // Local dev (Vite default)
    ],
    credentials: true, // Required for cookies/auth headers
    methods: ["GET", "POST", "PUT", "DELETE"] // Explicitly allowed methods
  })
);
app.use(bodyParser.json());


// API Routes
app.get("/health", (req, res) => res.sendStatus(200)); // for render health check
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter);


// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is listening on port " + PORT);
});