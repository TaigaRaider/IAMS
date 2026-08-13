import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  applications,
} from "../db/schema.js";
import { verifyAuth } from "../middleware/auth.middleware.js";
import {
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  TOKEN_ALGORITHM,
} from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const authRouter = Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOCKED_ATTEMPTS = 15;
const LOCKOUT_MS = 60 * 1000;

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

// Which column tripped a unique constraint? SQLite reports either the table
// column ("UNIQUE constraint failed: users.username") or the named index
// ("UNIQUE constraint failed: index 'users_username_ci_unique'").
function uniqueField(err) {
  const cause = err?.cause ?? err;
  const target = (cause?.message ?? "").match(/UNIQUE constraint failed:\s*(.*)/i)?.[1] ?? "";
  if (/users\.username|users_username_unique|users_username_ci_unique/.test(target)) {
    return "username";
  }
  if (/users\.email|users_email_unique/.test(target)) {
    return "email";
  }
  return null;
}

function isValidPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  return /[a-zA-Z]/.test(password) && /\d/.test(password);
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
      const field = uniqueField(err);
      const error =
        field === "email"
          ? "An account with this email already exists"
          : field === "username"
            ? "This username is already taken"
            : "Email or username already exists";
      return res.status(409).json({ error });
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body ?? {};
  const cleanUsername = typeof(username) === "string" ? username.trim() : "";
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

    // A soft-deleted account no longer exists — never reveal that it did.
    if (user && compare(Number(user.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }

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

    res.json({
      data: {
        role: user.user_role,
        full_name: user.full_name,
        token,
        deactivated: compare(Number(user.is_deactivated), 1),
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
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
        is_deactivated: users.is_deactivated,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return res.status(401).json({ error: "Account no longer exists" });
    }

    const freshRole = user.user_role;
    if (compare(freshRole, "applicant") && !compare(Number(user.is_deactivated), 1)) {
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
        return res.json({
          data: {
            role: "intern",
            full_name: user.full_name,
            deactivated: false,
          },
        });
      }
    }

    res.json({
      data: {
        role: freshRole,
        full_name: user.full_name,
        deactivated: compare(Number(user.is_deactivated), 1),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Reactivate a deactivated account. Only possible while the account is still
// deactivated; issues a fresh session so the user is signed in again.
authRouter.patch("/account/reactivate", verifyAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        user_role: users.user_role,
        is_deactivated: users.is_deactivated,
        is_deleted: users.is_deleted,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }
    if (!compare(Number(user.is_deactivated), 1)) {
      return res.status(400).json({ error: "Account is not deactivated" });
    }

    await db
      .update(users)
      .set({ is_deactivated: 0 })
      .where(eq(users.id, userId))
      .run();

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

    res.json({
      data: {
        role: user.user_role,
        full_name: user.full_name,
        token,
        deactivated: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Deactivate the signed-in account — a required step before deletion.
// The user stays signed in but is confined to account management
// (reactivate / delete) until they reactivate.
authRouter.patch("/account/deactivate", verifyAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({ id: users.id, is_deleted: users.is_deleted })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }

    await db
      .update(users)
      .set({ is_deactivated: 1 })
      .where(eq(users.id, userId))
      .run();

    res.json({ data: { deactivated: true } });
  } catch (err) {
    next(err);
  }
});

// Soft-delete the signed-in account. Only deactivated accounts can be
// deleted — deleting is what really removes the account (sets is_deleted = 1).
// The row is kept so the audit trail / related data survives, but every
// subsequent request reports "Account doesn't exist".
authRouter.delete("/account", verifyAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({
        id: users.id,
        user_role: users.user_role,
        is_deactivated: users.is_deactivated,
        is_deleted: users.is_deleted,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }

    if (!compare(Number(user.is_deactivated), 1)) {
      return res
        .status(400)
        .json({ error: "You must deactivate your account before deleting it" });
    }

    // Never allow the last active admin to be soft-deleted (it would lock
    // everyone out of the admin area entirely).
    if (compare(user.user_role, "admin")) {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.user_role, "admin"), eq(users.is_deleted, 0)))
        .all();
      if (admins.length <= 1) {
        return res
          .status(400)
          .json({ error: "Cannot delete the only administrator account" });
      }
    }

    await db
      .update(users)
      .set({ is_deleted: 1 })
      .where(eq(users.id, userId))
      .run();

    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
