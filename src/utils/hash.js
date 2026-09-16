// utils/hash.js
import crypto from "crypto";


export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const generateOpaqueToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex"); // 32 bytes = 256 bits = 64 hex chars, which is plenty of entropy for a refresh token

export const generateNumericOTP = () =>
  crypto.randomInt(100000, 1000000).toString();
