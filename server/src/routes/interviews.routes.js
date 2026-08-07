import { Router } from "express";
import db from "../db.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const interviewRouter = Router();

interviewRouter.get("/", verifyAuth, (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `SELECT i.*, u.full_name AS applicant_name, r.title AS role_title
         FROM interviews i
         JOIN applications a ON a.id = i.application_id
         JOIN users u ON u.id = a.applicant_id
         JOIN roles r ON r.id = a.role_id
         ORDER BY i.scheduled_at`
      )
      .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

interviewRouter.post("/", verifyAuth, requireAdmin, (req, res, next) => {
  const { application_id, scheduled_at } = req.body ?? {};
  if (!application_id || !scheduled_at) {
    return res.status(400).json({ error: "application_id and scheduled_at are required" });
  }
  try {
    const application = db
      .prepare("SELECT id FROM applications WHERE id = ?")
      .get(application_id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    const result = db
      .prepare(
        "INSERT INTO interviews (application_id, scheduled_at, status) VALUES (?, ?, 'Pending')"
      )
      .run(application_id, scheduled_at);
    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

export { interviewRouter };
