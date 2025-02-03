import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    userIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    campaignMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignMaster",
    },

    compaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
  },
  { timestamps: true }
);

const Member = mongoose.model("Member", MemberSchema);

export default Member;
