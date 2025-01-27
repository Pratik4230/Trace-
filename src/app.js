import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.route.js";
import adminAndReseller from "./routes/adminAndReseller.route.js";
import user from "./routes/user.route.js";

import CallLog from "./models/CallLog.model.js";
import authCheck from "./middlewares/authCheck.js";

const app = express();

app.options(
  "*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/admin-and-reseller", adminAndReseller);
app.use("/user", user);

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
