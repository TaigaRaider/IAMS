import { Router } from "express";
import db from "../db.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const roleRouter = Router();

roleRouter.get("/", (req, res, next) => {
  try {
    const roles = db.prepare("SELECT * FROM roles ORDER BY created_at DESC").all();
    res.json({ data: roles });
  } catch (err) {
    next(err);
  }
});

roleRouter.post("/", verifyAuth, requireAdmin, (req, res, next) => {
  const { title, department, description } = req.body ?? {};
  if (!title || !department) {
    return res.status(400).json({ error: "Title and department are required" });
  }
  try {
    const result = db
      .prepare(
        "INSERT INTO roles (title, department, status, description) VALUES (?, ?, 'open', ?)"
      )
      .run(title, department, description ?? null);
    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

roleRouter.patch("/:id", verifyAuth, requireAdmin, (req, res, next) => {
  const { status } = req.body ?? {};
  if (status !== "open" && status !== "closed") {
    return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
  }
  try {
    const result = db
      .prepare("UPDATE roles SET status = ? WHERE id = ?")
      .run(status, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Role not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

export { roleRouter };
