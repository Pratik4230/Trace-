import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    contactId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ContactMaster",
      },
    ],

    campaignMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignMaster",
    },

    callLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallLog",
    },
    deletedAt: {
      type: Date,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
