import { createHash, randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { authTokens } from "../db/schema.js";

export const CODE_TTL_MS = 30 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

const hashCode = (code) => createHash("sha256").update(String(code)).digest("hex");

const nowIso = () => new Date().toISOString();

export function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Issue a fresh single-use code for (user, kind). Any previous code of the
 * same kind is invalidated (deleted) first.
 */
export async function issueCode(db, userId, kind) {
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.user_id, userId), eq(authTokens.kind, kind)))
    .run();
  const code = generateCode();
  await db
    .insert(authTokens)
    .values({
      user_id: userId,
      kind,
      token_hash: hashCode(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    .run();
  return code;
}

/** Milliseconds until the last code of this kind was issued (0 when never / already used). */
export async function cooldownRemaining(db, userId, kind) {
  const tok = await db
    .select({ created_at: authTokens.created_at })
    .from(authTokens)
    .where(and(eq(authTokens.user_id, userId), eq(authTokens.kind, kind)))
    .orderBy(desc(authTokens.id))
    .get();
  if (!tok?.created_at) return 0;
  const createdMs = Date.parse(tok.created_at.replace(" ", "T") + "Z");
  const elapsed = Date.now() - createdMs;
  return Math.max(0, RESEND_COOLDOWN_MS - elapsed);
}

/**
 * Consume a code. Returns one of:
 *  { ok: true }                          — matched, marked used
 *  { ok: false, reason: "invalid" }      — no active code found
 *  { ok: false, reason: "expired" }      — code found but past its TTL
 *  { ok: false, reason: "attempts", left } — wrong code, N tries left (0 => invalidated)
 *  { ok: false, reason: "code", left }   — wrong code attempt recorded
 */
export async function consumeCode(db, userId, kind, code) {
  const tok = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.user_id, userId), eq(authTokens.kind, kind)))
    .orderBy(desc(authTokens.id))
    .get();

  if (!tok || tok.used_at) return { ok: false, reason: "invalid" };
  if (new Date(tok.expires_at).getTime() < Date.now()) {
    await db.update(authTokens).set({ used_at: nowIso() }).where(eq(authTokens.id, tok.id)).run();
    return { ok: false, reason: "expired" };
  }
  if (hashCode(code) !== tok.token_hash) {
    const attempts = Number(tok.attempts) + 1;
    const left = Math.max(0, MAX_CODE_ATTEMPTS - attempts);
    await db.update(authTokens).set({ attempts }).where(eq(authTokens.id, tok.id)).run();
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await db.update(authTokens).set({ used_at: nowIso() }).where(eq(authTokens.id, tok.id)).run();
    }
    return { ok: false, reason: "code", left };
  }

  await db.update(authTokens).set({ used_at: nowIso() }).where(eq(authTokens.id, tok.id)).run();
  return { ok: true };
}