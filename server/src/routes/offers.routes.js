import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { offers, applications, users } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const offerRouter = Router();

const offerSelect = {
  id: offers.id,
  application_id: offers.application_id,
  status: offers.status,
  created_at: offers.created_at,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
};

async function promoteToIntern(userId) {
  await db
    .update(users)
    .set({ user_role: "intern" })
    .where(eq(users.id, userId))
    .run();
}

function isUniqueViolation(err) {
  const cause = err?.cause ?? err;
  return (
    cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    cause?.code === "SQLITE_CONSTRAINT" ||
    /UNIQUE constraint failed/i.test(cause?.message ?? "")
  );
}

offerRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const query = db
      .select(offerSelect)
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id));
    const rows =
      req.user.role === "admin"
        ? await query.all()
        : await query
            .where(eq(applications.applicant_id, req.user.sub))
            .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

offerRouter.post("/", verifyAuth, requireAdmin, async (req, res, next) => {
  const { application_id } = req.body ?? {};
  if (!application_id) {
    return res.status(400).json({ error: "application_id is required" });
  }
  try {
    const application = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, Number(application_id)))
      .get();
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    const result = await db
      .insert(offers)
      .values({ application_id: Number(application_id), status: "Extended" })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Offer already exists for this application" });
    }
    next(err);
  }
});

// Applicant accepts the offer for their own application
offerRouter.post("/:id/accept", verifyAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select({
        id: offers.id,
        status: offers.status,
        applicant_id: applications.applicant_id,
      })
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .where(eq(offers.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (Number(existing.applicant_id) !== Number(req.user.sub)) {
      return res.status(403).json({ error: "This offer is not yours to accept" });
    }
    await db
      .update(offers)
      .set({ status: "Accepted" })
      .where(eq(offers.id, existing.id))
      .run();
    await promoteToIntern(existing.applicant_id);
    res.json({ data: { id: existing.id, status: "Accepted" } });
  } catch (err) {
    next(err);
  }
});

// PATCH status — admin (e.g. mark accepted/declined); accepting promotes the
// applicant to intern
offerRouter.patch("/:id/status", verifyAuth, requireAdmin, async (req, res, next) => {
  const { status } = req.body ?? {};
  if (!["Extended", "Accepted", "Declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid offer status" });
  }
  try {
    const existing = await db
      .select({
        id: offers.id,
        applicant_id: applications.applicant_id,
      })
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .where(eq(offers.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    await db
      .update(offers)
      .set({ status })
      .where(eq(offers.id, existing.id))
      .run();
    if (status === "Accepted") {
      await promoteToIntern(existing.applicant_id);
    }
    res.json({ data: { id: existing.id, status } });
  } catch (err) {
    next(err);
  }
});

export { offerRouter };