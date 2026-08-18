import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { db } from "../db.js";
import { applications, users, roles } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { sendMail } from "../utils/mailer.js";
import { applicationStatusEmail } from "../utils/email-templates.js";
import { uploadResume, toUploadUrl, storedFilePath } from "../utils/upload.js";

const applicationRouter = Router();

const applicationSelect = {
  id: applications.id,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
  applicant_email: users.email,
  role_id: applications.role_id,
  role_title: roles.title,
  status: applications.status,
  applied_at: applications.applied_at,
  resume_path: applications.resume_path,
  resume_name: applications.resume_name,
  resume_url: applications.resume_path,
  applicant_phone: users.phone,
  applicant_location: users.location,
  applicant_nationality: users.nationality,
  applicant_dob: users.date_of_birth,
  applicant_education: users.education,
  applicant_experience: users.experience,
  applicant_skills: users.skills,
  biodata: users.cover_letter,
};

// White-listed biodata fields with sane length caps, trimmed.
const BIODATA_FIELDS = {
  phone: 30,
  location: 120,
  nationality: 60,
  date_of_birth: 30,
  education: 500,
  experience: 2000,
  skills: 500,
  cover_letter: 2000,
};

function pickBiodata(source = {}) {
  const biodata = {};
  for (const [key, max] of Object.entries(BIODATA_FIELDS)) {
    if (!(key in source)) continue;
    const value = typeof source[key] === "string" ? source[key].trim() : "";
    if (value.length > max) {
      const err = new Error(`${key} is too long (max ${max} characters)`);
      err.status = 400;
      throw err;
    }
    biodata[key] = value;
  }
  return biodata;
}

async function removeStoredFile(url) {
  const path = storedFilePath(url);
  if (!path) return;
  try {
    await unlink(path);
  } catch {
    // File already gone or never existed — nothing to clean up.
  }
}

applicationRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const query = db
      .select(applicationSelect)
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .orderBy(desc(applications.applied_at));

    const rows =
      compare(req.user.role, "admin")
        ? await query.all()
        : await query.where(eq(applications.applicant_id, req.user.sub)).all();

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Apply for a role. Multipart form: role_id + optional biodata fields +
// an optional resume file. The biodata is also saved onto the user record so
// the profile, intern listing and admin views all stay in sync.
applicationRouter.post("/", verifyAuth, uploadResume.single("resume"), async (req, res, next) => {
  const { role_id } = req.body ?? {};
  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }
  let biodata;
  try {
    biodata = pickBiodata(req.body);
  } catch (err) {
    return res.status(err.status ?? 400).json({ error: err.message });
  }
  try {
    const role = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, Number(role_id)))
      .get();
    if (!role) {
      if (req.file) await removeStoredFile(req.file.path);
      return res.status(404).json({ error: "Role not found" });
    }
    const resume_path = toUploadUrl(req.file);
    const resume_name = req.file?.originalname ?? null;
    const result = await db
      .insert(applications)
      .values({
        applicant_id: req.user.sub,
        role_id: Number(role_id),
        status: "In Review",
        resume_path,
        resume_name,
      })
      .run();
    if (Object.keys(biodata).length > 0) {
      await db.update(users).set(biodata).where(eq(users.id, Number(req.user.sub))).run();
    }
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    if (req.file) await removeStoredFile(req.file.path);
    const cause = err?.cause ?? err;
    if (
      compare(cause?.code, "SQLITE_CONSTRAINT_UNIQUE") ||
      compare(cause?.code, "SQLITE_CONSTRAINT") ||
      /UNIQUE constraint failed/i.test(cause?.message ?? "")
    ) {
      return res.status(409).json({ error: "Already applied to this role" });
    }
    next(err);
  }
});

// Applicant edits their own application: biodata fields plus an optional new
// resume (replaces the stored one). Not allowed once Rejected or Hired.
applicationRouter.patch("/:id", verifyAuth, uploadResume.single("resume"), async (req, res, next) => {
  let biodata;
  try {
    biodata = pickBiodata(req.body);
  } catch (err) {
    return res.status(err.status ?? 400).json({ error: err.message });
  }
  try {
    const existing = await db
      .select({
        id: applications.id,
        applicant_id: applications.applicant_id,
        status: applications.status,
        resume_path: applications.resume_path,
      })
      .from(applications)
      .where(eq(applications.id, Number(req.params.id)))
      .get();
    if (!existing) {
      if (req.file) await removeStoredFile(req.file.path);
      return res.status(404).json({ error: "Application not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      if (req.file) await removeStoredFile(req.file.path);
      return res.status(403).json({ error: "You can only edit your own application" });
    }
    if (compare(existing.status, "Rejected") || compare(existing.status, "Hired")) {
      if (req.file) await removeStoredFile(req.file.path);
      return res.status(400).json({
        error: "This application can no longer be edited",
      });
    }
    const updates = { resume_path: existing.resume_path, resume_name: existing.resume_name };
    if (req.file) {
      updates.resume_path = toUploadUrl(req.file);
      updates.resume_name = req.file.originalname;
    }
    await db.update(applications).set(updates).where(eq(applications.id, existing.id)).run();
    if (Object.keys(biodata).length > 0) {
      await db.update(users).set(biodata).where(eq(users.id, Number(existing.applicant_id))).run();
    }
    if (req.file) await removeStoredFile(existing.resume_path);
    res.json({ data: { id: existing.id } });
  } catch (err) {
    if (req.file) await removeStoredFile(req.file.path);
    next(err);
  }
});

applicationRouter.patch("/:id/status", verifyAuth, requireAdmin, async (req, res, next) => {
  const { status } = req.body ?? {};
  const valid = ["In Review", "Shortlisted", "Rejected", "Hired"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const existing = await db
      .select({
        id: applications.id,
        applicant_id: applications.applicant_id,
        applicant_name: users.full_name,
        applicant_email: users.email,
        role_title: roles.title,
      })
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(applications.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Application not found" });
    }
    await db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, Number(req.params.id)))
      .run();
    if (compare(status, "Hired")) {
      await db
        .update(users)
        .set({ user_role: "intern" })
        .where(eq(users.id, existing.applicant_id))
        .run();
    }
    notify(
      existing.applicant_id,
      "application",
      `Your application for ${existing.role_title} is now ${status}`,
    );
    void sendMail({
      to: existing.applicant_email,
      subject: `Application ${status} — ${existing.role_title}`,
      html: applicationStatusEmail({
        name: existing.applicant_name.split(" ")[0],
        roleTitle: existing.role_title,
        status,
      }),
    });
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) {
    next(err);
  }
});

// Withdraw an application. Only the applicant, and only while it's still in
// review — once an application has advanced (Shortlisted+) the process owns
// it. Hard delete: interviews/offers can't exist before Shortlisting.
applicationRouter.delete("/:id", verifyAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select({
        id: applications.id,
        applicant_id: applications.applicant_id,
        status: applications.status,
        resume_path: applications.resume_path,
        role_title: roles.title,
        applicant_name: users.full_name,
      })
      .from(applications)
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(applications.id, Number(req.params.id)))
      .get();
    if (!existing) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "You can only withdraw your own application" });
    }
    if (!compare(existing.status, "In Review")) {
      return res.status(400).json({
        error: "This application has already advanced and can no longer be withdrawn",
      });
    }
    await db.delete(applications).where(eq(applications.id, existing.id)).run();
    await removeStoredFile(existing.resume_path);
    notifyAdmins(
      "application",
      `${existing.applicant_name} withdrew their application for ${existing.role_title}`,
    );
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export { applicationRouter };
