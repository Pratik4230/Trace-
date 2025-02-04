import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
      minlength: 4,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;
