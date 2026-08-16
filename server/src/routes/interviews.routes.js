import { Router } from "express";
import { and, eq, asc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "../db.js";
import { interviews, applications, users, roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { notify } from "../utils/notify.js";
import { sendMail } from "../utils/mailer.js";
import { interviewEmail } from "../utils/email-templates.js";

const interviewRouter = Router();

const interviewers = alias(users, "interviewers");

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

const interviewSelect = {
  id: interviews.id,
  application_id: interviews.application_id,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
  role_title: roles.title,
  scheduled_at: interviews.scheduled_at,
  status: interviews.status,
  interviewer_id: interviews.interviewer_id,
  interviewer_name: interviewers.full_name,
};

// GET /api/interviews — admin sees all; everyone else sees only their own
interviewRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const query = db
      .select(interviewSelect)
      .from(interviews)
      .leftJoin(applications, eq(applications.id, interviews.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .leftJoin(interviewers, eq(interviewers.id, interviews.interviewer_id))
      .orderBy(asc(interviews.scheduled_at));

    const rows = compare(req.user.role, "admin")
      ? await query.all()
      : await query.where(eq(applications.applicant_id, req.user.sub)).all();

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/interviews/interviewers — admin: candidate list for assignment
interviewRouter.get("/interviewers", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        user_role: users.user_role,
      })
      .from(users)
      .orderBy(asc(users.full_name))
      .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews — applicant requests an interview on their application;
// an admin may also create one on behalf of any applicant.
interviewRouter.post("/", verifyAuth, async (req, res, next) => {
  const { application_id, scheduled_at } = req.body ?? {};
  if (!application_id || !scheduled_at) {
    return res.status(400).json({ error: "application_id and scheduled_at are required" });
  }

  const applicationId = Number(application_id);

  try {
    const application = await db
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
      .where(eq(applications.id, applicationId))
      .get();
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    const isAdmin = compare(req.user.role, "admin");
    const isOwner = compare(Number(application.applicant_id), Number(req.user.sub));
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You can only request an interview for your own application" });
    }

    const existing = await db
      .select({ id: interviews.id })
      .from(interviews)
      .where(
        and(
          eq(interviews.application_id, applicationId),
          inArray(interviews.status, ACTIVE_STATUSES),
        ),
      )
      .get();
    if (existing) {
      return res.status(409).json({ error: "An active interview request already exists for this application" });
    }

    const result = await db
      .insert(interviews)
      .values({
        application_id: applicationId,
        scheduled_at,
        status: "Pending",
      })
      .run();
    notify(
      application.applicant_id,
      "interview",
      `An interview for ${application.role_title} has been scheduled for ${scheduled_at}`,
    );
    void sendMail({
      to: application.applicant_email,
      subject: `Interview scheduled — ${application.role_title}`,
      html: interviewEmail({
        name: application.applicant_name.split(" ")[0],
        roleTitle: application.role_title,
        scheduledAt: scheduled_at,
        status: "Pending",
      }),
    });
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interviews/:id/status — admin confirms availability / completes / cancels
interviewRouter.patch("/:id/status", verifyAuth, requireAdmin, async (req, res, next) => {
  const { status } = req.body ?? {};
  if (!["Pending", "Confirmed", "Done", "Cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid interview status" });
  }
  try {
    const existing = await db
      .select({
        id: interviews.id,
        applicant_id: applications.applicant_id,
        applicant_name: users.full_name,
        applicant_email: users.email,
        role_title: roles.title,
        scheduled_at: interviews.scheduled_at,
      })
      .from(interviews)
      .leftJoin(applications, eq(applications.id, interviews.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(interviews.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Interview not found" });
    }
    await db
      .update(interviews)
      .set({ status })
      .where(eq(interviews.id, Number(req.params.id)))
      .run();
    notify(
      existing.applicant_id,
      "interview",
      `Your interview for ${existing.role_title} is now ${status}`,
    );
    void sendMail({
      to: existing.applicant_email,
      subject: `Interview ${status} — ${existing.role_title}`,
      html: interviewEmail({
        name: existing.applicant_name.split(" ")[0],
        roleTitle: existing.role_title,
        scheduledAt: existing.scheduled_at,
        status,
      }),
    });
    res.json({ data: { id: Number(req.params.id), status } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interviews/:id/interviewer — admin assigns (or clears) an interviewer
interviewRouter.patch("/:id/interviewer", verifyAuth, requireAdmin, async (req, res, next) => {
  const { interviewer_id } = req.body ?? {};
  const interviewId = Number(req.params.id);

  try {
    const existing = await db
      .select({ id: interviews.id })
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Interview not found" });
    }

    let interviewerId = null;
    if (interviewer_id !== null && interviewer_id !== undefined && interviewer_id !== "") {
      interviewerId = Number(interviewer_id);
      const interviewer = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, interviewerId))
        .get();
      if (!interviewer) {
        return res.status(404).json({ error: "Interviewer not found" });
      }
    }

    const result = await db
      .update(interviews)
      .set({ interviewer_id: interviewerId })
      .where(eq(interviews.id, interviewId))
      .run();
    if (compare(result.rowsAffected, 0)) {
      return res.status(404).json({ error: "Interview not found" });
    }
    res.json({ data: { id: interviewId, interviewer_id: interviewerId } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interviews/:id — applicant may cancel their own pending request
interviewRouter.patch("/:id", verifyAuth, async (req, res, next) => {
  const { status } = req.body ?? {};
  if (!["Cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid interview status" });
  }
  try {
    const existing = await db
      .select({
        id: interviews.id,
        applicant_id: applications.applicant_id,
        status: interviews.status,
      })
      .from(interviews)
      .leftJoin(applications, eq(applications.id, interviews.application_id))
      .where(eq(interviews.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Interview not found" });
    }
    const isAdmin = compare(req.user.role, "admin");
    const isOwner = compare(Number(existing.applicant_id), Number(req.user.sub));
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Not your interview" });
    }
    if (compare(existing.status, "Done")) {
      return res.status(400).json({ error: "A completed interview cannot be cancelled" });
    }
    await db
      .update(interviews)
      .set({ status: "Cancelled" })
      .where(eq(interviews.id, Number(req.params.id)))
      .run();
    res.json({ data: { id: Number(req.params.id), status: "Cancelled" } });
  } catch (err) {
    next(err);
  }
});

export { interviewRouter };
