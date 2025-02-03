import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import Device from "../models/Device.model.js";
import CallLog from "../models/CallLog.model.js";
import Joi from "joi";

const userValidationSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(20)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$"
      )
    )
    .message(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
    )
    .required(),
  role: Joi.string().valid("reseller", "member", "manager", "user").required(),
});

const generateReferralCode = () => Math.random().toString(36).slice(2, 10);

const addUser = async (req, res) => {
  try {
    const { user } = req;
    const { name, email, password, role, selectedUserName, selectedUserId } =
      req.body;

    const { error } = userValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    let hashedPassword;
    let referral;
    if (
      (user.role == "super_admin" && role == "reseller") ||
      (user.role == "super_admin" && role == "user")
    ) {
      hashedPassword = await bcrypt.hash(password, 10);
      referral = generateReferralCode();

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referral_code: referral,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: "User Created", referral_code: referral });
    }

    if (
      (user.role == "super_admin" && role == "member") ||
      (user.role == "super_admin" && role == "manager")
    ) {
      hashedPassword = await bcrypt.hash(password, 10);

      const getUser = await User.findById(selectedUserId);
      if (!getUser) {
        return res.status(404).json({ message: "User not found" });
      }

      referral = getUser?.referral_code;

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referred_by: referral,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: `${role} Created`, referred_by: referral });
    }

    if (
      (user.role == "reseller" && role == "reseller") ||
      (user.role == "reseller" && role == "user")
    ) {
      hashedPassword = await bcrypt.hash(password, 10);
      referral = req.user.referral_code;
      let newReferralCode = generateReferralCode();

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referred_by: referral,
        referral_code: newReferralCode,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: "User Created", referral_code: referral });
    }

    if (
      (user.role == "reseller" && role == "member") ||
      (user.role == "reseller" && role == "manager")
    ) {
      hashedPassword = await bcrypt.hash(password, 10);

      const getUser = await User.findById(selectedUserId);
      if (!getUser) {
        return res.status(404).json({ message: "User not found" });
      }

      referral = getUser?.referral_code;

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referred_by: referral,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: `${role} Created`, referred_by: referral });
    }

    if (
      (user.role == "user" && role == "member") ||
      (user.role == "user" && role == "manager")
    ) {
      hashedPassword = await bcrypt.hash(password, 10);

      const getUser = await User.findById(user._id);
      if (!getUser) {
        return res.status(404).json({ message: "User not found" });
      }

      referral = getUser?.referral_code;

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referred_by: referral,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: `${role} Created`, referred_by: referral });
    }
    if (user.role == "user" && role == "user") {
      hashedPassword = await bcrypt.hash(password, 10);

      const newReferralCode = generateReferralCode();

      const getUser = await User.findById(user._id);
      if (!getUser) {
        return res.status(404).json({ message: "User not found" });
      }

      referral = getUser?.referral_code;

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        referral_code: newReferralCode,
        referred_by: referral,
      });

      await newUser.save();

      res
        .status(201)
        .json({ message: `${role} Created`, referred_by: referral });
    }
  } catch (error) {
    console.log("errror  add reseller", error?.message);
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    let query = {};

    const loggedInUser = await User.findById(req.user._id);

    if (loggedInUser.role === "super_admin") {
      query = { role: { $in: ["user", "reseller"] } };
    } else if (loggedInUser.role === "reseller") {
      query = { referred_by: loggedInUser.referral_code };
    } else if (loggedInUser.role == "user") {
      query = {
        role: { $in: ["manager", "member", "user"] },

        referred_by: loggedInUser.referral_code,
      };
    } else {
      return res.status(403).json({ message: "Permission Denied" });
    }

    // Fetch users based on the query
    const users = await User.find(query, "id name email role referred_by"); // Project only id, name, email, role
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
      updateData = { name, role };
    } else if (req.user.role === "user") {
      query.referred_by = req.user.referral_code;
      updateData = { name, role };
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
    } else if (req.user.role === "user") {
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

const addDataInCallLog = async (req, res) => {
  try {
    const { number, type, duration, simSlot } = req.body;

    const device = await Device.findOne({ userId: req.user._id });

    const currentDate = new Date();

    const newCallLog = new CallLog({
      userId: req.user._id,
      deviceId: device._id,
      number,
      type,
      callDate: currentDate,
      duration,
      simSlot,
    });

    await newCallLog.save();
    res
      .status(201)
      .json({ message: "Call log added successfully", data: newCallLog });
  } catch (error) {
    console.error("Error adding call log:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  addUser,
  getUsers,
  updateUsers,
  changeUserPassword,
  addDevice,
  getDevices,
  addDataInCallLog,
};
