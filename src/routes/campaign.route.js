import { Router } from "express";
import authCheck from "../middlewares/authCheck.js";

const router = Router();

import {
  createCampaign,
  addMembersAndManagers,
  addMembersByManager,
  getMembers,
  getCampaignsShow,
  getCampaignsSuperAdmin,
} from "../controllers/Campaign.js";

router.route("/create").post(authCheck, createCampaign);
router.route("/add-member-manager").post(authCheck, addMembersAndManagers);
router.route("/add-member").post(authCheck, addMembersByManager);
router.route("/members").get(authCheck, getMembers);
router.route("/campaigns").get(authCheck, getCampaignsShow);
router.route("/super-admin-campaigns").get(authCheck, getCampaignsSuperAdmin);

export default router;
