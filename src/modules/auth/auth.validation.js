// was the validationSchema() half of middlewares/validationScema.js
import { body } from "express-validator";

export const validationSchema = () => {
  return [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters"),

    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2 })
      .withMessage("Last name must be at least 2 characters"),

    body("phone").optional().trim(),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email"),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ];
};
