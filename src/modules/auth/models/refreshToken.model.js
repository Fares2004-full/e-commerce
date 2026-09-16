// models/refreshToken.model.js
import mongoose from "mongoose";

// Opaque refresh tokens live here, not on User: this lets us support
// multiple devices, rotation, and reuse detection (§7 of the architecture
// doc) without ever storing the raw token — only its hash.
const refreshTokenSchema = new mongoose.Schema(
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
    family: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ family: 1 });
// TTL: Mongo auto-purges the document once expiresAt passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
