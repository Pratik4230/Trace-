import { Router } from "express";
import authCheck from "../middlewares/authCheck.js";

const router = Router();

//post get put put post get
import {
  addUser,
  getUsers,
  updateUsers,
  changeUserPassword,
  addDevice,
  getDevices,
  addDataInCallLog,
} from "../controllers/AdminAndReseller.js";

router.route("/add-user").post(authCheck, addUser);
router.route("/users").get(authCheck, getUsers);
router.route("/update-user/:id").put(authCheck, updateUsers);
router.route("/change-password/:id").put(authCheck, changeUserPassword);
router.route("/add-device").post(authCheck, addDevice);
router.route("/devices").get(authCheck, getDevices);
router.route("/add-data-in-call-log").post(authCheck, addDataInCallLog);

export default router;
