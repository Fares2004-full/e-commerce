// models/emailVerificationToken.model.js
import mongoose from "mongoose";

const emailVerificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

emailVerificationTokenSchema.index({ user: 1 });
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerificationToken = mongoose.model(
  "EmailVerificationToken",
  emailVerificationTokenSchema,
);
export default EmailVerificationToken;
