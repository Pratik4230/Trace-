import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import Device from "../models/Device.model.js";
import CallLog from "../models/CallLog.model.js";

// const generateReferralCode = () => uuidv4().slice(0, 8).toUpperCase();
const generateReferralCode = () => Math.random().toString(36).slice(2, 10);

const addReseller = async (req, res) => {
  try {
    const { user } = req;
    const { name, email, password, role } = req.body;

    if (user.role !== "super_admin") {
      return res.status(403).json({ message: "Permission  Denied" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const referralCode = generateReferralCode();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      referral_code: referralCode,
    });

    await newUser.save();

    res
      .status(201)
      .json({ message: "Reseller Created", referral_code: referralCode });
  } catch (error) {
    console.log("errror  add reseller", error?.message);
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "super_admin") {
      // Super Admin fetches all users and resellers
      query = { role: { $in: ["user", "reseller"] } };
    } else if (req.user.role === "reseller") {
      // Resellers fetch only their assigned users
      query = { referred_by: req.user.referral_code }; // Match referred_by with the reseller's referral code
    } else {
      return res.status(403).json({ message: "Permission Denied" });
    }

    // Fetch users based on the query
    const users = await User.find(query, "id name email role"); // Project only id, name, email, role
    res
      .status(200)
      .json({ message: "Users fetched successfully", data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUsers = async (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;

  try {
    let query = { _id: id };
    let updateData = {};

    if (req.user.role === "super_admin") {
      // Super Admin can update any user or reseller
      updateData = { name, role };
    } else if (req.user.role === "reseller") {
      // Resellers can only update their own users
      query.referred_by = req.user.referral_code;
      updateData = { name };
    } else if (req.user._id == id) {
      // Users can only update their own profile (except role)
      updateData = { name };
    } else {
      return res.status(403).json({ message: "Permission Denied" });
    }

    const updatedUser = await User.findOneAndUpdate(query, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User not found or unauthorized to edit" });
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ API to Change User's Password (Super Admin & Reseller)
const changeUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    // ✅ Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let query = { _id: id };
    let updateData = { password: hashedPassword };

    if (req.user.role === "super_admin") {
      // ✅ Super Admin can change password for anyone
      // No need to modify the query
    } else if (req.user.role === "reseller") {
      // ✅ Reseller can change password only for their users
      query.referred_by = req.user.referral_code;
    } else {
      return res.status(403).json({ message: "Permission Denied" });
    }

    const updatedUser = await User.findOneAndUpdate(query, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User not found or unauthorized to change password" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addDevice = async (req, res) => {
  const { deviceName, sendInterval } = req.body;

  if (!deviceName) {
    return res.status(400).json({ message: "Device name is required" });
  }

  if (!["daily", "weekly", "monthly"].includes(sendInterval)) {
    return res
      .status(400)
      .json({ message: "Invalid interval. Use daily, weekly, or monthly." });
  }

  try {
    // ✅ Check if the device name already exists for the user
    const existingDevice = await Device.findOne({
      user_id: req.user._id,
      deviceName,
    });

    if (existingDevice) {
      return res.status(400).json({
        message: "Device name already exists. Please use a different name.",
      });
    }

    // ✅ Create a new device with an empty webhook_url initially

    const newDevice = new Device({
      userId: req.user._id,
      deviceName: deviceName,
      sendInterval,
      webhookUrl: "",
    });

    const savedDevice = await newDevice.save();

    // ✅ Generate the unique webhook URL and update the device
    const webhookUrl = `/webhook/call-log/${savedDevice._id}`;
    savedDevice.webhookUrl = webhookUrl;
    await savedDevice.save();

    res.status(201).json({
      message: "Device added successfully",
      deviceId: savedDevice._id,
      webhookUrl: webhookUrl,
      sendInterval: savedDevice.sendInterval,
    });
  } catch (error) {
    console.error("Error adding device:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getDevices = async (req, res) => {
  try {
    // Fetch user's devices
    const devices = await Device.find({ userId: req.user._id }).select(
      "id deviceName webhookUrl status lastPing"
    );

    if (devices.length === 0) {
      return res.json({ message: "No devices found", devices: [] });
    }

    // Fetch call counts for each device
    const devicesWithCounts = await Promise.all(
      devices.map(async (device) => {
        const deviceId = device._id;

        // Get today's total calls

        const todayTotalCalls = await CallLog.countDocuments({
          deviceId: deviceId,
          callDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
            $lte: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
          },
        });

        // Get overall total calls
        const overallTotalCalls = await CallLog.countDocuments({
          deviceId: deviceId,
        });

        return {
          ...device.toObject(),
          today_total_calls: todayTotalCalls || 0,
          overall_total_calls: overallTotalCalls || 0,
        };
      })
    );

    res.status(200).json({ data: devicesWithCounts });
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  addReseller,
  getUsers,
  updateUsers,
  changeUserPassword,
  addDevice,
  getDevices,
};
