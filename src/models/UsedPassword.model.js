import mongoose from "mongoose";

const UsedPasswordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UsedPassword = mongoose.model("UsedPassword", UsedPasswordSchema);

export default UsedPassword;
