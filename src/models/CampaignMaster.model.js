import mongoose from "mongoose";

const CampaignMasterSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["start", "end", "pause", "pending"],
      default: "pending",
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const CampaignMaster = mongoose.model("CampaignMaster", CampaignMasterSchema);

export default CampaignMaster;
