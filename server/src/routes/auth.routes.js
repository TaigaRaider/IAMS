import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  applications,
  interviews,
  offers,
  internTasks,
} from "../db/schema.js";
import { verifyAuth } from "../middleware/auth.middleware.js";
import {
  COOKIE_NAME,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  TOKEN_ALGORITHM,
} from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const authRouter = Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOCKED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

const failedAttempts = new Map();

function isUniqueViolation(err) {
  const cause = err?.cause ?? err;
  return (
    compare(cause?.code, "SQLITE_CONSTRAINT_UNIQUE") ||
    compare(cause?.code, "SQLITE_CONSTRAINT") ||
    /UNIQUE constraint failed/i.test(cause?.message ?? "")
  );
}

function isValidPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  return /[a-zA-Z]/.test(password) && /\d/.test(password);
}

function expiresInSeconds(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn ?? "1h");
  if (!match) return 60 * 60;
  const value = Number(match[1]);
  const unit = match[2];
  const seconds = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 }[unit];
  return value * seconds;
}

function isLocked(username) {
  const entry = failedAttempts.get(username);
  return entry ? entry.lockedUntil > Date.now() : false;
}

function recordFailure(username) {
  const entry = failedAttempts.get(username) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOCKED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  failedAttempts.set(username, entry);
}

function clearFailures(username) {
  failedAttempts.delete(username);
}

authRouter.post("/signup", async (req, res, next) => {
  const { full_name, email, username, password } = req.body ?? {};
  const cleanFullName = typeof full_name === "string" ? full_name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanUsername = typeof username === "string" ? username.trim() : "";

  if (!cleanFullName || cleanFullName.length > 100) {
    return res.status(400).json({ error: "Full name is required (max 100 characters)" });
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!USERNAME_RE.test(cleanUsername)) {
    return res.status(400).json({
      error: "Username must be 3-30 characters using letters, numbers, or underscores",
    });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and contain a letter and a number`,
    });
  }

  try {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await db
      .insert(users)
      .values({
        full_name: cleanFullName,
        email: cleanEmail,
        username: cleanUsername,
        password_hash,
        user_role: "applicant",
      })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body ?? {};
  const cleanUsername = typeof username === "string" ? username.trim() : "";
  if (!cleanUsername || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  if (isLocked(cleanUsername)) {
    return res.status(429).json({
      error: "Account temporarily locked due to too many failed attempts. Try again later.",
    });
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, cleanUsername))
      .get();

    const passwordOk = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordOk) {
      recordFailure(cleanUsername);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearFailures(cleanUsername);

    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
    const token = jwt.sign(
      { sub: user.id, role: user.user_role },
      process.env.JWT_SECRET,
      {
        algorithm: TOKEN_ALGORITHM,
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        expiresIn,
      },
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: compare(process.env.NODE_ENV, "production"),
      maxAge: expiresInSeconds(expiresIn) * 1000,
    });

    res.json({ data: { role: user.user_role, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: compare(process.env.NODE_ENV, "production"),
  });
  res.json({ data: { ok: true } });
});

// Current session: verifies the token, returns the freshest role from the DB,
// and self-heals — an applicant whose application was marked "Hired" (or whose
// offer was accepted) is migrated to the intern role automatically.
authRouter.get("/me", verifyAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        user_role: users.user_role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ error: "Account no longer exists" });
    }

    const freshRole = user.user_role;
    if (compare(freshRole, "applicant")) {
      const hired = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.applicant_id, user.id),
            eq(applications.status, "Hired"),
          ),
        )
        .get();
      if (hired) {
        await db
          .update(users)
          .set({ user_role: "intern" })
          .where(eq(users.id, user.id))
          .run();
        return res.json({ data: { role: "intern", full_name: user.full_name } });
      }
    }

    res.json({ data: { role: freshRole, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
});

// Permanently delete the signed-in user's account along with all of their
// applications, interviews, offers and intern tasks.
authRouter.delete("/account", verifyAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({ id: users.id, user_role: users.user_role })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ error: "Account no longer exists" });
    }

    if (compare(user.user_role, "admin")) {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.user_role, "admin"))
        .all();
      if (admins.length <= 1) {
        return res
          .status(400)
          .json({ error: "Cannot delete the only administrator account" });
      }
    }

    const userApps = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.applicant_id, userId))
      .all();
    const appIds = userApps.map((a) => a.id);

    if (appIds.length) {
      await db
        .delete(interviews)
        .where(inArray(interviews.application_id, appIds))
        .run();
      await db
        .delete(offers)
        .where(inArray(offers.application_id, appIds))
        .run();
      await db
        .delete(applications)
        .where(inArray(applications.id, appIds))
        .run();
    }

    await db
      .delete(internTasks)
      .where(eq(internTasks.intern_id, userId))
      .run();
    await db.delete(users).where(eq(users.id, userId)).run();

    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
