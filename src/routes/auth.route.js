import { Router } from "express";
import authCheck from "../middlewares/authCheck.js";

const router = Router();

//post, post, post, post, post
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/auth.js";

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/logout").post(authCheck, logout);

export default router;
