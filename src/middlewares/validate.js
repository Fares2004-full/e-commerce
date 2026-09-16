// was validationScema.js — the generic express-validator result handler.
// Per-module field-rule arrays (validationSchema, productValidationSchema)
// now live inside each module as <module>.validation.js.
import { validationResult } from "express-validator";
import AppError from "../errors/AppError.js";
import httpStateText from "../utils/httpStateText.js";

export const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(AppError.create(errors.array()[0].msg, 422, httpStateText[422]));
  }
  next();
};
