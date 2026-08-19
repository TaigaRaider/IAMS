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

dashboardRouter.get("/pipeline", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        role_id: roles.id,
        role_title: roles.title,
        department: roles.department,
        status: applications.status,
        count: sql`COUNT(${applications.id})`,
      })
      .from(applications)
      .innerJoin(roles, eq(roles.id, applications.role_id))
      .groupBy(roles.id, roles.title, roles.department, applications.status)
      .orderBy(roles.title, applications.status)
      .all();

    const byRole = new Map();
    for (const r of rows) {
      if (!byRole.has(r.role_id)) {
        byRole.set(r.role_id, {
          role_id: r.role_id,
          role_title: r.role_title,
          department: r.department ?? "",
          total: 0,
          statuses: {},
        });
      }
      const entry = byRole.get(r.role_id);
      entry.statuses[r.status] = Number(r.count);
      entry.total += Number(r.count);
    }

    res.json({ data: { roles: [...byRole.values()] } });
  } catch (err) {
    next(err);
  }
});

export { dashboardRouter };
