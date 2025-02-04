import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import authCheck from "./middlewares/authCheck.js";

import authRoutes from "./routes/auth.route.js";
import adminAndReseller from "./routes/adminAndReseller.route.js";
import user from "./routes/user.route.js";
import CallLog from "./models/CallLog.model.js";
import campaign from "./routes/campaign.route.js";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGIN.split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/admin-and-reseller", adminAndReseller);
app.use("/user", user);
app.use("/campaign", campaign);

app.post("/addCallLogs", async (req, res) => {
  const {
    userId,
    deviceId,
    number,
    type,
    simSlot,
    callDate,
    duration,
    LastSmsSentAt,
  } = req.body;

  const callLog = new CallLog({
    userId,
    deviceId,
    number,
    type,
    simSlot,
    callDate,
    duration,
    LastSmsSentAt,
  });

  await callLog.save();

  res.status(201).json({ message: "Call log added successfully" });
});

app.get("/protected-route", authCheck, (req, res) => {
  res.json({ message: "Welcome! You are authenticated.", user: req.user });
});

export default app;
