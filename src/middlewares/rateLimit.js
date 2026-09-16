// was otpRateLimiter.js
import rateLimit from "express-rate-limit"; // controle no of requets per spacefic router 🫨🫨
import httpStateText from "../utils/httpStateText.js";

const forgotPasswordLimiter = rateLimit({ // block ip address
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: httpStateText[429] || "fail",
    message: "Too many reset requests, please try again later",
  },
});

const otpAttemptLimiter = rateLimit({ // 5 trys for write code 😁
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: httpStateText[429] || "fail",
    message: "Too many attempts, please try again later",
  },
});

export { forgotPasswordLimiter, otpAttemptLimiter };
