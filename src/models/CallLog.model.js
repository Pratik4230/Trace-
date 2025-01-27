import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
    },

    number: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
      //   LOOKOUT
      enum: ["Incoming", "Outgoing", "Missed", "Rejected"],
    },

    simSlot: {
      type: String,
      required: true,
      enum: ["SIM1", "SIM2"],
      default: "SIM1",
    },

    callDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: String,
      required: true,
    },

    LastSmsSentAt: {
      type: Date,
      required: true,
    },
  },

  { timestamps: true }
);

const CallLog = mongoose.model("CallLog", callLogSchema);

export default CallLog;
