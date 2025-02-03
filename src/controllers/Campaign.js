import CampaignMaster from "../models/CampaignMaster.model.js";
import ContactMaster from "../models/ContactMaster.model.js";
import Campaign from "../models/Campaign.model.js";
import Member from "../models/Member.model.js";
import User from "../models/User.model.js";
import ManagerMember from "../models/ManagerMember.model.js";
import bcrypt from "bcrypt";
import Papa from "papaparse";
import mongoose from "mongoose";

const generateReferralCode = () => Math.random().toString(36).slice(2, 10);

const createCampaign = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, startDate, members, csvData } = req.body;

    const user = await User.findById(userId);

    // Ensure the user is authorized to create a campaign
    if (user.role !== "user" && user.role !== "manager") {
      return res.status(403).json({
        message:
          "Permission Denied! Only users and managers can create a campaign",
      });
    }

    // Create the campaign master record
    const masterCampaign = await CampaignMaster.create({
      name: name,
      startDate: startDate,
      createdBy: userId,
    });

    // Parse the CSV data

    const parsedCSV = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const usersFromCSV = parsedCSV.data;

    // Process each user from the CSV and store them in ContactMaster
    for (let user of usersFromCSV) {
      const { userName, email, phoneNumber } = user;

      // Check if the contact already exists
      let contact = await ContactMaster.findOne({
        phoneNumber: phoneNumber,
      });

      if (!contact) {
        // If the contact doesn't exist, create a new one
        await ContactMaster.create({
          userName: userName,
          phoneNumber: phoneNumber,
          email: email,
          createdBy: userId,
        });
      }
    }

    const contacts = await ContactMaster.find({ createdBy: userId });

    const contactIDs = contacts.map((contact) => contact._id);

    // Create the Member document with the userIds

    // Create the campaign record
    const campaignData = await Campaign.create({
      campaignMaster: masterCampaign._id,
      contactId: contactIDs,
      createdBy: userId,
    });

    const userIdsArray = members.map((user) => user.id);

    // Create the Member document with the userIds
    const memberData = await Member.create({
      userIds: userIdsArray,
      campaignMaster: masterCampaign._id,
      campaign: campaignData._id,
    });

    const updateCampaign = await Campaign.findByIdAndUpdate(
      campaignData._id,
      { member: memberData._id },
      { new: true }
    );

    return res.status(201).json({ message: "Campaign created successfully" });
  } catch (error) {
    console.error("create campaign error", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const getMembers = async (req, res) => {
  try {
    const userMembers = await User.find({
      referred_by: req.user.referral_code,
    }).select("name email _id referred_by");

    return res
      .status(200)
      .json({ message: "Members fetched successfully", data: userMembers });
  } catch (error) {
    console.log("get members error", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const addMembersAndManagers = async (req, res) => {
  try {
    const { user } = req;
    const { name, email, password, role } = req.body;

    if (
      user.role !== "user" &&
      user.role !== "reseller" &&
      user.role !== "super_admin"
    ) {
      return res.status(403).json({ message: "Permission  Denied" });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role != "member" && role != "manager") {
      return res.status(400).json({ message: "Invalid role" });
    }

    let currentUser = await User.findById(user._id);

    let referral;
    if (!currentUser.referral_code) {
      referral = generateReferralCode();
      currentUser = await User.findOneAndUpdate(
        { _id: user._id },
        { referral_code: referral },
        { new: true }
      );
    } else {
      referral = currentUser.referral_code;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = new User({
      name,
      email,
      password: hashedPassword,
      role,
      referred_by: referral,
    });
    const savedMember = await newMember.save();

    return res.status(201).json({ message: `${role}  created successfully` });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const addMembersByManager = async (req, res) => {
  try {
    const { user } = req;
    const { name, email, password, role } = req.body;

    if (user.role !== "manager") {
      return res.status(403).json({ message: "Permission  Denied" });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role != "member") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const currentUser = await User.findById(user._id);

    const referral = currentUser.referred_by;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = new User({
      name,
      email,
      password: hashedPassword,
      role,
      referred_by: referral,
    });
    const savedMember = await newMember.save();

    const managerMember = new ManagerMember({
      manager: user._id,
      members: [savedMember._id],
    });

    await managerMember.save();

    return res.status(201).json({ message: `member  created successfully` });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const getCampaignsShow = async (req, res) => {
  try {
    const userId = req.user?._id;

    const compaigns = await Campaign.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "campaignmasters",
          localField: "campaignMaster",
          foreignField: "_id",
          as: "campaignmaster",
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "member",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $addFields: {
          members: {
            $arrayElemAt: ["$members", 0],
          },
          campaignmaster: {
            $arrayElemAt: ["$campaignmaster", 0],
          },
          creator: {
            $arrayElemAt: ["$creator", 0],
          },
        },
      },
      {
        $unwind: {
          path: "$members.userIds",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.userIds",
          foreignField: "_id",
          as: "memberUsers",
        },
      },
      {
        $addFields: {
          member: {
            $arrayElemAt: ["$memberUsers", 0],
          },
        },
      },
      {
        $group: {
          _id: "$campaignmaster._id",
          compaignName: {
            $first: "$campaignmaster.name",
          },
          compaignStatus: {
            $first: "$campaignmaster.status",
          },
          compaignStartDate: {
            $first: "$campaignmaster.startDate",
          },
          compaignCreatorName: {
            $first: "$creator.name",
          },
          compaignCreatorRole: {
            $first: "$creator.role",
          },
          compaignCreatorId: {
            $first: "$creator._id",
          },
          members: {
            $addToSet: {
              memberName: "$member.name",
              memberId: "$member._id",
            },
          },
        },
      },
    ]);

    if (!compaigns || compaigns.length === 0) {
      return res.status(204).json({ message: "No compaigns found" });
    }

    return res.status(200).json({ data: compaigns });
  } catch (error) {
    console.log("getCampaignsShow error", error.message);
    return res.status(500).json({ message: error.message });
  }
};
const getCampaignsSuperAdmin = async (req, res) => {
  try {
    const userId = req.user?._id;

    const compaigns = await Campaign.aggregate([
      {
        $lookup: {
          from: "campaignmasters",
          localField: "campaignMaster",
          foreignField: "_id",
          as: "campaignmaster",
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "member",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $addFields: {
          members: {
            $arrayElemAt: ["$members", 0],
          },
          campaignmaster: {
            $arrayElemAt: ["$campaignmaster", 0],
          },
          creator: {
            $arrayElemAt: ["$creator", 0],
          },
        },
      },
      {
        $unwind: {
          path: "$members.userIds",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.userIds",
          foreignField: "_id",
          as: "memberUsers",
        },
      },
      {
        $addFields: {
          member: {
            $arrayElemAt: ["$memberUsers", 0],
          },
        },
      },
      {
        $group: {
          _id: "$campaignmaster._id",
          compaignName: {
            $first: "$campaignmaster.name",
          },
          compaignStatus: {
            $first: "$campaignmaster.status",
          },
          compaignStartDate: {
            $first: "$campaignmaster.startDate",
          },
          compaignCreatorName: {
            $first: "$creator.name",
          },
          compaignCreatorRole: {
            $first: "$creator.role",
          },
          compaignCreatorId: {
            $first: "$creator._id",
          },
          members: {
            $addToSet: {
              memberName: "$member.name",
              memberId: "$member._id",
            },
          },
        },
      },
    ]);

    if (!compaigns || compaigns.length === 0) {
      return res.status(204).json({ message: "No compaigns found" });
    }

    return res.status(200).json({ data: compaigns });
  } catch (error) {
    console.log("getCampaignsShow error", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export {
  createCampaign,
  addMembersAndManagers,
  addMembersByManager,
  getMembers,
  getCampaignsShow,
  getCampaignsSuperAdmin,
};
