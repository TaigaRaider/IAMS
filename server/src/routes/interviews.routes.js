import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../db.js";
import { interviews, applications, users, roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const interviewRouter = Router();

const interviewSelect = {
  id: interviews.id,
  application_id: interviews.application_id,
  scheduled_at: interviews.scheduled_at,
  status: interviews.status,
  applicant_name: users.full_name,
  role_title: roles.title,
};

interviewRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select(interviewSelect)
      .from(interviews)
      .leftJoin(applications, eq(applications.id, interviews.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .orderBy(asc(interviews.scheduled_at))
      .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

interviewRouter.post("/", verifyAuth, requireAdmin, async (req, res, next) => {
  const { application_id, scheduled_at } = req.body ?? {};
  if (!application_id || !scheduled_at) {
    return res.status(400).json({ error: "application_id and scheduled_at are required" });
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
      .insert(interviews)
      .values({
        application_id: Number(application_id),
        scheduled_at,
        status: "Pending",
      })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    next(err);
  }
});

export { interviewRouter };
