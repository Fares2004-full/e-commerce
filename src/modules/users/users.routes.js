import express from "express";
const router = express.Router();

import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import requirePermission from "../../middlewares/requirePermission.js";
import checkUserOwnership from "../../middlewares/checkUserOwnership.js";
import uploadMemory from "../../middlewares/uploadMemory.js";
import userRoles from "../rbac/rbac.constants.js";

import {
  getAllUsers,
  getSingleUsers,
  updateUser,
  deleteUser,
} from "./users.controller.js";

router
  .route("/")
  .get(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.SUPPORT),
    requirePermission("user:read"),
    getAllUsers,
  ); // protected route

router
  .route("/:id")
  .get(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.SUPPORT),
    requirePermission("user:read"),
    getSingleUsers,
  )
  .patch(
    uploadMemory(2, 1).single("avatar"),
    authenticate,
    checkUserOwnership,
    updateUser,
  )
  .delete(authenticate, checkUserOwnership, deleteUser);

export default router;
