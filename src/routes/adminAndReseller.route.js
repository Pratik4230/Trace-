import { Router } from "express";
import authCheck from "../middlewares/authCheck.js";

const router = Router();

//post get put put post get
import {
  addReseller,
  getUsers,
  updateUsers,
  changeUserPassword,
  addDevice,
  getDevices,
} from "../controllers/AdminAndReseller.js";

router.route("/add-reseller").post(authCheck, addReseller);
router.route("/users").get(authCheck, getUsers);
router.route("/update-user/:id").put(authCheck, updateUsers);
router.route("/change-password/:id").put(authCheck, changeUserPassword);
router.route("/add-device").post(authCheck, addDevice);
router.route("/devices").get(authCheck, getDevices);

export default router;
