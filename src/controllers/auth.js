import jwt from "jsonwebtoken";
import "dotenv/config";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import PasswordReset from "../models/PasswordReset.model.js";

// const generateToken = (user, expiresIn) => {
//   return jwt.sign(
//     { id: user.user_id, role: user.role, name: user.name, email: user.email },
//     process.env.JWT_SECRET,
//     {
//       expiresIn,
//     }
//   );
// };

const generateToken = (user, expiresIn) => {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    {
      expiresIn,
    }
  );
};

const tokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const removePassword = (user) => {
  let userWithoutPassword = user.toObject();
  delete userWithoutPassword.password;
  return userWithoutPassword;
};

// const generateReferralCode = () => uuidv4().slice(0, 8).toUpperCase();
const generateReferralCode = () => Math.random().toString(36).slice(2, 10);

// Nodemailer Setup
// TODO
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const signup = async (req, res) => {
  try {
    const { name, email, password, role, referral_code } = req.body;

    const alreadyExist = await User.findOne({ email: email });
    if (alreadyExist) {
      return res.status(400).json({ message: "User already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 11);

    let referredBy = null;
    let newReferralCode = null;

    if (role === "reseller") {
      // Generate Referral Code for Reseller
      newReferralCode = generateReferralCode();
    } else if (role === "user" && referral_code) {
      // Validate Referral Code if Provided

      const referrer = await User.findOne({ referral_code: referral_code });
      if (!referrer) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      referredBy = referral_code;
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      referred_by: referredBy,
      referral_code: newReferralCode,
    });

    await user.save();

    const createdUser = await User.findOne({ email: email });
    if (!createdUser) {
      return res
        .status(500)
        .json({ message: "User not created. Please try again" });
    }

    const token = generateToken(createdUser, "1d");

    const userWithoutPassword = removePassword(createdUser);

    return res.status(201).cookie("auth_token", token, tokenOptions).json({
      message: "User created successfully.",
      data: userWithoutPassword,
      referral_code: newReferralCode,
    });
  } catch (error) {
    console.log("register error : ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    console.log(" login ", email, password, rememberMe);

    const user = await User.findOne({ email: email });
    if (!user) {
      console.log("user not found");

      return res.status(404).json({ message: "User not found" });
    }
    console.log("helllo");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }
    console.log("valid password");

    const expiresIn = rememberMe ? "30d" : "1d";

    const token = generateToken(user, expiresIn);

    const userWithoutPassword = removePassword(user);
    console.log("valid password 2");
    if (rememberMe) {
      console.log("valid password in ");
      return res
        .status(200)
        .cookie("auth_token", token, {
          ...tokenOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .json({ message: "Login successful", data: userWithoutPassword });
    } else {
      console.log("valid password oo ");
      return res
        .status(200)
        .cookie("auth_token", token, {
          ...tokenOptions,
          maxAge: 1 * 24 * 60 * 60 * 1000,
        })
        .json({ message: "Login successful", data: userWithoutPassword });
    }
  } catch (error) {
    console.log("login error : ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000);
  console.log("forgotPassword", email, otp, expiresAt);

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const deletePasswordReset = await PasswordReset.findOneAndDelete({
      email: email,
    });

    const newPasswordReset = new PasswordReset({
      email: email,
      otp: otp,
      expiresAt: expiresAt,
    });

    console.log("newPasswordReset", newPasswordReset);

    await newPasswordReset.save();

    console.log("email is", email);
    console.log(typeof email);

    //LOOKOUT
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email Error: ", error);
        return res
          .status(500)
          .json({ message: "Failed to send OTP email", error: error.message });
      }
    });

    console.log("Mail Options", mailOptions);

    return res.status(200).json({ message: "OTP Sent to Email" });
  } catch (err) {
    console.error("Server Error: ", err);
    return res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const passwordResets = await PasswordReset.find({
    email,
    otp,
    expiresAt: { $gt: new Date() },
  });

  if (!passwordResets || passwordResets.length === 0)
    return res.status(404).json({ message: "Invalid or expired OTP" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = await User.findOneAndUpdate(
    { email },
    { password: hashedPassword },
    { new: true }
  );

  res.status(200).json({ message: "Password Reset Successfull" });
};

const logout = async (req, res) => {
  try {
    return res
      .status(200)
      .clearCookie("auth_token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("logout error : ", error);
  }
};

// TODO
// app.get("/protected-route", authenticate, (req, res) => {
//   res.json({ message: "Welcome! You are authenticated.", user: req.user });
// });

export { signup, login, forgotPassword, resetPassword, logout };
