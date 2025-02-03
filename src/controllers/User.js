import express from "express";
import User from "../models/User.model.js";
import Device from "../models/Device.model.js";
import UsedPassword from "../models/UsedPassword.model.js";
import CallLog from "../models/CallLog.model.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const getProfile = async (req, res) => {
  try {
    const user = await User.findById({ _id: req.user._id }).select(
      "name email role referral_code"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    console.log("error get profile ", error);
    return res.status(500).json({ message: error.message });
  }
};

const checkUsedPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Fetch the old passwords associated with the email

    const oldPasswords = await UsedPassword.find({ email }).select("password");

    for (const record of oldPasswords) {
      const match = await bcrypt.compare(newPassword, record.password);
      if (match) {
        return res.status(400).json({
          message:
            "This password has been used before. Please choose a different one.",
        });
      }
    }

    res.status(200).json({ message: "This password is safe to use." });
  } catch (error) {
    console.error("Error checking used password:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteDevice = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;

  try {
    const device = await Device.findOne({
      _id: id,
      userId: userId,
    });

    if (!device) {
      return res
        .status(404)
        .json({ message: "Device not found or unauthorized" });
    }

    //TODO Delete in real
    // Soft delete the device (update deleted_at to current timestamp)

    device.deletedAt = new Date();
    await device.save();

    res.json({ message: "Device deleted successfully (soft delete applied)" });
  } catch (error) {
    console.error("Error during device deletion:", error);
    res.status(500).json({ message: error.message });
  }
};

const getDeviceCallLogs = async (req, res) => {
  const { deviceName } = req.params;
  const userId = req.user._id; // Get the authenticated user ID

  try {
    // ✅ Check if the device belongs to the user

    const isValidDevice = await Device.find({
      userId: userId,
      deviceName: deviceName,
    });

    if (!isValidDevice) {
      return res
        .status(403)
        .json({ message: "Unauthorized access or device not found" });
    }

    const deviceId = isValidDevice._id;

    const callLogs = await CallLog.find({
      deviceId: deviceId,
    })
      .select("_id number type callDate duration simSlot")
      .sort({ callDate: -1 });

    res.json({
      deviceName,
      userId,
      total_logs: callLogs.length,
      call_logs: callLogs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnalyticsCalls = async (req, res) => {
  const { filter, start_date, end_date } = req.query;

  try {
    const userId = req.user._id;
    let matchStage = { userId: userId }; // Base match stage for MongoDB aggregation

    // 🔹 Determine the match criteria based on the filter type
    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of the day
      matchStage.callDate = { $gte: today };
    } else if (filter === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchStage.callDate = { $gte: sevenDaysAgo };
    } else if (filter === "15days") {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      matchStage.callDate = { $gte: fifteenDaysAgo };
    } else if (filter === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.callDate = { $gte: thirtyDaysAgo };
    } else if (filter === "custom" && start_date && end_date) {
      matchStage.callDate = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    } else {
      return res.status(400).json({
        message: "Invalid filter. Use today, 7days, 30days, or custom.",
      });
    }

    // 🔹 MongoDB aggregation pipeline
    const analytics = await CallLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $group: {
          _id: null,
          total_calls: { $sum: 1 },
          incoming_calls: {
            $sum: { $cond: [{ $eq: ["$type", "Incoming"] }, 1, 0] },
          },
          missed_calls: {
            $sum: { $cond: [{ $eq: ["$type", "Missed"] }, 1, 0] },
          },
          outgoing_calls: {
            $sum: { $cond: [{ $eq: ["$type", "Outgoing"] }, 1, 0] },
          },
          unanswered_outgoing: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "Outgoing"] },
                    { $eq: ["$duration", "0 seconds"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          answered_outgoing: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "Outgoing"] },
                    { $ne: ["$duration", "0 seconds"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          total_calls: 1,
          incoming_calls: 1,
          missed_calls: 1,
          outgoing_calls: 1,
          unanswered_outgoing: 1,
          answered_outgoing: 1,
        },
      },
    ]);

    if (analytics.length === 0) {
      return res.json({
        total_calls: 0,
        incoming_calls: 0,
        missed_calls: 0,
        outgoing_calls: 0,
        unanswered_outgoing: 0,
        answered_outgoing: 0,
      });
    }

    // 🔹 Respond with analytics
    res.json(analytics[0]); // Return the first result or an empty object
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getUserCallLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, search = "" } = req.query;

    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (search) {
      matchStage.$or = [
        { number: { $regex: search, $options: "i" } }, // Phone number
        { type: { $regex: search, $options: "i" } }, // Type (Incoming, Outgoing)
        { "device.deviceName": { $regex: search, $options: "i" } }, // Device Name
      ];
    }

    const userCallLogs = await CallLog.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "devices",
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      { $unwind: "$device" },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          number: 1,
          type: 1,
          callDate: 1,
          duration: 1,
          simSlot: 1,
          deviceName: "$device.deviceName",
          lastSmsSentAt: 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
    ]);

    const totalLogs = await CallLog.countDocuments(matchStage);
    const totalPages = Math.ceil(totalLogs / limit);

    if (!userCallLogs.length) {
      return res.status(204).json({ message: "No call logs found" });
    }

    res.json({ callLogs: userCallLogs, totalPages, currentPage: Number(page) });
  } catch (error) {
    console.log("erre");
    return res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { oldPassword, name, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "old Password and new Password  required" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ message: "New password cannot be same" });
    }

    const loggedInUser = await User.findById(req.user._id);

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      loggedInUser.password
    );

    if (!isPasswordValid) {
      return res.status(401).send("Invalid Credentials");
    }

    let newName;
    if (name) {
      newName = name;
    } else {
      newName = loggedInUser.name;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 11);

    loggedInUser.password = hashedPassword;
    loggedInUser.name = newName;

    await loggedInUser.save();

    return res.status(200).json({ message: "profile updated successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Profile update error",
      error,
    });
  }
};

export {
  getProfile,
  checkUsedPassword,
  deleteDevice,
  getDeviceCallLogs,
  getAnalyticsCalls,
  getUserCallLogs,
  updateProfile,
};
