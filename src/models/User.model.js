import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      required: true,
      enum: ["super_admin", "reseller", "user", "manager", "member"],
      default: "user",
    },

    referral_code: {
      type: String,
      maxlength: 10,
    },

    referred_by: {
      type: String,
      maxlength: 10,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
