import jwt from "jsonwebtoken";
import "dotenv/config";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import PasswordReset from "../models/PasswordReset.model.js";

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
  role: Joi.string().valid("reseller", "user").required(),
  referral_code: Joi.string().allow("").optional(),
});

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

const generateReferralCode = () => Math.random().toString(36).slice(2, 10);

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

    const { error } = userValidationSchema.validate(req.body);
    if (error) {
      console.log("error : ", error);

      return res.status(400).json({ message: error.details[0].message });
    }

    const alreadyExist = await User.findOne({ email: email });
    if (alreadyExist) {
      return res.status(400).json({ message: "User already registered." });
    }

    if (role == "manager" || role == "member") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const hashedPassword = await bcrypt.hash(password, 11);

    let referredBy = null;
    let newReferralCode = generateReferralCode();

    if (role === "user" && referral_code) {
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

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const expiresIn = rememberMe ? "30d" : "1d";

    const token = generateToken(user, expiresIn);

    const userWithoutPassword = removePassword(user);

    if (rememberMe) {
      return res
        .status(200)
        .cookie("auth_token", token, {
          ...tokenOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .json({ message: "Login successful", data: userWithoutPassword });
    } else {
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

// const forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const expiresAt = new Date(Date.now() + 10 * 60000);
//   console.log("email is : ", email);

//   try {
//     const user = await User.findOne({ email: email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const deletePasswordReset = await PasswordReset.findOneAndDelete({
//       email: email,
//     });

//     const newPasswordReset = new PasswordReset({
//       email: email,
//       otp: otp,
//       expiresAt: expiresAt,
//     });

//     await newPasswordReset.save();

//     const mailOptions = {
//       from: process.env.MAIL_USER,
//       to: email,
//       subject: "Password Reset OTP",
//       text: `Your OTP for password reset is: ${otp}`,
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error("Email Error: ", error);
//         return res
//           .status(500)
//           .json({ message: "Failed to send OTP email", error: error.message });
//       }
//     });

//     return res.status(200).json({ message: "OTP Sent to Email", data: email });
//   } catch (err) {
//     console.error("Server Error: ", err);
//     return res.status(500).json({ message: err.message });
//   }
// };

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000);
  console.log("email is : ", email, "otp is:", otp);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await PasswordReset.findOneAndDelete({ email });

    const newPasswordReset = new PasswordReset({ email, otp, expiresAt });
    await newPasswordReset.save();

    // const mailOptions = {
    //   from: process.env.MAIL_USER,
    //   to: email,
    //   subject: "Password Reset OTP",
    //   text: `Your OTP for password reset is: ${otp}`,
    // };

    // Await the email sending process
    // await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "OTP Sent to Email", data: email });
  } catch (err) {
    console.error("Server Error: ", err);
    return res.status(500).json({ message: err.message });
  }
};

const validateOTP = async (req, res) => {
  const { otp, email } = req.body;
  console.log("otp: ", otp, email);

  const passwordResets = await PasswordReset.find({
    email,
    otp,
    expiresAt: { $gt: new Date() },
  });

  if (!passwordResets || passwordResets.length === 0)
    return res.status(404).json({ message: "Invalid or expired OTP" });

  return res.status(200).json({ message: "OTP is valid" });
};

const resetPassword = async (req, res) => {
  const { email, password, confirm_password } = req.body;

  if (!email || !password || !confirm_password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirm_password) {
    return res.status(200).json({ message: "Passwords do not match" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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

export { signup, login, forgotPassword, validateOTP, resetPassword, logout };
