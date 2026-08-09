import jwt from "jsonwebtoken";
import { compare } from "../utils/compare.js";

export const COOKIE_NAME = "iams_token";
export const TOKEN_ISSUER = "iams";
export const TOKEN_AUDIENCE = "iams-client";
export const TOKEN_ALGORITHM = "HS256";

export const TOKEN_VERIFY_OPTIONS = {
  algorithms: [TOKEN_ALGORITHM],
  issuer: TOKEN_ISSUER,
  audience: TOKEN_AUDIENCE,
};

export function extractToken(req) {
  return req.cookies?.[COOKIE_NAME] ?? null;
}

export function verifyAuth(req, res, next) {
  let token = extractToken(req);
  const header = req.headers.authorization;
  if (!token && header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, TOKEN_VERIFY_OPTIONS);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!compare(req.user?.role, "admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
