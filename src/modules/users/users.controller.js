
import User from "./users.model.js";
import httpStateText from "../../utils/httpStateText.js";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../middlewares/catchAsync.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../../integrations/cloudinary.service.js";
import sanitizeUser from "../../utils/sanitizeUser.js";
import { revokeAllUserTokens } from "../auth/auth.service.js";

const USER_LIST_PROJECTION = {
  __v: 0,
};
// passwordHash is select:false on the schema already, so it never comes
// back unless explicitly requested with +passwordHash.

const getAllUsers = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const skip = (page - 1) * limit;
  const users = await User.find({}, USER_LIST_PROJECTION)
    .populate("role", "name")
    .limit(limit)
    .skip(skip);
  res.json({
    status: httpStateText[200],
    data: {
      users,
    },
  });
});

const getSingleUsers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id, USER_LIST_PROJECTION).populate(
    "role",
    "name",
  ); // populate return name and id of role with the user
  if (!user) {
    const error = AppError.create("User not found", 404, httpStateText[404]);
    return next(error);
  }
  return res.json({ status: httpStateText[200], data: user });
});

const updateUser = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { firstName, lastName, phone } = req.body;

  const user = await User.findById(id);
  if (!user) {
    const error = AppError.create("User not found", 404, httpStateText[404]);
    return next(error);
  }

  if (req.file) {
    // Replacing the avatar — delete the old Cloudinary asset first so
    // nothing is left orphaned there.
    await deleteFromCloudinary(user.avatarPublicId);
    const result = await uploadBufferToCloudinary(req.file.buffer, "avatars");
    user.avatarUrl = result.secure_url;
    user.avatarPublicId = result.public_id;
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;

  await user.save();
  res.json({ status: httpStateText[200], data: sanitizeUser(user) });
});

// Soft delete, per the reference architecture: User carries a deletedAt
// column and is never hard-removed, so historical references (orders,
// reviews, etc., once those modules exist) don't dangle.
const deleteUser = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(AppError.create("User not found", 404, httpStateText[404]));
  }

  user.deletedAt = new Date();
  user.isActive = false;
  await user.save();
  await revokeAllUserTokens(user._id);

  res.clearCookie("refreshToken");
  res.status(200).json({
    status: httpStateText[200],
    data: {
      message: "User deleted",
    },
  });
});

export { getAllUsers, getSingleUsers, updateUser, deleteUser };
