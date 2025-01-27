import { Router } from "express";
import authCheck from "../middlewares/authCheck.js";
const router = Router();

//get post  delete/:id get/:deviceName  get
import {
  getProfile,
  checkUsedPassword,
  deleteDevice,
  getDeviceCallLogs,
  getAnalyticsCalls,
  getUserCallLogs,
} from "../controllers/User.js";

router.route("/profile").get(authCheck, getProfile);
router.route("/check-used-password").post(checkUsedPassword);
router.route("/delete-device/:id").delete(authCheck, deleteDevice);
router.route("/device-call-logs/:deviceName").get(authCheck, getDeviceCallLogs);
router.route("/analytics-calls").get(authCheck, getAnalyticsCalls);
router.route("/call-logs").get(authCheck, getUserCallLogs);

export default router;
