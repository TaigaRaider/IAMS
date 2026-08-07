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
  applicant_name: users.full_name,
};

offerRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select(offerSelect)
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
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
    const cause = err?.cause ?? err;
    if (
      cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      cause?.code === "SQLITE_CONSTRAINT" ||
      /UNIQUE constraint failed/i.test(cause?.message ?? "")
    ) {
      return res.status(409).json({ error: "Offer already exists for this application" });
    }
    next(err);
  }
});

export { offerRouter };
