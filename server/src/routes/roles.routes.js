import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db.js";
import { roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const roleRouter = Router();

roleRouter.get("/", async (req, res, next) => {
  try {
    const data = await db.select().from(roles).orderBy(desc(roles.created_at)).all();
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
  const { status } = req.body ?? {};
  if (!compare(status, "open") && !compare(status, "closed")) {
    return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
  }
  try {
    const result = await db
      .update(roles)
      .set({ status })
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
