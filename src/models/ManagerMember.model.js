import mongoose from "mongoose";

const ManagerMemberSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const ManagerMember = mongoose.model("ManagerMember", ManagerMemberSchema);

export default ManagerMember;
