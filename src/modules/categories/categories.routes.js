import express from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import requirePermission from "../../middlewares/requirePermission.js";
import userRoles from "../rbac/rbac.constants.js";
import { categoryValidationSchema } from "./categories.validation.js";
import { runValidation } from "../../middlewares/validate.js";
import {
  getAllCategories,
  getSingleCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categories.controller.js";

const router = express.Router();

router
  .route("/")
  .get(getAllCategories) // public
  .post(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN),
    requirePermission("category:create"),
    categoryValidationSchema(),
    runValidation,
    createCategory,
  );

router
  .route("/:id")
  .get(getSingleCategory) // public
  .patch(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.MODERATOR),
    requirePermission("category:update"),
    updateCategory,
  )
  .delete(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN),
    requirePermission("category:delete"),
    deleteCategory,
  );

export default router;
