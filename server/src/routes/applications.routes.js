import { Router } from "express";
import db from "../db.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const applicationRouter = Router();

const LIST_SQL = `
  SELECT a.*, u.full_name AS applicant_name, r.title AS role_title
  FROM applications a
  JOIN users u ON u.id = a.applicant_id
  JOIN roles r ON r.id = a.role_id
`;

applicationRouter.get("/", verifyAuth, (req, res, next) => {
  try {
    const rows =
      req.user.role === "admin"
        ? db.prepare(`${LIST_SQL} ORDER BY a.applied_at DESC`).all()
        : db
            .prepare(`${LIST_SQL} WHERE a.applicant_id = ? ORDER BY a.applied_at DESC`)
            .all(req.user.sub);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

applicationRouter.post("/", verifyAuth, (req, res, next) => {
  const { role_id } = req.body ?? {};
  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }
  try {
    const role = db.prepare("SELECT id FROM roles WHERE id = ?").get(role_id);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }
    const result = db
      .prepare(
        "INSERT INTO applications (applicant_id, role_id, status) VALUES (?, ?, 'In Review')"
      )
      .run(req.user.sub, role_id);
    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Already applied to this role" });
    }
    next(err);
  }
});

applicationRouter.patch("/:id/status", verifyAuth, requireAdmin, (req, res, next) => {
  const { status } = req.body ?? {};
  const valid = ["In Review", "Shortlisted", "Rejected", "Hired"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const result = db
      .prepare("UPDATE applications SET status = ? WHERE id = ?")
      .run(status, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

export { applicationRouter };
