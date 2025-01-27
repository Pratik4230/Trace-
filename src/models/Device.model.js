import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deviceName: {
      type: String,
      required: true,
      maxlength: 100,
      unique: true,
    },
    webhookUrl: {
      type: String,
      maxlength: 100,
    },
    sendInterval: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly"],
    },
    lastPing: {
      type: Date,
    },

    status: {
      type: String,
      required: true,
      //LOOKOUT
      enum: ["offline", "online"],
      default: "offline",
    },

    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Device = mongoose.model("Device", DeviceSchema);

export default Device;
