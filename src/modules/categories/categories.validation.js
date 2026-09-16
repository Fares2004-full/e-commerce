import { body } from "express-validator";

export const categoryValidationSchema = () => {
  return [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),

    body("parent")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("parent must be a valid category id"),

    body("image").optional().trim(),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ];
};
