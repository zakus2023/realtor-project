import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import cron from 'node-cron';
import mongoose from 'mongoose';
import { ClerkExpressRequireAuth, createClerkClient } from '@clerk/clerk-sdk-node';

// Routes
import userRoute from './routes/userRoute.js';
import residenceRouter from "./routes/residenceRoute.js";
import webHookRouter from './routes/webhook.route.js';
import { updateExpiredBookings } from './controllers/userController.js';

dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();

// Initialize Clerk
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Middleware ordering
app.use('/api/webhooks', 
  express.raw({ type: 'application/json' }), // Webhook needs raw body
  webHookRouter
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: [
    "https://aethersoft-frontend.onrender.com",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(bodyParser.json());

// Scheduled tasks
cron.schedule("0 * * * *", () => {
  console.log("Running expired bookings check...");
  updateExpiredBookings();
});
updateExpiredBookings();

// Routes
app.get("/healthz", (req, res) => res.sendStatus(200));
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter);

// Error handling
app.use((err, req, res, next) => {
  if (err.message.includes('Clerk') || err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Authentication failed' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is listening on port " + PORT);
  });
});