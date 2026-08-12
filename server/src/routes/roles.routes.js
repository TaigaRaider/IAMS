import { Router } from "express";
import { eq, desc, like, and, or } from "drizzle-orm";
import { db } from "../db.js";
import { roles, applications } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const roleRouter = Router();

roleRouter.get("/", async (req, res, next) => {
  const { search, department, status } = req.query ?? {};
  try {
    const conditions = [];
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      conditions.push(or(like(roles.title, term), like(roles.department, term)));
    }
    if (department && String(department).trim()) {
      conditions.push(eq(roles.department, String(department).trim()));
    }
    if (status && ["open", "closed"].includes(String(status))) {
      conditions.push(eq(roles.status, String(status)));
    }
    const query = db.select().from(roles);
    if (conditions.length) {
      query.where(and(...conditions));
    }
    const data = await query.orderBy(desc(roles.created_at)).all();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

roleRouter.post("/", verifyAuth, requireAdmin, async (req, res, next) => {
  const { title, department, description } = req.body ?? {};
  if (!title || !department) {
    return res.status(400).json({ error: "Title and department are required" });
  }
  try {
    const result = await db
      .insert(roles)
      .values({ title, department, status: "open", description: description ?? null })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    next(err);
  }
});

roleRouter.patch("/:id", verifyAuth, requireAdmin, async (req, res, next) => {
  const { title, department, description, status } = req.body ?? {};
  try {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Role not found" });
    }

    const updates = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      updates.title = title.trim();
    }
    if (department !== undefined) {
      if (typeof department !== "string" || !department.trim()) {
        return res.status(400).json({ error: "Department is required" });
      }
      updates.department = department.trim();
    }
    if (description !== undefined) {
      updates.description =
        description === null || description === ""
          ? null
          : String(description);
    }
    if (status !== undefined) {
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
      }
      updates.status = status;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    await db.update(roles).set(updates).where(eq(roles.id, existing.id)).run();
    res.json({ data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
});

// Deleting is blocked while any application still references the role — close
// the role instead.
roleRouter.delete("/:id", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const referenced = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.role_id, Number(req.params.id)))
      .limit(1)
      .get();
    if (referenced) {
      return res.status(409).json({
        error: "This role has applications. Close the role instead of deleting it.",
      });
    }
    const result = await db
      .delete(roles)
      .where(eq(roles.id, Number(req.params.id)))
      .run();
    if (compare(result.rowsAffected, 0)) {
      return res.status(404).json({ error: "Role not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

export { roleRouter };
