import { Router } from "express";
import { eq, and, notInArray, inArray, desc } from "drizzle-orm";
import { db } from "../db.js";
import {
  offers,
  applications,
  users,
  roles,
  offerRevisions,
  offerMessages,
} from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { sendMail } from "../utils/mailer.js";
import { offerEmail } from "../utils/email-templates.js";

const offerRouter = Router();

const offerSelect = {
  id: offers.id,
  application_id: offers.application_id,
  status: offers.status,
  current_revision_id: offers.current_revision_id,
  created_at: offers.created_at,
  applicant_id: applications.applicant_id,
  applicant_name: users.full_name,
  applicant_email: users.email,
  role_title: roles.title,
};

const revisionSelect = {
  id: offerRevisions.id,
  offer_id: offerRevisions.offer_id,
  version: offerRevisions.version,
  kind: offerRevisions.kind,
  role_id: offerRevisions.role_id,
  role_title: roles.title,
  position_title: offerRevisions.position_title,
  compensation: offerRevisions.compensation,
  duration: offerRevisions.duration,
  start_date: offerRevisions.start_date,
  narration: offerRevisions.narration,
  terms: offerRevisions.terms,
  expiry_date: offerRevisions.expiry_date,
  status: offerRevisions.status,
  created_by: offerRevisions.created_by,
  created_at: offerRevisions.created_at,
};

async function promoteToIntern(userId) {
  await db
    .update(users)
    .set({ user_role: "intern" })
    .where(eq(users.id, userId))
    .run();
}

function isUniqueViolation(err) {
  const cause = err?.cause ?? err;
  return (
    compare(cause?.code, "SQLITE_CONSTRAINT_UNIQUE") ||
    compare(cause?.code, "SQLITE_CONSTRAINT") ||
    /UNIQUE constraint failed/i.test(cause?.message ?? "")
  );
}

// Validates the "terms" block that every new set of conditions carries.
function parseTerms(body) {
  const terms = body?.terms;
  if (!terms || typeof terms !== "object") {
    return { error: "terms are required" };
  }
  const compensation = String(terms.compensation ?? "").trim();
  const narration = String(terms.narration ?? "").trim();
  const constraints = String(terms.terms ?? "").trim();
  if (!compensation || !narration || !constraints) {
    return {
      error: "terms.compensation, terms.narration and terms.terms are required",
    };
  }
  return {
    value: {
      position_title: String(terms.position_title ?? "").trim() || null,
      compensation,
      duration: String(terms.duration ?? "").trim() || null,
      start_date: String(terms.start_date ?? "").trim() || null,
      narration,
      terms: constraints,
      expiry_date: String(terms.expiry_date ?? "").trim() || null,
    },
  };
}

async function loadOfferWithApplicant(id) {
  return db
    .select(offerSelect)
    .from(offers)
    .leftJoin(applications, eq(applications.id, offers.application_id))
    .leftJoin(users, eq(users.id, applications.applicant_id))
    .leftJoin(roles, eq(roles.id, applications.role_id))
    .where(eq(offers.id, id))
    .get();
}

async function loadRole(roleId) {
  if (roleId == null) return null;
  return db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.id, Number(roleId)))
    .get();
}

async function nextVersion(offerId) {
  const rows = await db
    .select({ version: offerRevisions.version })
    .from(offerRevisions)
    .where(eq(offerRevisions.offer_id, offerId))
    .all();
  return rows.length
    ? Math.max(...rows.map((r) => Number(r.version))) + 1
    : 1;
}

async function insertRevision({ offerId, kind, roleId, terms, createdBy }) {
  const version = await nextVersion(offerId);
  const result = await db
    .insert(offerRevisions)
    .values({
      offer_id: offerId,
      version,
      kind,
      role_id: roleId,
      ...terms,
      status: "proposed",
      created_by: createdBy,
    })
    .run();
  return Number(result.lastInsertRowid);
}

// Marks every revision of an offer except `keepId` as superseded.
async function supersedeOthers(offerId, keepId) {
  const conditions = [eq(offerRevisions.offer_id, offerId)];
  if (keepId != null) {
    conditions.push(notInArray(offerRevisions.id, [keepId]));
  }
  await db
    .update(offerRevisions)
    .set({ status: "superseded" })
    .where(and(...conditions))
    .run();
}

async function insertMessage({ offerId, senderRole, message }) {
  await db
    .insert(offerMessages)
    .values({ offer_id: offerId, sender_role: senderRole, message })
    .run();
}

// Admin sees every offer; everyone else only their own, published ones.
offerRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const query = db
      .select(offerSelect)
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .orderBy(desc(offers.created_at));

    const rows =
      compare(req.user.role, "admin")
        ? await query.all()
        : await query
            .where(
              and(
                eq(applications.applicant_id, req.user.sub),
                inArray(offers.status, [
                  "Extended",
                  "In Negotiation",
                  "Final",
                  "Accepted",
                  "Confirmed",
                  "Declined",
                ]),
              ),
            )
            .all();

    const revisionIds = rows
      .map((r) => (r.current_revision_id != null ? Number(r.current_revision_id) : null))
      .filter((id) => id != null);
    const revisions =
      revisionIds.length > 0
        ? await db
            .select(revisionSelect)
            .from(offerRevisions)
            .leftJoin(roles, eq(roles.id, offerRevisions.role_id))
            .where(inArray(offerRevisions.id, revisionIds))
            .all()
        : [];
    const byId = new Map(revisions.map((r) => [Number(r.id), r]));

    res.json({
      data: rows.map((row) => ({
        ...row,
        current_revision:
          row.current_revision_id != null
            ? byId.get(Number(row.current_revision_id)) ?? null
            : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Detail view — the offer plus the full revision history and negotiation thread.
offerRouter.get("/:id", verifyAuth, async (req, res, next) => {
  try {
    const row = await db
      .select(offerSelect)
      .from(offers)
      .leftJoin(applications, eq(applications.id, offers.application_id))
      .leftJoin(users, eq(users.id, applications.applicant_id))
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(offers.id, Number(req.params.id)))
      .get();
    if (!row) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(req.user.role, "admin") && !compare(Number(row.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "This offer is not yours to view" });
    }

    const [revisions, messages] = await Promise.all([
      db
        .select(revisionSelect)
        .from(offerRevisions)
        .leftJoin(roles, eq(roles.id, offerRevisions.role_id))
        .where(eq(offerRevisions.offer_id, row.id))
        .orderBy(desc(offerRevisions.version))
        .all(),
      db
        .select({
          id: offerMessages.id,
          offer_id: offerMessages.offer_id,
          sender_role: offerMessages.sender_role,
          message: offerMessages.message,
          created_at: offerMessages.created_at,
        })
        .from(offerMessages)
        .where(eq(offerMessages.offer_id, row.id))
        .orderBy(desc(offerMessages.created_at))
        .all(),
    ]);

    res.json({ data: { ...row, revisions, messages } });
  } catch (err) {
    next(err);
  }
});

// Creates a Draft from the terms in the body; published only via /:id/extend.
offerRouter.post("/", verifyAuth, requireAdmin, async (req, res, next) => {
  const { application_id, role_id } = req.body ?? {};
  if (!application_id) {
    return res.status(400).json({ error: "application_id is required" });
  }
  const parsed = parseTerms(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  try {
    const app = await db
      .select({
        id: applications.id,
        status: applications.status,
        role_id: applications.role_id,
        role_title: roles.title,
      })
      .from(applications)
      .leftJoin(roles, eq(roles.id, applications.role_id))
      .where(eq(applications.id, Number(application_id)))
      .get();
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (!compare(app.status, "Shortlisted")) {
      return res.status(400).json({
        error: "Application must be Shortlisted before offering a role",
      });
    }
    const offeredRoleId = role_id != null ? Number(role_id) : Number(app.role_id);
    const offeredRole = await loadRole(offeredRoleId);
    if (!offeredRole) {
      return res.status(404).json({ error: "Offered role not found" });
    }

    const result = await db
      .insert(offers)
      .values({ application_id: Number(application_id), status: "Draft" })
      .run();
    const offerId = Number(result.lastInsertRowid);

    const terms = {
      ...parsed.value,
      position_title: parsed.value.position_title ?? app.role_title,
    };
    const revisionId = await insertRevision({
      offerId,
      kind: "initial",
      roleId: offeredRoleId,
      terms,
      createdBy: req.user.sub,
    });
    await db
      .update(offers)
      .set({ current_revision_id: revisionId })
      .where(eq(offers.id, offerId))
      .run();

    res.status(201).json({ data: { id: offerId } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Offer already exists for this application" });
    }
    next(err);
  }
});

// Editing is only ever allowed while the offer is still a Draft.
offerRouter.patch("/:id", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(existing.status, "Draft")) {
      return res.status(400).json({ error: "Only draft offers can be edited" });
    }
    const parsed = parseTerms(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const current = await db
      .select({ id: offerRevisions.id })
      .from(offerRevisions)
      .where(eq(offerRevisions.id, existing.current_revision_id))
      .get();
    if (!current) {
      return res.status(409).json({ error: "Offer has no draft terms yet" });
    }

    const roleId =
      req.body.role_id != null ? Number(req.body.role_id) : existing.role_id ?? null;
    if (req.body.role_id != null) {
      const offeredRole = await loadRole(roleId);
      if (!offeredRole) {
        return res.status(404).json({ error: "Offered role not found" });
      }
    }

    await db
      .update(offerRevisions)
      .set({ role_id: roleId, ...parsed.value })
      .where(eq(offerRevisions.id, current.id))
      .run();

    res.json({ data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
});

// Draft → Extended. The candidate becomes able to see it.
offerRouter.post("/:id/extend", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(existing.status, "Draft")) {
      return res.status(400).json({ error: "Only draft offers can be extended" });
    }
    await db
      .update(offers)
      .set({ status: "Extended" })
      .where(eq(offers.id, existing.id))
      .run();
    notify(
      existing.applicant_id,
      "offer",
      `An offer for ${existing.role_title} has been extended to you — review it in the Applicant dashboard`,
    );
    void sendMail({
      to: existing.applicant_email,
      subject: `You have an offer — ${existing.role_title}`,
      html: offerEmail({
        name: existing.applicant_name.split(" ")[0],
        roleTitle: existing.role_title,
        status: "Extended",
      }),
    });
    res.json({ data: { id: existing.id, status: "Extended" } });
  } catch (err) {
    next(err);
  }
});

// Candidate asks for a review of the terms. The thread opens.
offerRouter.post("/:id/request-changes", verifyAuth, async (req, res, next) => {
  const { message } = req.body ?? {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "This offer is not yours" });
    }
    if (!["Extended", "In Negotiation"].includes(existing.status)) {
      return res.status(400).json({
        error: "Only an extended offer that is still open can be reviewed",
      });
    }
    await insertMessage({
      offerId: existing.id,
      senderRole: "candidate",
      message: String(message).trim(),
    });
    await db
      .update(offers)
      .set({ status: "In Negotiation" })
      .where(eq(offers.id, existing.id))
      .run();
    res.json({ data: { id: existing.id, status: "In Negotiation" } });
  } catch (err) {
    next(err);
  }
});

// Admin responds with amended terms. From Declined this doubles as a re-offer.
offerRouter.post("/:id/counter", verifyAuth, requireAdmin, async (req, res, next) => {
  const parsed = parseTerms(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { message } = req.body ?? {};
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!["Extended", "In Negotiation", "Declined"].includes(existing.status)) {
      return res.status(400).json({
        error: "Counter offers are only allowed while the offer is open or after a decline",
      });
    }
    const isReOffer = compare(existing.status, "Declined");
    const roleId =
      req.body.role_id != null ? Number(req.body.role_id) : existing.role_id ?? null;
    if (req.body.role_id != null) {
      const offeredRole = await loadRole(roleId);
      if (!offeredRole) {
        return res.status(404).json({ error: "Offered role not found" });
      }
    }

    const revisionId = await insertRevision({
      offerId: existing.id,
      kind: isReOffer ? "reoffer" : "counter",
      roleId,
      terms: parsed.value,
      createdBy: req.user.sub,
    });
    await supersedeOthers(existing.id, revisionId);
    await db
      .update(offers)
      .set({
        current_revision_id: revisionId,
        status: isReOffer ? "Extended" : "In Negotiation",
      })
      .where(eq(offers.id, existing.id))
      .run();
    if (message && String(message).trim()) {
      await insertMessage({
        offerId: existing.id,
        senderRole: "admin",
        message: String(message).trim(),
      });
    }
    res.json({
      data: { id: existing.id, status: isReOffer ? "Extended" : "In Negotiation" },
    });
  } catch (err) {
    next(err);
  }
});

// Admin closes the negotiation with a final, take-it-or-leave-it offer.
offerRouter.post("/:id/final", verifyAuth, requireAdmin, async (req, res, next) => {
  const parsed = parseTerms(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { message } = req.body ?? {};
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!["Extended", "In Negotiation"].includes(existing.status)) {
      return res.status(400).json({ error: "Only open offers can be made final" });
    }
    const roleId =
      req.body.role_id != null ? Number(req.body.role_id) : existing.role_id ?? null;
    if (req.body.role_id != null) {
      const offeredRole = await loadRole(roleId);
      if (!offeredRole) {
        return res.status(404).json({ error: "Offered role not found" });
      }
    }

    const revisionId = await insertRevision({
      offerId: existing.id,
      kind: "final",
      roleId,
      terms: parsed.value,
      createdBy: req.user.sub,
    });
    await supersedeOthers(existing.id, revisionId);
    await db
      .update(offers)
      .set({ current_revision_id: revisionId, status: "Final" })
      .where(eq(offers.id, existing.id))
      .run();
    if (message && String(message).trim()) {
      await insertMessage({
        offerId: existing.id,
        senderRole: "admin",
        message: String(message).trim(),
      });
    }
    notify(
      existing.applicant_id,
      "offer",
      `A final offer for ${existing.role_title} is ready for your review`,
    );
    res.json({ data: { id: existing.id, status: "Final" } });
  } catch (err) {
    next(err);
  }
});

// Marks a list of offers (and their current revisions) as Declined.
async function declineOffers(offerIds) {
  if (offerIds.length === 0) return;
  for (const offerId of offerIds) {
    const row = await db
      .select({ current_revision_id: offers.current_revision_id })
      .from(offers)
      .where(eq(offers.id, offerId))
      .get();
    if (row?.current_revision_id != null) {
      await db
        .update(offerRevisions)
        .set({ status: "declined" })
        .where(eq(offerRevisions.id, row.current_revision_id))
        .run();
      await supersedeOthers(offerId, row.current_revision_id);
    }
  }
  await db
    .update(offers)
    .set({ status: "Declined" })
    .where(inArray(offers.id, offerIds))
    .run();
}

// Candidate accepts. Hiring only happens when an admin confirms (see below).
// With decline_others set, every other open offer of the candidate is also
// declined so they don't leave active offers dangling after choosing one.
offerRouter.post("/:id/accept", verifyAuth, async (req, res, next) => {
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "This offer is not yours to accept" });
    }
    if (!["Extended", "In Negotiation", "Final"].includes(existing.status)) {
      return res.status(400).json({ error: "This offer is not open to accept" });
    }
    if (existing.current_revision_id != null) {
      await db
        .update(offerRevisions)
        .set({ status: "accepted" })
        .where(eq(offerRevisions.id, existing.current_revision_id))
        .run();
      await supersedeOthers(existing.id, existing.current_revision_id);
    }
    await db
      .update(offers)
      .set({ status: "Accepted" })
      .where(eq(offers.id, existing.id))
      .run();

    let declinedOthers = 0;
    if (req.body?.decline_others) {
      const others = await db
        .select({ id: offers.id })
        .from(offers)
        .leftJoin(applications, eq(applications.id, offers.application_id))
        .where(
          and(
            eq(applications.applicant_id, existing.applicant_id),
            notInArray(offers.id, [existing.id]),
            inArray(offers.status, ["Extended", "In Negotiation", "Final"]),
          ),
        )
        .all();
      await declineOffers(others.map((o) => Number(o.id)));
      declinedOthers = others.length;
    }

    res.json({
      data: { id: existing.id, status: "Accepted", declined_others: declinedOthers },
    });
    notifyAdmins(
      "offer",
      `${existing.applicant_name} accepted the offer for ${existing.role_title} — ready for confirmation`,
    );
  } catch (err) {
    next(err);
  }
});

// Admin final confirmation after the candidate has accepted — this is what
// actually hires the intern.
offerRouter.post("/:id/confirm", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(existing.status, "Accepted")) {
      return res.status(400).json({
        error: "Only an accepted offer can be confirmed",
      });
    }
    await db
      .update(offers)
      .set({ status: "Confirmed" })
      .where(eq(offers.id, existing.id))
      .run();
    await promoteToIntern(existing.applicant_id);
    await db
      .update(applications)
      .set({ status: "Hired" })
      .where(eq(applications.id, existing.application_id))
      .run();
    res.json({ data: { id: existing.id, status: "Confirmed" } });
    notify(
      existing.applicant_id,
      "offer",
      `Congratulations! You've been confirmed for ${existing.role_title} — see your Intern dashboard`,
    );
    void sendMail({
      to: existing.applicant_email,
      subject: `You're in! ${existing.role_title} confirmed`,
      html: offerEmail({
        name: existing.applicant_name.split(" ")[0],
        roleTitle: existing.role_title,
        status: "Confirmed",
      }),
    });
  } catch (err) {
    next(err);
  }
});

// Candidate declines. The admin may later re-offer via /:id/counter.
offerRouter.post("/:id/decline", verifyAuth, async (req, res, next) => {
  try {
    const existing = await loadOfferWithApplicant(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Offer not found" });
    }
    if (!compare(Number(existing.applicant_id), Number(req.user.sub))) {
      return res.status(403).json({ error: "This offer is not yours to decline" });
    }
    if (!["Extended", "In Negotiation", "Final"].includes(existing.status)) {
      return res.status(400).json({ error: "This offer is not open to decline" });
    }
    await declineOffers([existing.id]);
    res.json({ data: { id: existing.id, status: "Declined" } });
    notifyAdmins(
      "offer",
      `${existing.applicant_name} declined the offer for ${existing.role_title}`,
    );
  } catch (err) {
    next(err);
  }
});

export { offerRouter };
