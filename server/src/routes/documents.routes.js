import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { rmSync } from "node:fs";
import { db } from "../db.js";
import { internDocuments } from "../db/schema.js";
import { uploadResume, toUploadUrl, storedFilePath } from "../utils/upload.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const documentRouter = Router();

const DOC_TYPES = ["cv", "id", "certificate", "other"];

// GET /api/interns/documents — the signed-in intern's uploaded documents.
// Admins may pass ?user_id= to inspect a specific intern.
documentRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const isAdmin = compare(req.user.role, "admin");
    const targetId = req.query.user_id
      ? Number(req.query.user_id)
      : Number(req.user.sub);
    if (!isAdmin && !compare(targetId, Number(req.user.sub))) {
      return res.status(403).json({ error: "You can only view your own documents" });
    }
    const rows = await db
      .select({
        id: internDocuments.id,
        doc_type: internDocuments.doc_type,
        file_name: internDocuments.file_name,
        stored_path: internDocuments.stored_path,
        size_bytes: internDocuments.size_bytes,
        uploaded_at: internDocuments.uploaded_at,
      })
      .from(internDocuments)
      .where(eq(internDocuments.user_id, targetId))
      .orderBy(desc(internDocuments.uploaded_at))
      .all();
    res.json({ data: rows.map((r) => ({ ...r, url: r.stored_path })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/interns/documents — upload a required document.
// Multipart field "document" (PDF/Word/TXT/image, max 5 MB) + doc_type.
documentRouter.post("/", verifyAuth, uploadResume.single("document"), async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const docType = String(req.body?.doc_type ?? "other").trim();
    if (!DOC_TYPES.includes(docType)) {
      return res.status(400).json({ error: "doc_type must be cv, id, certificate or other" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "A document file is required" });
    }
    const storedPath = toUploadUrl(req.file);
    const result = await db
      .insert(internDocuments)
      .values({
        user_id: userId,
        doc_type: docType,
        file_name: req.file.originalname,
        stored_path: storedPath,
        size_bytes: req.file.size,
      })
      .run();
    res.status(201).json({
      data: {
        id: Number(result.lastInsertRowid),
        doc_type: docType,
        file_name: req.file.originalname,
        url: storedPath,
        size_bytes: req.file.size,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interns/documents/:id — remove a document (owner, or admin on
// behalf of an intern). Deletes the stored file too so uploads never leak.
documentRouter.delete("/:id", verifyAuth, async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    const isAdmin = compare(req.user.role, "admin");
    const row = await db
      .select({
        id: internDocuments.id,
        user_id: internDocuments.user_id,
        stored_path: internDocuments.stored_path,
      })
      .from(internDocuments)
      .where(eq(internDocuments.id, docId))
      .get();
    if (!row) {
      return res.status(404).json({ error: "Document not found" });
    }
    const userId = Number(req.user.sub);
    if (!isAdmin && !compare(row.user_id, userId)) {
      return res.status(403).json({ error: "You can only delete your own documents" });
    }
    const filePath = storedFilePath(row.stored_path);
    if (filePath) {
      rmSync(filePath, { force: true });
    }
    await db.delete(internDocuments).where(eq(internDocuments.id, docId)).run();
    res.json({ data: { deleted: true, id: docId } });
  } catch (err) {
    next(err);
  }
});

export { documentRouter, DOC_TYPES };