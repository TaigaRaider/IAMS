import { Router } from "express";
import db from "../db.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.get("/stats", verifyAuth, requireAdmin, (req, res, next) => {
  try {
    const totalApplications = db
      .prepare("SELECT COUNT(*) AS count FROM applications")
      .get().count;
    const openRoles = db
      .prepare("SELECT COUNT(*) AS count FROM roles WHERE status = 'open'")
      .get().count;
    const pendingInterviews = db
      .prepare("SELECT COUNT(*) AS count FROM interviews WHERE status = 'Pending'")
      .get().count;
    const offersExtended = db.prepare("SELECT COUNT(*) AS count FROM offers").get().count;
    const applicationsByDepartment = db
      .prepare(
        `SELECT r.department, COUNT(a.id) AS count
         FROM applications a
         JOIN roles r ON r.id = a.role_id
         GROUP BY r.department`
      )
      .all();
    res.json({
      data: {
        totalApplications,
        openRoles,
        pendingInterviews,
        offersExtended,
        applicationsByDepartment,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { dashboardRouter };
