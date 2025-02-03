import mongoose from "mongoose";

const ContactMasterSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
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
    phoneNumber: {
      type: String,
      maxlength: 100,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ContactMaster = mongoose.model("ContactMaster", ContactMasterSchema);

export default ContactMaster;
