import appError from "../errors/AppError.js";
import httpStateText from "../utils/httpStateText.js";

// Fine-grained check against the permission set embedded in the JWT at
// login/refresh time (req.currentUser.permissions), e.g. "product:create".
// Use this instead of authorize() when a route needs a specific
// capability rather than "any admin-tier role".
export default function requirePermission(permissionKey) {
  return (req, res, next) => {
    const permissions = req.currentUser?.permissions || [];
    if (!permissions.includes(permissionKey)) {
      return next(
        appError.create(
          `Missing required permission: ${permissionKey}`,
          403,
          httpStateText[403],
        ),
      );
    }
    next();
  };
}
