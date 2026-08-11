import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { users } from "../db/schema.js";
import { compare } from "../utils/compare.js";

export const TOKEN_ISSUER = "iams";
export const TOKEN_AUDIENCE = "iams-client";
export const TOKEN_ALGORITHM = "HS256";

export const TOKEN_VERIFY_OPTIONS = {
  algorithms: [TOKEN_ALGORITHM],
  issuer: TOKEN_ISSUER,
  audience: TOKEN_AUDIENCE,
};

export function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export async function verifyAuth(req, res, next) {
  let token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, TOKEN_VERIFY_OPTIONS);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // A soft-deleted account no longer exists — treat it exactly like an
  // unknown account even while its (now moot) token is still signed. A
  // deactivated account keeps its session (it can still log in) but is
  // confined to account-management endpoints only.
  try {
    const account = await db
      .select({ is_deleted: users.is_deleted, is_deactivated: users.is_deactivated })
      .from(users)
      .where(eq(users.id, Number(req.user.sub)))
      .get();
    if (!account) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }
    if (compare(Number(account.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }
    req.user.is_deactivated = compare(Number(account.is_deactivated), 1);
  } catch {
    return next(new Error("Database unavailable"));
  }

  // Deactivated accounts may only reach the auth endpoints that manage their
  // own account: /auth/me, /auth/logout, /auth/account/deactivate,
  // /auth/account/reactivate and DELETE /auth/account. Everything else in the
  // app is off-limits until they reactivate.
  if (req.user.is_deactivated) {
    const base = req.baseUrl ?? "";
    const path = req.path ?? "";
    const allowed =
      base === "/api/auth" &&
      ["/me", "/logout", "/account/deactivate", "/account/reactivate", "/account"].includes(path);
    if (!allowed) {
      return res.status(403).json({
        error: "Account is deactivated. Reactivate your account to continue.",
      });
    }
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!compare(req.user?.role, "admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
