import httpStateText from "../utils/httpStateText.js";
import AppError from "../errors/AppError.js";

export default (req, res, next) => {
  if (req.currentUser.id !== req.params.id) {
    return next(
      AppError.create(
        "You are not allowed to modify this user",
        403,
        httpStateText[403],
      ),
    );
  }

  next();
};
