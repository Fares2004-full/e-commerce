// was allowedTo.js
import appError from "../errors/AppError.js";
import httpStateText from "../utils/httpStateText.js";

// req.currentUser.role is the role NAME (e.g. "admin"), resolved once at
// login/refresh time and embedded in the JWT payload — no DB hit needed
// on every request just to check a role.
export default function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role))
      return next(
        appError.create("this role is not authorized", 403, httpStateText[403]),
      );
    next();
  };
}
