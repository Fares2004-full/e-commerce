// Registration, login, tokens, email activation, password reset.
// Profile CRUD (getAllUsers/getSingleUsers/updateUser/deleteUser) lives
// in ../users/users.controller.js.
import User from "../users/users.model.js";
import Role from "../rbac/role.model.js";
import RefreshToken from "./models/refreshToken.model.js";
import EmailVerificationToken from "./models/emailVerificationToken.model.js";
import PasswordResetToken from "./models/passwordResetToken.model.js";
import httpStateText from "../../utils/httpStateText.js";
import { generateAccessToken } from "../../utils/generateJWT.js";
import AppError from "../../errors/AppError.js";
import bcrypt from "bcryptjs";
import catchAsync from "../../middlewares/catchAsync.js";
import {
  issueAuthTokens,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  resolveRoleClaims,
} from "./auth.service.js";
import logger from "../../utils/logger.js";
import userRoles from "../rbac/rbac.constants.js";
import { uploadBufferToCloudinary } from "../../integrations/cloudinary.service.js";
import refreshTokenCookieOptions from "../../config/cookieOptions.js";
import sanitizeUser from "../../utils/sanitizeUser.js";
import { sha256, generateOpaqueToken, generateNumericOTP } from "../../utils/hash.js";
import {
  sendActivationEmail,
  sendResetPasswordOTP,
} from "../../integrations/email.service.js";
import {
  isStrongEnoughPassword,
  isValidGmail,
} from "../../utils/stringValidationRgex.js";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

const register = catchAsync(async (req, res, next) => {
  if (req.body == undefined) {
    const error = AppError.create("data is missing", 400, httpStateText[400]);
    return next(error);
  }

  const { firstName, lastName, email, password, phone } = req.body;
  if (!email || !password) {
    const error = AppError.create(
      "Email and Password are required",
      400,
      httpStateText[400],
    );
    return next(error);
  }
  if (!isValidGmail(email)) {
    return next(
      AppError.create(
        "Please provide a valid Gmail address",
        400,
        httpStateText[400],
      ),
    );
  }

  if (!isStrongEnoughPassword(password)) {
    return next(
      AppError.create(
        "Password must be at least 8 characters and include a letter and a number",
        400,
        httpStateText[400],
      ),
    );
  }

  const oldUser = await User.findOne({ email: email });
  logger.debug("Registration lookup", { email, exists: !!oldUser });
  if (oldUser) {
    const error = AppError.create(
      "User already exists",
      400,
      httpStateText[400],
    );
    return next(error);
  }

  // every new self-registered account gets the default customer role 
  const customerRole = await Role.findOne({ name: userRoles.CUSTOMER });
  if (!customerRole) {
    return next(
      AppError.create(
        "Default role is not configured",
        500,
        httpStateText[500],
      ),
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const activationToken = generateOpaqueToken();

  let avatarUrl;
  let avatarPublicId;
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, "avatars");
    avatarUrl = result.secure_url;
    avatarPublicId = result.public_id;
  }

  const newUser = new User({
    firstName,
    lastName,
    email,
    passwordHash: hashedPassword,
    phone,
    avatarUrl,
    avatarPublicId,
    role: customerRole._id,
    isEmailVerified: false,
  });

  await newUser.save();
  await EmailVerificationToken.create({
    user: newUser._id,
    tokenHash: sha256(activationToken),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });
  try {
    const info = await sendActivationEmail(newUser.email, activationToken);
    logger.info("Activation email sent", { email: newUser.email, messageId: info?.messageId });
  } catch (error) {
    logger.error("Error sending activation email", { email: newUser.email, error: error.message });
  }
  return res.status(201).json({
    status: httpStateText[201],
    message:
      "Registration successful. Please check your email to activate your account.",
  });
});

const activateAccount = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  if (!token) {
    return next(
      AppError.create("Activation token is required", 400, httpStateText[400]),
    );
  }
  const verificationToken = await EmailVerificationToken.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: Date.now() },
  });
  if (!verificationToken) {
    return next(
      AppError.create(
        "Invalid or expired activation link",
        400,
        httpStateText[400],
      ),
    );
  }

  const user = await User.findById(verificationToken.user);
  if (!user) {
    return next(AppError.create("User not found", 404, httpStateText[404]));
  }

  user.isEmailVerified = true;
  await user.save();
  await verificationToken.deleteOne();
  return res.status(200).json({
    status: httpStateText[200],
    message: "Account activated successfully",
  });
});

const login = catchAsync(async (req, res, next) => {
  if (req.body == undefined) {
    const error = AppError.create("data is missing", 400, httpStateText[400]);
    return next(error);
  }
  const { email, password } = req.body;
  if (!email || !password) {
    const error = AppError.create(
      "Email and Password are required",
      400,
      httpStateText[400],
    );
    return next(error);
  }
  const user = await User.findOne({ email: email }).select("+passwordHash");
  if (!user) {
    const error = AppError.create("user not found", 400, httpStateText[400]);
    return next(error);
  }

  if (!user.isActive) {
    return next(
      AppError.create("This account has been deactivated", 403, httpStateText[403]),
    );
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return next(
      AppError.create(
        "Too many failed attempts. Please try again later",
        423,
        httpStateText[423],
      ),
    );
  }

  if (!user.isEmailVerified) {
    return next(
      AppError.create(
        "Please verify your email before logging in",
        403,
        httpStateText[403],
      ),
    );
  }
  const matchedPassword = await bcrypt.compare(password, user.passwordHash);
  if (!matchedPassword) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    return next(
      AppError.create("Invalid email or password", 401, httpStateText[401]),
    );
  }

  // successful login: reset the lockout counters and record the login
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueAuthTokens(user, {
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  const userObj = sanitizeUser(user);

  return res.status(200).json({
    status: httpStateText[200],
    data: { user: userObj },
    accessToken,
  });
});

const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return next(
      AppError.create("No refresh token provided", 401, httpStateText[401]),
    );
  }

  const tokenDoc = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (!tokenDoc) {
    return next(
      AppError.create("Invalid refresh token", 403, httpStateText[403]),
    );
  }

  if (tokenDoc.revokedAt) {
    await revokeTokenFamily(tokenDoc.family);
    logger.warn("Refresh token reuse detected — family revoked", {
      userId: tokenDoc.user,
      family: tokenDoc.family,
    });
    res.clearCookie("refreshToken");
    return next(
      AppError.create(
        "Session invalid, please log in again",
        403,
        httpStateText[403],
      ),
    );
  }

  if (tokenDoc.expiresAt.getTime() < Date.now()) {
    return next(
      AppError.create("Refresh token expired", 403, httpStateText[403]),
    );
  }

  const user = await User.findById(tokenDoc.user);
  if (!user || !user.isActive) {
    return next(
      AppError.create("Invalid refresh token", 403, httpStateText[403]),
    );
  }

  const newRawToken = await rotateRefreshToken(tokenDoc);
  res.cookie("refreshToken", newRawToken, refreshTokenCookieOptions);

  const { role, permissions } = await resolveRoleClaims(user.role);
  const newAccessToken = generateAccessToken({
    email: user.email,
    id: user._id,
    role,
    permissions,
  });
  res.json({ status: httpStateText[200], accessToken: newAccessToken });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If the email exists, a code will be sent",
    });
  }
  const otp = generateNumericOTP();

  // one active reset flow per user at a time — replace any previous one
  await PasswordResetToken.findOneAndUpdate(
    { user: user._id },
    {
      otpHash: sha256(otp),
      resetTokenHash: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true },
  );

  await sendResetPasswordOTP(user.email, otp);
  return res.status(200).json({
    status: "success",
    message: "Reset code sent to your email",
  });
});

const verifyResetOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return next(
      AppError.create("Email and otp are required", 400, httpStateText[400]),
    );
  }
  const user = await User.findOne({ email });
  if (!user) {
    return next(
      AppError.create("Invalid or expired code", 400, httpStateText[400]),
    );
  }

  const resetDoc = await PasswordResetToken.findOne({
    user: user._id,
    expiresAt: { $gt: Date.now() },
  });
  if (!resetDoc || !resetDoc.otpHash) {
    return next(
      AppError.create("Invalid or expired code", 400, httpStateText[400]),
    );
  }

  if (resetDoc.attempts >= OTP_MAX_ATTEMPTS) {
    return next(
      AppError.create(
        "Too many attempts, please request a new code",
        429,
        httpStateText[429],
      ),
    );
  }

  if (resetDoc.otpHash !== sha256(otp)) {
    resetDoc.attempts += 1;
    await resetDoc.save();
    return next(
      AppError.create("Invalid or expired code", 400, httpStateText[400]),
    );
  }

  // OTP is single-use: consume it now and hand back a one-time reset token
  // instead. The confirm-password page never sees or needs the OTP again.
  const resetToken = generateOpaqueToken();
  resetDoc.otpHash = null;
  resetDoc.resetTokenHash = sha256(resetToken);
  resetDoc.attempts = 0;
  resetDoc.expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await resetDoc.save();

  return res.status(200).json({
    status: httpStateText[200],
    message: "OTP verified",
    data: { resetToken },
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return next(
      AppError.create(
        "resetToken and newPassword are required",
        400,
        httpStateText[400],
      ),
    );
  }
  if (!isStrongEnoughPassword(newPassword)) {
    return next(
      AppError.create(
        "Password must be at least 8 characters and include a letter and a number",
        400,
        httpStateText[400],
      ),
    );
  }

  // this is the only thing that proves the OTP step actually happened —
  // there is no other path that sets resetTokenHash
  const resetDoc = await PasswordResetToken.findOne({
    resetTokenHash: sha256(resetToken),
    expiresAt: { $gt: Date.now() },
  });
  if (!resetDoc) {
    return next(
      AppError.create(
        "Invalid or expired reset session, please request a new code",
        400,
        httpStateText[400],
      ),
    );
  }

  const user = await User.findById(resetDoc.user);
  if (!user) {
    return next(AppError.create("User not found", 404, httpStateText[404]));
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();
  await resetDoc.deleteOne();

  // invalidate every existing session so a leaked old token stops working
  await revokeAllUserTokens(user._id);

  res.clearCookie("refreshToken");
  return res.status(200).json({
    status: httpStateText[200],
    message: "Password reset successfully",
  });
});

const logout = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (token) {
    // logout = revoke only this one device's token, not the whole family
    await RefreshToken.updateOne(
      { tokenHash: sha256(token), revokedAt: null },
      { revokedAt: new Date() },
    );
  }
  res.clearCookie("refreshToken");
  res
    .status(200)
    .json({ status: httpStateText[200], data: { message: "logged out" } });
});

const logoutAll = catchAsync(async (req, res, next) => {
  await revokeAllUserTokens(req.currentUser.id);
  res.clearCookie("refreshToken");
  res.status(200).json({
    status: httpStateText[200],
    data: { message: "logged out from all devices" },
  });
});

export {
  register,
  activateAccount,
  login,
  refreshToken,
  logout,
  logoutAll,
  resetPassword,
  verifyResetOTP,
  forgotPassword,
};
