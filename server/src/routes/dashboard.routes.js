import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { applications, roles, interviews, offers } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

async function countRows(query) {
  return (await query.get())?.count ?? 0;
}

dashboardRouter.get("/stats", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const [totalApplications, openRoles, pendingInterviews, offersExtended, applicationsByDepartment] =
      await Promise.all([
        countRows(db.select({ count: sql`COUNT(*)` }).from(applications)),
        countRows(
          db.select({ count: sql`COUNT(*)` }).from(roles).where(eq(roles.status, "open")),
        ),
        countRows(
          db
            .select({ count: sql`COUNT(*)` })
            .from(interviews)
            .where(eq(interviews.status, "Pending")),
        ),
        countRows(db.select({ count: sql`COUNT(*)` }).from(offers)),
        db
          .select({
            department: roles.department,
            count: sql`COUNT(${applications.id})`,
          })
          .from(applications)
          .leftJoin(roles, eq(roles.id, applications.role_id))
          .groupBy(roles.department)
          .all(),
      ]);

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
