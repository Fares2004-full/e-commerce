// was utils/rbacSeed.js
import Role from "./role.model.js";
import Permission from "./permission.model.js";
import logger from "../../utils/logger.js";

// Keep this list scoped to what the codebase actually has modules for
// today (users, products). Add more `resource:action` keys here as new
// modules get real permission checks.
const PERMISSION_KEYS = [
  { key: "user:read", description: "View other users' profiles" },
  { key: "user:update", description: "Edit another user's profile" },
  { key: "user:ban", description: "Ban or unban a user" },
  { key: "user:role:update", description: "Change a user's role" },
  { key: "product:create", description: "Create a product" },
  { key: "product:update", description: "Edit a product" },
  { key: "product:delete", description: "Delete a product" },
  { key: "category:create", description: "Create a category" },
  { key: "category:update", description: "Edit a category" },
  { key: "category:delete", description: "Delete a category" },
];

// role -> which permission keys it gets by default
const ROLE_PERMISSIONS = {
  customer: [],
  support: ["user:read"],
  moderator: ["user:read", "product:update", "category:update"],
  admin: [
    "user:read",
    "user:update",
    "user:ban",
    "product:create",
    "product:update",
    "product:delete",
    "category:create",
    "category:update",
    "category:delete",
  ],
  super_admin: [
    "user:read",
    "user:update",
    "user:ban",
    "user:role:update",
    "product:create",
    "product:update",
    "product:delete",
    "category:create",
    "category:update",
    "category:delete",
  ],
};

/*
  Idempotently ensures the default Permission and Role documents exist.
  Safe to call on every boot — upserts, never duplicates.
 */
export const seedRbac = async () => {
  const permissionIdByKey = new Map();

  for (const { key, description } of PERMISSION_KEYS) {
    const permission = await Permission.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, description } }, // Set the key and description if the document doesn't exist
      { upsert: true, new: true },
    );
    permissionIdByKey.set(key, permission._id);
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const permissionIds = permissionKeys.map((k) => permissionIdByKey.get(k));
    await Role.findOneAndUpdate(
      { name: roleName },
      { $set: { permissions: permissionIds } },
      { upsert: true, new: true },
    );
  }

  logger.info("RBAC seed complete", {
    roles: Object.keys(ROLE_PERMISSIONS),
    permissions: PERMISSION_KEYS.length,
  });
};

export const DEFAULT_ROLE_NAME = "customer";
