// modules/products/products.routes.js
import express from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import userRoles from "../rbac/rbac.constants.js";
import uploadMemory from "../../middlewares/uploadMemory.js";
import { productValidationSchema } from "./products.validation.js";
import { runValidation } from "../../middlewares/validate.js";
import {
  getAllProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.controller.js";

const router = express.Router();

router
  .route("/")
  .get(getAllProducts)
  .post(
    uploadMemory(5, 6).array("images", 6),
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.MODERATOR),
    productValidationSchema(),
    runValidation,
    createProduct,
  );

router
  .route("/:id")
  .get(getSingleProduct)
  .patch(
    uploadMemory(5, 6).array("images", 6),
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.MODERATOR),
    updateProduct,
  )
  .delete(
    authenticate,
    authorize(userRoles.ADMIN, userRoles.SUPER_ADMIN, userRoles.MODERATOR),
    deleteProduct,
  );

export default router;
