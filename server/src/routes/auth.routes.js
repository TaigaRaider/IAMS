import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  applications,
  authTokens,
} from "../db/schema.js";
import { verifyAuth } from "../middleware/auth.middleware.js";
import {
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  TOKEN_ALGORITHM,
} from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { sendMail } from "../utils/mailer.js";
import { verificationEmail, resetEmail } from "../utils/email-templates.js";
import { issueCode, consumeCode, cooldownRemaining } from "../utils/tokens.js";

const authRouter = Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOCKED_ATTEMPTS = 15;
const LOCKOUT_MS = 60 * 1000;

// bcrypt-ing this unused hash on every failed login keeps the response time
// roughly constant whether or not the username exists, so attackers can't
// enumerate accounts by timing. (Generated once: cost 12 ≈ 300ms, cheap.)
const DUMMY_HASH = bcrypt.hashSync("iams-dummy-timing-equalizer", BCRYPT_ROUNDS);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const CODE_RE = /^\d{6}$/;

const failedAttempts = new Map();

const isDev = process.env.NODE_ENV !== "production";

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function findByEmail(email) {
  return db.select().from(users).where(eq(users.email, cleanEmail(email))).get();
}

async function issueAndSend(user, kind) {
  const code = await issueCode(db, user.id, kind);
  if (isDev) {
    console.log(
      `[mailer] ${kind} code for ${user.email}: ${code} (dev mirror in case mail doesn't arrive)`,
    );
  }
  const { full_name, email } = user;
  const html = kind === "verify"
    ? verificationEmail({ name: full_name.split(" ")[0], code })
    : resetEmail({ name: full_name.split(" ")[0], code });
  const subject = kind === "verify" ? "Verify your IAMS account" : "Reset your IAMS password";
  // Fire-and-forget: SMTP can be slow; the response must not block on it.
  // sendMail never throws; if it fails the user can simply resend.
  void sendMail({ to: email, subject, html });
}

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
        email_verified: 0,
      })
      .run();
    const userId = Number(result.lastInsertRowid);
    const created = await db.select().from(users).where(eq(users.id, userId)).get();

    try {
      await issueAndSend(created, "verify");
    } catch (err) {
      if (!isDev) {
        await db.delete(users).where(eq(users.id, userId)).run();
        const tokenRows = await db
          .select({ id: authTokens.id })
          .from(authTokens)
          .where(eq(authTokens.user_id, userId))
          .all();
        for (const t of tokenRows) {
          await db.delete(authTokens).where(eq(authTokens.id, t.id)).run();
        }
      }
      return next(err);
    }

    res.status(201).json({ data: { id: userId } });
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
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !passwordOk) {
      recordFailure(cleanUsername);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearFailures(cleanUsername);

    if (!compare(Number(user.email_verified), 1)) {
      return res.status(403).json({
        error: "Verify your email to continue",
        code: "EMAIL_UNVERIFIED",
      });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
    const token = jwt.sign(
      { sub: user.id, role: user.user_role, ver: user.token_version ?? 0 },
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
        phone: users.phone,
        location: users.location,
        nationality: users.nationality,
        date_of_birth: users.date_of_birth,
        education: users.education,
        experience: users.experience,
        skills: users.skills,
        cover_letter: users.cover_letter,
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
            biodata: {
              phone: user.phone,
              location: user.location,
              nationality: user.nationality,
              date_of_birth: user.date_of_birth,
              education: user.education,
              experience: user.experience,
              skills: user.skills,
              cover_letter: user.cover_letter,
            },
          },
        });
      }
    }

    res.json({
      data: {
        role: freshRole,
        full_name: user.full_name,
        deactivated: compare(Number(user.is_deactivated), 1),
        biodata: {
          phone: user.phone,
          location: user.location,
          nationality: user.nationality,
          date_of_birth: user.date_of_birth,
          education: user.education,
          experience: user.experience,
          skills: user.skills,
          cover_letter: user.cover_letter,
        },
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
        token_version: users.token_version,
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
      { sub: user.id, role: user.user_role, ver: user.token_version ?? 0 },
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

// Change the signed-in account's password. Requires the current password; a
// mismatch counts against the same per-username failure/ lockout tracking the
// login uses, so guessing against a live session is throttled too.
authRouter.patch("/account/password", verifyAuth, async (req, res, next) => {
  const { current_password, new_password } = req.body ?? {};
  if (typeof current_password !== "string" || !current_password) {
    return res.status(400).json({ error: "Current password is required" });
  }
  if (!isValidPassword(new_password)) {
    return res.status(400).json({
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters and contain a letter and a number`,
    });
  }
  if (current_password === new_password) {
    return res
      .status(400)
      .json({ error: "New password must be different from the current one" });
  }

  try {
    const userId = Number(req.user.sub);
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        password_hash: users.password_hash,
        is_deleted: users.is_deleted,
        token_version: users.token_version,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }

    const currentOk = await bcrypt.compare(current_password, user.password_hash);
    if (!currentOk) {
      recordFailure(user.username);
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    clearFailures(user.username);

    const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    // Revoke every outstanding session (including this one): the user signs
    // in again with the new password.
    await db
      .update(users)
      .set({ password_hash, token_version: user.token_version + 1 })
      .where(eq(users.id, userId))
      .run();

    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// Update the signed-in account's profile: full name plus optional biodata
// fields (kept in sync with application submissions). Not sensitive enough
// to revoke sessions — the token carries no name; /me returns the fresh one.
authRouter.patch("/account/profile", verifyAuth, async (req, res, next) => {
  const full_name = typeof req.body?.full_name === "string" ? req.body.full_name.trim() : "";
  if (!full_name || full_name.length > 100) {
    return res.status(400).json({ error: "Full name is required (max 100 characters)" });
  }
  let biodata = {};
  for (const [key, max] of Object.entries({
    phone: 30,
    location: 120,
    nationality: 60,
    date_of_birth: 30,
    education: 500,
    experience: 2000,
    skills: 500,
  })) {
    if (!(key in (req.body ?? {}))) continue;
    const value = typeof req.body[key] === "string" ? req.body[key].trim() : "";
    if (value.length > max) {
      return res
        .status(400)
        .json({ error: `${key} is too long (max ${max} characters)` });
    }
    biodata[key] = value;
  }
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
    await db.update(users).set({ full_name, ...biodata }).where(eq(users.id, userId)).run();
    res.json({ data: { full_name, ...biodata } });
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

// Confirm an email with the 6-digit code sent at signup. Idempotent once
// verified. Wrong codes are counted against the active token (5 max).
authRouter.post("/verify-email", async (req, res, next) => {
  const { email, code } = req.body ?? {};
  const clean = cleanEmail(email);
  const cleanCode = typeof code === "string" ? code.trim() : "";

  if (!EMAIL_RE.test(clean)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!CODE_RE.test(cleanCode)) {
    return res.status(400).json({ error: "Enter the 6-digit code from your email" });
  }

  try {
    const user = await findByEmail(clean);
    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    if (compare(Number(user.email_verified), 1)) {
      return res.json({ data: { ok: true } });
    }

    const result = await consumeCode(db, user.id, "verify", cleanCode);
    if (result.ok) {
      await db.update(users).set({ email_verified: 1 }).where(eq(users.id, user.id)).run();
      return res.json({ data: { ok: true } });
    }
    if (result.reason === "code" && result.left > 0) {
      return res.status(400).json({
        error: `Invalid code — ${result.left} ${result.left === 1 ? "attempt" : "attempts"} left`,
      });
    }
    return res.status(400).json({ error: "Invalid or expired code" });
  } catch (err) {
    next(err);
  }
});

// (Re)send the signup verification code. Always responds generically; only
// sends when an unverified account exists. 60s cooldown between sends.
authRouter.post("/resend-verification", async (req, res, next) => {
  const { email } = req.body ?? {};
  const clean = cleanEmail(email);

  if (!EMAIL_RE.test(clean)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    const user = await findByEmail(clean);
    if (user && !compare(Number(user.is_deleted), 1) && !compare(Number(user.email_verified), 1)) {
      const wait = await cooldownRemaining(db, user.id, "verify");
      if (wait > 0) {
        return res
          .status(429)
          .json({ error: "Please wait before requesting another code", retryAfter: Math.ceil(wait / 1000) });
      }
      try {
        await issueAndSend(user, "verify");
      } catch (err) {
        return next(err);
      }
    }
    res.json({ data: { ok: true, message: "If an account exists for this email, a verification code has been sent." } });
  } catch (err) {
    next(err);
  }
});

// Request a password reset code. Enumeration-safe: identical response whether
// or not the account exists.
authRouter.post("/forgot-password", async (req, res, next) => {
  const { email } = req.body ?? {};
  const clean = cleanEmail(email);

  if (!EMAIL_RE.test(clean)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    const user = await findByEmail(clean);
    if (user && !compare(Number(user.is_deleted), 1)) {
      const wait = await cooldownRemaining(db, user.id, "reset");
      if (wait === 0) {
        try {
          await issueAndSend(user, "reset");
        } catch (err) {
          return next(err);
        }
      }
    }
    res.json({ data: { ok: true, message: "If an account exists for this email, a password reset code has been sent." } });
  } catch (err) {
    next(err);
  }
});

// Set a new password using a reset code. Single-use, 30-minute expiry.
authRouter.post("/reset-password", async (req, res, next) => {
  const { email, code, new_password } = req.body ?? {};
  const clean = cleanEmail(email);
  const cleanCode = typeof code === "string" ? code.trim() : "";

  if (!EMAIL_RE.test(clean)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!CODE_RE.test(cleanCode)) {
    return res.status(400).json({ error: "Enter the 6-digit code from your email" });
  }
  if (!isValidPassword(new_password)) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and contain a letter and a number`,
    });
  }

  try {
    const user = await findByEmail(clean);
    if (!user || compare(Number(user.is_deleted), 1)) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const result = await consumeCode(db, user.id, "reset", cleanCode);
    if (result.ok) {
      const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
      // Revoke every outstanding session — a reset invalidates old logins.
      await db
        .update(users)
        .set({ password_hash, token_version: user.token_version + 1 })
        .where(eq(users.id, user.id))
        .run();
      clearFailures(user.username);
      return res.json({ data: { ok: true } });
    }
    if (result.reason === "code" && result.left > 0) {
      return res.status(400).json({
        error: `Invalid code — ${result.left} ${result.left === 1 ? "attempt" : "attempts"} left`,
      });
    }
    return res.status(400).json({ error: "Invalid or expired code" });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
