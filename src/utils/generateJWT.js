import jwt from "jsonwebtoken";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
};
