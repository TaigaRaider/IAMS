import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  applications,
  roles,
  offers,
  internTasks,
  onboardingSteps,
} from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { notify } from "../utils/notify.js";
import { sendMail } from "../utils/mailer.js";
import { taskEmail } from "../utils/email-templates.js";
import { DEFAULT_ONBOARDING_STEPS } from "./onboarding.routes.js";

const internRouter = Router();

// GET /api/interns — admin: interns + their hired role + task progress
internRouter.get("/interns", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        email: users.email,
        username: users.username,
        phone: users.phone,
        location: users.location,
        nationality: users.nationality,
        date_of_birth: users.date_of_birth,
        education: users.education,
        experience: users.experience,
        skills: users.skills,
        resume_path: applications.resume_path,
        resume_name: applications.resume_name,
        resume_url: applications.resume_path,
        role_title: roles.title,
        department: roles.department,
        hired_at: applications.applied_at,
        offer_status: offers.status,
      })
      .from(users)
      .leftJoin(
        applications,
        sql`${applications.applicant_id} = ${users.id} AND ${applications.status} = ${"Hired"}`,
      )
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .leftJoin(offers, eq(offers.application_id, applications.id))
      .where(eq(users.user_role, "intern"))
      .orderBy(desc(applications.applied_at))
      .all();

    const internIds = rows.map((r) => r.id);
    let taskCounts = [];
    if (internIds.length > 0) {
      taskCounts = await db
        .select({
          intern_id: internTasks.intern_id,
          total: sql`COUNT(*)`,
          done: sql`SUM(CASE WHEN ${internTasks.status} = ${"done"} THEN 1 ELSE 0 END)`,
        })
        .from(internTasks)
        .where(sql`${internTasks.intern_id} IN (${sql.join(internIds, sql`, `)})`)
        .groupBy(internTasks.intern_id)
        .all();
    }
    const countMap = new Map(taskCounts.map((t) => [Number(t.intern_id), t]));

    let onboardingCounts = [];
    if (internIds.length > 0) {
      onboardingCounts = await db
        .select({
          user_id: onboardingSteps.user_id,
          done: sql`SUM(CASE WHEN ${onboardingSteps.done} = ${1} THEN 1 ELSE 0 END)`,
        })
        .from(onboardingSteps)
        .where(sql`${onboardingSteps.user_id} IN (${sql.join(internIds, sql`, `)})`)
        .groupBy(onboardingSteps.user_id)
        .all();
    }
    const onboardingMap = new Map(
      onboardingCounts.map((o) => [Number(o.user_id), Number(o.done)]),
    );

    const data = rows.map((r) => {
      const c = countMap.get(r.id) ?? { total: 0, done: 0 };
      const total = Number(c.total);
      const done = Number(c.done);
      const onboardingTotal = DEFAULT_ONBOARDING_STEPS.length;
      const onboardingDone = onboardingMap.get(r.id) ?? 0;
      return {
        ...r,
        tasks_total: total,
        tasks_done: done,
        progress: total ? Math.round((done / total) * 100) : 0,
        onboarding_total: onboardingTotal,
        onboarding_done: onboardingDone,
        onboarding_progress: onboardingTotal
          ? Math.round((onboardingDone / onboardingTotal) * 100)
          : 0,
      };
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/interns/tasks — admin: all tasks; intern: own tasks
internRouter.get("/interns/tasks", verifyAuth, async (req, res, next) => {
  try {
    const isAdmin = compare(req.user.role, "admin");
    if (isAdmin) {
      const internId = Number(req.query.intern_id) || null;
      const query = db
        .select({
          id: internTasks.id,
          intern_id: internTasks.intern_id,
          intern_name: users.full_name,
          title: internTasks.title,
          description: internTasks.description,
          status: internTasks.status,
          due_date: internTasks.due_date,
          created_at: internTasks.created_at,
        })
        .from(internTasks)
        .leftJoin(users, eq(users.id, internTasks.intern_id))
        .orderBy(desc(internTasks.created_at));
      const rows = internId
        ? await query.where(eq(internTasks.intern_id, internId)).all()
        : await query.all();
      return res.json({ data: rows });
    }

    const rows = await db
      .select({
        id: internTasks.id,
        intern_id: internTasks.intern_id,
        intern_name: users.full_name,
        title: internTasks.title,
        description: internTasks.description,
        status: internTasks.status,
        due_date: internTasks.due_date,
        created_at: internTasks.created_at,
      })
      .from(internTasks)
      .leftJoin(users, eq(users.id, internTasks.intern_id))
      .where(eq(internTasks.intern_id, Number(req.user.sub)))
      .orderBy(desc(internTasks.created_at))
      .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/interns/tasks — admin only
internRouter.post("/interns/tasks", verifyAuth, requireAdmin, async (req, res, next) => {
  const { intern_id, title, description, due_date, status } = req.body ?? {};
  if (!intern_id || !title) {
    return res.status(400).json({ error: "intern_id and title are required" });
  }
  const taskStatus = status ?? "pending";
  if (!["pending", "in_progress", "done"].includes(taskStatus)) {
    return res.status(400).json({ error: "Invalid task status" });
  }
  try {
    const user = await db
      .select({ id: users.id, full_name: users.full_name, email: users.email })
      .from(users)
      .where(eq(users.id, Number(intern_id)))
      .get();
    if (!user) {
      return res.status(404).json({ error: "Intern not found" });
    }
    const result = await db
      .insert(internTasks)
      .values({
        intern_id: Number(intern_id),
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 2000) : null,
        due_date: due_date ?? null,
        status: taskStatus,
      })
      .run();
    notify(user.id, "task", `You've been assigned a new task: ${String(title).slice(0, 200)}`);
    void sendMail({
      to: user.email,
      subject: "New task assigned to you",
      html: taskEmail({
        name: user.full_name.split(" ")[0],
        title: String(title).slice(0, 200),
        dueDate: due_date ?? null,
      }),
    });
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interns/tasks/:id — task status/description; admin or task owner
internRouter.patch("/interns/tasks/:id", verifyAuth, async (req, res, next) => {
  const { title, description, due_date, status } = req.body ?? {};
  if (!["pending", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ error: "Invalid task status" });
  }
  try {
    const existing = await db
      .select({ intern_id: internTasks.intern_id })
      .from(internTasks)
      .where(eq(internTasks.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }
    const isAdmin = compare(req.user.role, "admin");
    const isOwner = compare(Number(existing.intern_id), Number(req.user.sub));
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Not your task" });
    }
    const result = await db
      .update(internTasks)
      .set({
        title: title !== undefined ? String(title).slice(0, 200) : undefined,
        description:
          description !== undefined ? String(description).slice(0, 2000) : undefined,
        due_date: due_date !== undefined ? due_date : undefined,
        status,
      })
      .where(eq(internTasks.id, Number(req.params.id)))
      .run();
    if (compare(result.rowsAffected, 0)) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interns/tasks/:id — admin only
internRouter.delete("/interns/tasks/:id", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await db
      .delete(internTasks)
      .where(eq(internTasks.id, Number(req.params.id)))
      .run();
    if (compare(result.rowsAffected, 0)) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interns/users/:id/role — admin: change a user's role (e.g. make an admin)
internRouter.patch("/interns/users/:id/role", verifyAuth, requireAdmin, async (req, res, next) => {
  const { role } = req.body ?? {};
  if (!["admin", "applicant", "intern"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const targetId = Number(req.params.id);
  if (compare(targetId, Number(req.user.sub))) {
    return res.status(400).json({ error: "You cannot change your own role" });
  }
  try {
    const result = await db
      .update(users)
      .set({ user_role: role })
      .where(eq(users.id, targetId))
      .run();
    if (compare(result.rowsAffected, 0)) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ data: { id: targetId, role } });
  } catch (err) {
    next(err);
  }
});

export { internRouter };