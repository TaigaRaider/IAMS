import { Router } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { textFiles, textPackets } from "../db/schema.js";
import { verifyAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { uploadTextFile } from "../utils/upload.js";
import {
  encodeToPackets,
  decodeFromPackets,
  packetLine,
  TextPackError,
  logState,
} from "../utils/textpack.js";

const textFilesRouter = Router();

const INSERT_BATCH = 400;

// Packet health counts per stored file.
async function packetCounts(fileId) {
  const rows = await db
    .select({ status: textPackets.status, count: count() })
    .from(textPackets)
    .where(eq(textPackets.file_id, fileId))
    .groupBy(textPackets.status)
    .all();
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  return {
    packets_ok: byStatus.ok ?? 0,
    packets_corrupt: byStatus.corrupt ?? 0,
    packets_missing: byStatus.missing ?? 0,
  };
}

function fileNotFound(res) {
  return res.status(404).json({ error: "Text file not found" });
}

// POST /api/text-files — encode an uploaded file into text packets and store
// them. Backend operation: the file's content lives only as packet rows.
textFilesRouter.post("/", verifyAuth, requireAdmin, uploadTextFile.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "A file is required" });
    }
    const { fileId, sha256, manifest, packets } = encodeToPackets(req.file.buffer, {
      name: req.file.originalname,
      mime: req.file.mimetype || "application/octet-stream",
    });

    const existing = await db
      .select({ file_id: textFiles.file_id })
      .from(textFiles)
      .where(eq(textFiles.file_id, fileId))
      .get();
    if (existing) {
      return res.status(409).json({ error: "This file is already stored" });
    }

    await db
      .insert(textFiles)
      .values({
        file_id: fileId,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype || "application/octet-stream",
        size_bytes: req.file.buffer.length,
        sha256,
        blocks: manifest.blocks.length,
        packet_count: manifest.totalPackets,
        manifest: JSON.stringify(manifest),
      })
      .run();

    for (let i = 0; i < packets.length; i += INSERT_BATCH) {
      await db
        .insert(textPackets)
        .values(
          packets.slice(i, i + INSERT_BATCH).map((p) => ({
            file_id: fileId,
            seq: p.seq,
            type: p.type,
            payload: p.payload,
          })),
        )
        .run();
    }
    logState("STORE", { fileId, rows: packets.length });

    res.status(201).json({
      data: {
        file_id: fileId,
        file_name: req.file.originalname,
        size_bytes: req.file.buffer.length,
        sha256,
        blocks: manifest.blocks.length,
        packet_count: manifest.totalPackets,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/text-files — list stored files with packet health.
textFilesRouter.get("/", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const files = await db.select().from(textFiles).orderBy(textFiles.created_at).all();
    const data = await Promise.all(
      files.map(async (file) => ({
        file_id: file.file_id,
        file_name: file.file_name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        sha256: file.sha256,
        blocks: file.blocks,
        packet_count: file.packet_count,
        status: file.status,
        created_at: file.created_at,
        ...(await packetCounts(file.file_id)),
      })),
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/text-files/:fileId/status — packet health + per-block recoverability.
textFilesRouter.get("/:fileId/status", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const file = await db
      .select()
      .from(textFiles)
      .where(eq(textFiles.file_id, req.params.fileId))
      .get();
    if (!file) return fileNotFound(res);

    const manifest = JSON.parse(file.manifest);
    const rows = await db
      .select({ seq: textPackets.seq, status: textPackets.status })
      .from(textPackets)
      .where(eq(textPackets.file_id, req.params.fileId))
      .all();
    const okSeqs = new Set(rows.filter((r) => r.status === "ok").map((r) => Number(r.seq)));

    let blockStart = 1;
    const blocks = manifest.blocks.map((bl, i) => {
      let ok = 0;
      for (let s = blockStart; s < blockStart + bl.n; s++) if (okSeqs.has(s)) ok++;
      const missing = bl.n - ok;
      blockStart += bl.n;
      return {
        index: i,
        start: bl.start,
        end: bl.end,
        k: bl.k,
        m: bl.m,
        packets: bl.n,
        packets_ok: ok,
        packets_missing: missing,
        recoverable: missing <= bl.m,
      };
    });

    const recoverable = blocks.every((b) => b.recoverable);
    const totalMissing = blocks.reduce((s, b) => s + b.packets_missing, 0);
    const counts = await packetCounts(req.params.fileId);
    res.json({
      data: {
        file_id: file.file_id,
        file_name: file.file_name,
        size_bytes: file.size_bytes,
        sha256: file.sha256,
        blocks: file.blocks,
        packet_count: file.packet_count,
        status: file.status,
        manifest_ok: okSeqs.has(0),
        recoverable,
        blocks,
        packets_ok: file.packet_count - totalMissing,
        packets_missing: totalMissing,
        packets_corrupt: counts.packets_corrupt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/text-files/:fileId/packets — raw packet lines (transport/debug view).
textFilesRouter.get("/:fileId/packets", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const file = await db
      .select()
      .from(textFiles)
      .where(eq(textFiles.file_id, req.params.fileId))
      .get();
    if (!file) return fileNotFound(res);

    const rows = await db
      .select()
      .from(textPackets)
      .where(eq(textPackets.file_id, req.params.fileId))
      .orderBy(textPackets.seq)
      .all();
    res
      .type("text/plain")
      .send(rows.map((p) => packetLine(p, file.file_id, file.packet_count)).join("\n"));
  } catch (err) {
    next(err);
  }
});

// GET /api/text-files/:fileId — reconstruct the original file, healing any
// missing or tampered packets along the way.
textFilesRouter.get("/:fileId", verifyAuth, requireAdmin, async (req, res, next) => {
  try {
    const file = await db
      .select()
      .from(textFiles)
      .where(eq(textFiles.file_id, req.params.fileId))
      .get();
    if (!file) return fileNotFound(res);

    const rows = await db
      .select()
      .from(textPackets)
      .where(eq(textPackets.file_id, req.params.fileId))
      .orderBy(textPackets.seq)
      .all();

    let decoded;
    try {
      decoded = decodeFromPackets(rows);
    } catch (err) {
      if (err instanceof TextPackError && err.status === 422) {
        await db
          .update(textFiles)
          .set({ status: "corrupt" })
          .where(eq(textFiles.file_id, req.params.fileId))
          .run();
        logState("FAIL", { fileId: req.params.fileId, reason: err.message });
      }
      throw err;
    }

    if (decoded.repairs.length > 0) {
      await db
        .insert(textPackets)
        .values(
          decoded.repairs.map((r) => ({
            file_id: req.params.fileId,
            seq: r.seq,
            type: r.seq === 0 ? "manifest" : "data",
            payload: r.payload,
            status: "ok",
          })),
        )
        .onConflictDoUpdate({
          target: [textPackets.file_id, textPackets.seq],
          set: { payload: sql`excluded.payload`, status: sql`'ok'` },
        })
        .run();
      await db
        .update(textFiles)
        .set({ status: "repaired" })
        .where(eq(textFiles.file_id, req.params.fileId))
        .run();
      logState("HEAL", { fileId: req.params.fileId, rows: decoded.repairs.length });
    }

    logState("STREAM", { fileId: req.params.fileId, bytes: decoded.buffer.length });
    res.set({
      "Content-Type": file.mime_type,
      "Content-Length": decoded.buffer.length,
      "Content-Disposition": `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
    });
    res.send(decoded.buffer);
  } catch (err) {
    next(err);
  }
});

export { textFilesRouter };