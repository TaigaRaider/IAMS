import { Router } from "express";
import db from "../db.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const offerRouter = Router();

offerRouter.get("/", verifyAuth, (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `SELECT o.*, u.full_name AS applicant_name
         FROM offers o
         JOIN applications a ON a.id = o.application_id
         JOIN users u ON u.id = a.applicant_id`
      )
      .all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

offerRouter.post("/", verifyAuth, requireAdmin, (req, res, next) => {
  const { application_id } = req.body ?? {};
  if (!application_id) {
    return res.status(400).json({ error: "application_id is required" });
  }
  try {
    const application = db
      .prepare("SELECT id FROM applications WHERE id = ?")
      .get(application_id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    const result = db
      .prepare("INSERT INTO offers (application_id, status) VALUES (?, 'Extended')")
      .run(application_id);
    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Offer already exists for this application" });
    }
    next(err);
  }
});

export { offerRouter };
