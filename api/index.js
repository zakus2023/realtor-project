import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// import routes
import userRoute from "./routes/userRoute.js";
import residenceRouter from "./routes/residenceRoute.js"

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

// api starts here
app.use("/api/user", userRoute);
app.use("/api/residence", residenceRouter)

// ===============================================

app.listen(PORT, () => {
  console.log("Sever is listening on port " + PORT);
});
