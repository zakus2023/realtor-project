import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cron from 'node-cron'
import { PrismaClient } from '@prisma/client';

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

// Add CORS error handling
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.use(bodyParser.json());

// Initialize Prisma Client
const prisma = new PrismaClient();

// Add index creation here
async function createIndexes() {
  try {
    await prisma.$runCommandRaw({
      createIndexes: 'users', // Match your collection name
      indexes: [{
        key: { email: 1 }, // Example: index on email field
        name: 'email_index'
      }]
    });
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Run index creation before starting server
createIndexes();


// API Routes
app.get("/healthz", (req, res) => res.sendStatus(200)); // for render health check
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter);


// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is listening on port " + PORT);
});