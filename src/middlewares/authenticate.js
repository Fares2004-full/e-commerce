// was verifyToken.js
import jwt from "jsonwebtoken";
import User from "../modules/users/users.model.js";

import httpStateText from "../utils/httpStateText.js";
import AppError from "../errors/AppError.js";

export default async (req, res, next) => {
  const authHeader =
    req.headers["Authorization"] || req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = AppError.create("No token provided", 401, httpStateText[401]);

    return next(error);
  }
  const token = authHeader.split(" ")[1];
  try {
    //  Verify JWT
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    //  Get user from database
    const user = await User.findById(decodedToken.id);
    if (!user) {
      const error = AppError.create("User not found", 401, httpStateText[401]);
      return next(error);
    }
    //  Check if password was changed
    if (
      user.passwordChangedAt &&
      decodedToken.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      const error = AppError.create(
        "Password was changed, please login again",
        401,
        httpStateText[401],
      );
      return next(error);
    }
    //  Save user/token information
    req.currentUser = decodedToken;

    return next();
  } catch (err) {
    const error = AppError.create(
      "Invalid or expired token",
      401,
      httpStateText[401],
    );
    return next(error);
  }
};
