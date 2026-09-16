import express from "express";
const router = express.Router();

import { validationSchema } from "./auth.validation.js";
import { runValidation } from "../../middlewares/validate.js";
import authenticate from "../../middlewares/authenticate.js";
import uploadMemory from "../../middlewares/uploadMemory.js";
import { forgotPasswordLimiter, otpAttemptLimiter } from "../../middlewares/rateLimit.js";
import {
  register,
  activateAccount,
  login,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "./auth.controller.js";

router.route("/register").post(
  uploadMemory(2, 1).single("avatar"),
  validationSchema(),
  runValidation,
  register,
);
router.route("/activate-account").get(activateAccount);
router.route("/login").post(login);
router.route("/refresh").post(refreshToken);
router.route("/logout").post(authenticate, logout);
router.route("/logout-all").post(authenticate, logoutAll);
router.route("/forgot-password").post(forgotPasswordLimiter, forgotPassword);
router.route("/verify-reset-otp").post(otpAttemptLimiter, verifyResetOTP);
router.route("/reset-password").post(otpAttemptLimiter, resetPassword);

export default router;
