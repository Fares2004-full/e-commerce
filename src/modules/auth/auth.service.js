// was utils/authResponse.js — pure token/session logic, no req/res.
import { generateAccessToken } from "../../utils/generateJWT.js";
import Role from "../rbac/role.model.js";
import RefreshToken from "./models/refreshToken.model.js";
import { sha256, generateOpaqueToken } from "../../utils/hash.js";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Resolves { role name, permission keys } once so the JWT is
// self-contained — authenticate()/authorize()/requirePermission() don't
// need a DB round trip on every request just to check access.
export const resolveRoleClaims = async (roleId) => {
  const role = await Role.findById(roleId).populate("permissions", "key");
  return {
    role: role?.name, // if the role was deleted, this will be undefined, which is fine — the JWT will be invalidated by requirePermission() since it won't find the role in the DB
    permissions: (role?.permissions || []).map((p) => p.key),
  };
};

// Issues a brand-new access token + refresh token pair and starts a new
// rotation "family" for it — the refresh token is stored in the DB hashed, and the raw token is returned to the caller to be sent to the client. The access token is a JWT that contains the user's role and permissions, so it can be used for authorization without additional DB lookups.
export const issueAuthTokens = async (user, meta = {}) => {
  const { role, permissions } = await resolveRoleClaims(user.role);

  const accessToken = generateAccessToken({
    email: user.email,
    id: user._id,
    role,
    permissions,
  });

  const rawRefreshToken = generateOpaqueToken();
  const family = generateOpaqueToken(16);

  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(rawRefreshToken),
    family,
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

// Rotates an existing, already-validated refresh token: revokes it and
// issues a new opaque token in the SAME family, so reuse of the old one later is detectable 
export const rotateRefreshToken = async (tokenDoc) => {
  const rawRefreshToken = generateOpaqueToken();
  const newTokenHash = sha256(rawRefreshToken);

  await RefreshToken.create({
    user: tokenDoc.user,
    tokenHash: newTokenHash,
    family: tokenDoc.family,
    userAgent: tokenDoc.userAgent,
    ip: tokenDoc.ip,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedByTokenHash = newTokenHash;
  await tokenDoc.save();

  return rawRefreshToken;
};

// A revoked token being presented again means it was stolen/replayed —
// nuke the whole family so every device using it is forced to log back in.
export const revokeTokenFamily = async (family) => {
  await RefreshToken.updateMany(
    { family, revokedAt: null },
    { revokedAt: new Date() },
  );
};

// "Logout from all devices" / forced re-auth after a password change or
// account deletion — every refresh token this user holds, across every
// family/device, dies at once. Called from the auth module itself
// (logout-all, password reset) and cross-module from users.controller.js
// on account deletion — this function is auth's public interface for that,
// callers never touch RefreshToken directly.
export const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() },
  );
};
