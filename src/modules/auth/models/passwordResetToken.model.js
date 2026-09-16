// models/passwordResetToken.model.js
import mongoose from "mongoose";

// Two-step design (§5/§7 of the architecture doc): the OTP alone can never
// reset a password, only unlock a short-lived resetTokenHash — so guessing
// the OTP isn't enough on its own to hijack the account.
const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otpHash: {
      type: String,
      default: null,
    },
    resetTokenHash: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ user: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  passwordResetTokenSchema,
);
export default PasswordResetToken;
