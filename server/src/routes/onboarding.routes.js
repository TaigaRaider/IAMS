import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { onboardingSteps, users } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const onboardingRouter = Router();

// The default checklist every intern starts with. The API merges this with
// the rows actually stored per user, so new steps appear without a migration
// and stale rows never leak into the list.
export const DEFAULT_ONBOARDING_STEPS = [
  { key: "submit_documents", label: "Submit required documents" },
  { key: "complete_forms", label: "Complete onboarding forms" },
  { key: "work_email", label: "Set up work email & accounts" },
  { key: "handbook", label: "Review employee handbook" },
  { key: "meet_team", label: "Meet your team & mentor" },
];

function mergeWithDefaults(rows) {
  const stored = new Map(rows.map((r) => [r.step_key, r]));
  return DEFAULT_ONBOARDING_STEPS.map((step) => {
    const row = stored.get(step.key);
    return {
      step_key: step.key,
      label: row?.label ?? step.label,
      done: row ? Boolean(row.done) : false,
      updated_at: row?.updated_at ?? null,
    };
  });
}

// GET /api/onboarding — the signed-in user's onboarding checklist.
// Admins may pass ?user_id= to inspect a specific intern's progress.
onboardingRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const isAdmin = compare(req.user.role, "admin");
    const targetId = req.query.user_id
      ? Number(req.query.user_id)
      : Number(req.user.sub);
    if (!isAdmin && !compare(targetId, Number(req.user.sub))) {
      return res.status(403).json({ error: "You can only view your own onboarding" });
    }
    const rows = await db
      .select({
        step_key: onboardingSteps.step_key,
        label: onboardingSteps.label,
        done: onboardingSteps.done,
        updated_at: onboardingSteps.updated_at,
      })
      .from(onboardingSteps)
      .where(eq(onboardingSteps.user_id, targetId))
      .all();
    const steps = mergeWithDefaults(rows);
    const done = steps.filter((s) => s.done).length;
    res.json({
      data: {
        user_id: targetId,
        steps,
        done,
        total: steps.length,
        progress: steps.length ? Math.round((done / steps.length) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/onboarding/:stepKey — toggle a step. The owner, or an admin
// acting on behalf of an intern (pass user_id in the body), can update it.
onboardingRouter.patch("/:stepKey", verifyAuth, async (req, res, next) => {
  const { stepKey } = req.params;
  const { done, user_id } = req.body ?? {};
  if (!stepKey) {
    return res.status(400).json({ error: "Step key is required" });
  }
  if (!["done", "pending"].includes(String(done ?? "").toLowerCase()) && typeof done !== "boolean") {
    return res.status(400).json({ error: "done must be true or false" });
  }
  const step = DEFAULT_ONBOARDING_STEPS.find((s) => s.key === stepKey);
  if (!step) {
    return res.status(404).json({ error: "Unknown onboarding step" });
  }
  try {
    const isAdmin = compare(req.user.role, "admin");
    const targetId =
      isAdmin && user_id != null ? Number(user_id) : Number(req.user.sub);
    if (!isAdmin && !compare(targetId, Number(req.user.sub))) {
      return res.status(403).json({ error: "You can only update your own onboarding" });
    }
    const doneValue = typeof done === "boolean" ? (done ? 1 : 0) : compare(done, "done") ? 1 : 0;
    const existing = await db
      .select({ id: onboardingSteps.id })
      .from(onboardingSteps)
      .where(
        and(
          eq(onboardingSteps.user_id, targetId),
          eq(onboardingSteps.step_key, stepKey),
        ),
      )
      .get();
    if (existing) {
      await db
        .update(onboardingSteps)
        .set({ done: doneValue, updated_at: sql`(datetime('now'))` })
        .where(eq(onboardingSteps.id, existing.id))
        .run();
    } else {
      await db
        .insert(onboardingSteps)
        .values({ user_id: targetId, step_key: stepKey, label: step.label, done: doneValue })
        .run();
    }
    res.json({ data: { user_id: targetId, step_key: stepKey, done: Boolean(doneValue) } });
  } catch (err) {
    next(err);
  }
});

export { onboardingRouter };
