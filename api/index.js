import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import routes
import userRoute from "./routes/userRoute.js";
import residenceRouter from "./routes/residenceRoute.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

// Increase request body size limit
app.use(express.json({ limit: "100mb" }));  
app.use(express.urlencoded({ limit: "100mb", extended: true }));  
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// API Routes
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter);

// Start server
app.listen(PORT, () => {
  console.log("Server is listening on port " + PORT);
});