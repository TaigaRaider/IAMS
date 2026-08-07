import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db.js";
import { applications, users, roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const applicationRouter = Router();

const applicationSelect = {
  id: applications.id,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
  role_id: applications.role_id,
  role_title: roles.title,
  status: applications.status,
  applied_at: applications.applied_at,
};

applicationRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const query = db
      .select(applicationSelect)
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .orderBy(desc(applications.applied_at));

    const rows =
      req.user.role === "admin"
        ? await query.all()
        : await query.where(eq(applications.applicant_id, req.user.sub)).all();

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

applicationRouter.post("/", verifyAuth, async (req, res, next) => {
  const { role_id } = req.body ?? {};
  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }
  try {
    const role = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, Number(role_id)))
      .get();
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    const result = await db
      .insert(applications)
      .values({ applicant_id: req.user.sub, role_id: Number(role_id), status: "In Review" })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    const cause = err?.cause ?? err;
    if (
      cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      cause?.code === "SQLITE_CONSTRAINT" ||
      /UNIQUE constraint failed/i.test(cause?.message ?? "")
    ) {
      return res.status(409).json({ error: "Already applied to this role" });
    }
    next(err);
  }
});

applicationRouter.patch("/:id/status", verifyAuth, requireAdmin, async (req, res, next) => {
  const { status } = req.body ?? {};
  const valid = ["In Review", "Shortlisted", "Rejected", "Hired"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const result = await db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, Number(req.params.id)))
      .run();
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

export { applicationRouter };
