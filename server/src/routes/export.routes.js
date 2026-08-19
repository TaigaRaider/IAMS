import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db } from "../db.js";
import { applications, roles, users, offers } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";

const exportRouter = Router();

function csvCell(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

async function applicantsRows() {
  return db
    .select({
      id: applications.id,
      applicant_name: users.full_name,
      applicant_email: users.email,
      applicant_phone: users.phone,
      applicant_location: users.location,
      role_title: roles.title,
      department: roles.department,
      status: applications.status,
      applied_at: applications.applied_at,
      resume_name: applications.resume_name,
    })
    .from(applications)
    .leftJoin(users, eq(users.id, applications.applicant_id))
    .leftJoin(roles, eq(roles.id, applications.role_id))
    .orderBy(sql`${applications.applied_at} DESC`)
    .all();
}

async function internsRows() {
  return db
    .select({
      id: users.id,
      full_name: users.full_name,
      email: users.email,
      username: users.username,
      phone: users.phone,
      location: users.location,
      nationality: users.nationality,
      education: users.education,
      skills: users.skills,
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
    .orderBy(sql`${applications.applied_at} DESC`)
    .all();
}

async function rolesRows() {
  return db
    .select({
      id: roles.id,
      title: roles.title,
      department: roles.department,
      description: roles.description,
      status: roles.status,
      created_at: roles.created_at,
      application_count: sql`(
        SELECT COUNT(*) FROM ${applications} WHERE ${applications.role_id} = ${roles.id}
      )`,
    })
    .from(roles)
    .orderBy(desc(roles.created_at))
    .all();
}

async function pipelineRows() {
  return db
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
}

const PIPELINE_STATUSES = ["In Review", "Shortlisted", "Rejected", "Hired"];

exportRouter.get("/:kind.csv", verifyAuth, requireAdmin, async (req, res, next) => {
  const { kind } = req.params;
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (kind === "applicants") {
      sendCsv(
        res,
        `applicants-${stamp}.csv`,
        toCsv(
          [
            "id",
            "applicant_name",
            "applicant_email",
            "applicant_phone",
            "applicant_location",
            "role_title",
            "department",
            "status",
            "applied_at",
            "resume_name",
          ],
          await applicantsRows(),
        ),
      );
      return;
    }
    if (kind === "interns") {
      sendCsv(
        res,
        `interns-${stamp}.csv`,
        toCsv(
          [
            "id",
            "full_name",
            "email",
            "username",
            "phone",
            "location",
            "nationality",
            "education",
            "skills",
            "role_title",
            "department",
            "hired_at",
            "offer_status",
          ],
          await internsRows(),
        ),
      );
      return;
    }
    if (kind === "roles") {
      sendCsv(
        res,
        `roles-${stamp}.csv`,
        toCsv(
          ["id", "title", "department", "description", "status", "created_at", "application_count"],
          await rolesRows(),
        ),
      );
      return;
    }
    if (kind === "pipeline") {
      const rows = await pipelineRows();
      const byRole = new Map();
      for (const r of rows) {
        if (!byRole.has(r.role_id)) {
          byRole.set(r.role_id, {
            role_title: r.role_title,
            department: r.department ?? "",
            statuses: {},
          });
        }
        byRole.get(r.role_id).statuses[r.status] = Number(r.count);
      }
      const flat = [...byRole.values()].map((r) => {
        const row = { role_title: r.role_title, department: r.department };
        let total = 0;
        for (const s of PIPELINE_STATUSES) {
          row[s] = r.statuses[s] ?? 0;
          total += row[s];
        }
        row.total = total;
        return row;
      });
      sendCsv(
        res,
        `pipeline-${stamp}.csv`,
        toCsv(["role_title", "department", ...PIPELINE_STATUSES, "total"], flat),
      );
      return;
    }
    res.status(404).json({ error: "Unknown export" });
  } catch (err) {
    next(err);
  }
});

// PDF export of the per-role pipeline report.
exportRouter.get("/pipeline.pdf", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const rows = await pipelineRows();
    const byRole = new Map();
    for (const r of rows) {
      if (!byRole.has(r.role_id)) {
        byRole.set(r.role_id, {
          role_title: r.role_title,
          department: r.department ?? "",
          statuses: {},
        });
      }
      byRole.get(r.role_id).statuses[r.status] = Number(r.count);
    }
    const rolesArr = [...byRole.values()];

    const doc = new PDFDocument({ margin: 48, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pipeline-${new Date().toISOString().slice(0, 10)}.pdf"`,
    );
    doc.pipe(res);

    doc
      .fontSize(20)
      .fillColor("#1e293b")
      .text("IAMS — Pipeline by Role", { align: "center" });
    doc
      .moveDown(0.4)
      .fontSize(10)
      .fillColor("#64748b")
      .text(`Generated ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.2);

    const tableTop = doc.y;
    const colX = [48, 160, 260, 330, 400, 470, 540];
    const header = ["Role", "Department", ...PIPELINE_STATUSES, "Total"];
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
    doc.rect(48, tableTop, 500, 22).fill("#4f46e5");
    header.forEach((h, i) => doc.text(h, colX[i], tableTop + 6, { width: 100 }));
    doc.moveDown(1);
    doc.font("Helvetica").fontSize(10);

    let y = doc.y;
    for (const r of rolesArr) {
      if (y > 720) {
        doc.addPage();
        y = doc.y;
      }
      const cells = [r.role_title, r.department];
      let total = 0;
      for (const s of PIPELINE_STATUSES) {
        const n = r.statuses[s] ?? 0;
        cells.push(String(n));
        total += n;
      }
      cells.push(String(total));
      doc.fillColor("#1e293b");
      cells.forEach((c, i) => doc.text(c, colX[i], y, { width: 100 }));
      doc.moveDown(0.6);
      y = doc.y;
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

export { exportRouter };