import { body } from "express-validator";

export const productValidationSchema = () => {
  return [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),

    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),

    body("price")
      .notEmpty()
      .withMessage("Price is required")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),

    body("discountPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Discount price must be a positive number"),

    body("category")
      .notEmpty()
      .withMessage("Category is required")
      .isMongoId()
      .withMessage("category must be a valid category id"),

    body("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
  ];
};
