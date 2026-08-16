import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db.js";
import { applications, users, roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { sendMail } from "../utils/mailer.js";
import { applicationStatusEmail } from "../utils/email-templates.js";

const applicationRouter = Router();

const applicationSelect = {
  id: applications.id,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
  applicant_email: users.email,
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
      compare(req.user.role, "admin")
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
      compare(cause?.code, "SQLITE_CONSTRAINT_UNIQUE") ||
      compare(cause?.code, "SQLITE_CONSTRAINT") ||
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
    const existing = await db
      .select({
        id: applications.id,
        applicant_id: applications.applicant_id,
        applicant_name: users.full_name,
        applicant_email: users.email,
        role_title: roles.title,
      })
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(applications.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Application not found" });
    }
    await db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, Number(req.params.id)))
      .run();
    if (compare(status, "Hired")) {
      await db
        .update(users)
        .set({ user_role: "intern" })
        .where(eq(users.id, existing.applicant_id))
        .run();
    }
    notify(
      existing.applicant_id,
      "application",
      `Your application for ${existing.role_title} is now ${status}`,
    );
    void sendMail({
      to: existing.applicant_email,
      subject: `Application ${status} — ${existing.role_title}`,
      html: applicationStatusEmail({
        name: existing.applicant_name.split(" ")[0],
        roleTitle: existing.role_title,
        status,
      }),
    });
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

// Withdraw an application. Only the applicant, and only while it's still in
// review — once an application has advanced (Shortlisted+) the process owns
// it. Hard delete: interviews/offers can't exist before Shortlisting.
applicationRouter.delete("/:id", verifyAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select({
        id: applications.id,
        applicant_id: applications.applicant_id,
        status: applications.status,
        role_title: roles.title,
        applicant_name: users.full_name,
      })
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(applications.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "You can only withdraw your own application" });
    }
    if (!compare(existing.status, "In Review")) {
      return res.status(400).json({
        error: "This application has already advanced and can no longer be withdrawn",
      });
    }
    await db.delete(applications).where(eq(applications.id, existing.id)).run();
    notifyAdmins(
      "application",
      `${existing.applicant_name} withdrew their application for ${existing.role_title}`,
    );
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export { applicationRouter };
