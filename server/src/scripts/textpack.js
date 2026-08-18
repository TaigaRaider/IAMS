import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { textFiles, textPackets } from "../db/schema.js";
import { encodeToPackets, decodeFromPackets } from "../utils/textpack.js";
import { logState } from "../utils/textpack.js";

// Backend CLI for the text-packet file transport. No UI involved:
//   node src/scripts/textpack.js encode <file>
//   node src/scripts/textpack.js decode <fileId> [output]
//   node src/scripts/textpack.js status <fileId>
//   node src/scripts/textpack.js list
const [command, arg1, arg2] = process.argv.slice(2);

const INSERT_BATCH = 400;

async function encodeFile(filePath) {
  const buffer = readFileSync(filePath);
  const { fileId, sha256, manifest, packets } = encodeToPackets(buffer, {
    name: basename(filePath),
    mime: "application/octet-stream",
  });

  const existing = await db
    .select({ file_id: textFiles.file_id })
    .from(textFiles)
    .where(eq(textFiles.file_id, fileId))
    .get();
  if (existing) {
    console.error(`File already stored as ${fileId}`);
    process.exit(1);
  }

  await db
    .insert(textFiles)
    .values({
      file_id: fileId,
      file_name: basename(filePath),
      mime_type: "application/octet-stream",
      size_bytes: buffer.length,
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

  console.log(
    `Stored ${buffer.length} bytes as ${packets.length} packets (${manifest.blocks.length} block(s)) under ${fileId}`,
  );
}

async function decodeFile(fileId, outputPath) {
  const file = await db
    .select()
    .from(textFiles)
    .where(eq(textFiles.file_id, fileId))
    .get();
  if (!file) {
    console.error(`Text file ${fileId} not found`);
    process.exit(1);
  }
  const rows = await db
    .select()
    .from(textPackets)
    .where(eq(textPackets.file_id, fileId))
    .orderBy(textPackets.seq)
    .all();

  const { buffer, manifest, repairs } = decodeFromPackets(rows);
  if (repairs.length > 0) {
    await db
      .insert(textPackets)
      .values(
        repairs.map((r) => ({
          file_id: fileId,
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
    await db.update(textFiles).set({ status: "repaired" }).where(eq(textFiles.file_id, fileId)).run();
    logState("HEAL", { fileId, rows: repairs.length });
    console.log(`Repaired ${repairs.length} packet(s)`);
  }

  const out = resolve(outputPath ?? manifest.name);
  writeFileSync(out, buffer);
  console.log(`Reconstructed ${manifest.name} (${buffer.length} bytes, sha256 ${manifest.sha256}) -> ${out}`);
}

async function statusOf(fileId) {
  const file = await db
    .select()
    .from(textFiles)
    .where(eq(textFiles.file_id, fileId))
    .get();
  if (!file) {
    console.error(`Text file ${fileId} not found`);
    process.exit(1);
  }
  const rows = await db
    .select({ seq: textPackets.seq })
    .from(textPackets)
    .where(eq(textPackets.file_id, fileId))
    .all();
  const okSeqs = new Set(rows.map((r) => Number(r.seq)));
  const manifest = JSON.parse(file.manifest);
  let blockStart = 1;
  const blocks = manifest.blocks.map((bl, i) => {
    let ok = 0;
    for (let s = blockStart; s < blockStart + bl.n; s++) if (okSeqs.has(s)) ok++;
    const missing = bl.n - ok;
    blockStart += bl.n;
    return { index: i, start: bl.start, bytes: bl.bytes, k: bl.k, m: bl.m, packets_ok: ok, packets_missing: missing, recoverable: missing <= bl.m };
  });
  console.log(`${file.file_id}  ${file.file_name}  ${file.size_bytes} bytes  status=${file.status}`);
  console.log(`  manifest=${okSeqs.has(0) ? "ok" : "MISSING"}  blocks=${file.blocks}  packets=${file.packet_count}`);
  for (const b of blocks) {
    console.log(
      `  block ${b.index}: bytes=${b.bytes} k=${b.k} m=${b.m} ok=${b.packets_ok}/${b.packets_ok + b.packets_missing} recoverable=${b.recoverable}`,
    );
  }
}

async function listFiles() {
  const files = await db.select().from(textFiles).orderBy(textFiles.created_at).all();
  for (const f of files) {
    console.log(`${f.file_id}  ${f.file_name}  ${f.size_bytes} bytes  ${f.blocks} blocks  ${f.packet_count} packets  status=${f.status}`);
  }
}

if (!command) {
  console.error("Usage: node src/scripts/textpack.js <encode|decode|status|list> ...");
  process.exit(1);
}

try {
  if (command === "encode") {
    if (!arg1) throw new Error("encode requires a file path");
    await encodeFile(arg1);
  } else if (command === "decode") {
    if (!arg1) throw new Error("decode requires a fileId");
    await decodeFile(arg1, arg2);
  } else if (command === "status") {
    if (!arg1) throw new Error("status requires a fileId");
    await statusOf(arg1);
  } else if (command === "list") {
    await listFiles();
  } else {
    throw new Error(`Unknown command '${command}'`);
  }
} catch (err) {
  console.error(`[textpack] CLI FAILED:`, err.message ?? err);
  process.exit(1);
}