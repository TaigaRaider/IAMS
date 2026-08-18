import { createHash } from "node:crypto";
import "./erasure.js"; // side-effect: attaches erasure split/recombine to globalThis
const erasure = globalThis.__erasure;

// Text-packet file transport codec.
//
// A file becomes a stream of uniform text packets, each payload ~512 base64
// chars (384 raw bytes). Packets are Reed-Solomon fragments (data + parity)
// produced by the vendored erasure.js, so a block survives the loss of up to
// `m` packets without retransmission. Blocks are independent RS groups capped
// at 213 data shards (≈ 81 KB); larger files span several blocks.
//
// Packet line format:  [FILE_ID]:[SEQ]/[TOTAL]:[PAYLOAD]
//   FILE_ID  first 8 hex chars of sha256(file bytes)
//   SEQ 0    manifest packet (base64 JSON): name, mime, size, sha256, blocks
//   SEQ 1..  data packets, then parity packets, block by block
//
// All packets in a file share the same payload length (fragment size), so a
// packet set can be reassembled in any order and missing packets are just
// gaps in the sequence.

export const DATA_SHARD = 384; // 384 raw bytes per shard = 512 base64 chars
export const MAX_K = 213; // keeps n = k + 2m <= 256 (RS field size)
export const BLOCK_CAP = MAX_K * DATA_SHARD; // 81,792 bytes per RS block

export class TextPackError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "TextPackError";
    this.status = status;
  }
}

// [textpack] state logging — lands in the server log (nodemon output) like the
// existing [mailer]/[notify] prefixes.
export function logState(state, details) {
  const fields = Object.entries(details ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`[textpack] STATE=${state} ${fields}`.trimEnd());
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parityCount(k) {
  let m = Math.max(2, Math.ceil(k / 10));
  if (k + 2 * m > 256) m = Math.floor((256 - k) / 2);
  return m;
}

// Per-block RS geometry. Everything derived from the raw block byte count.
function blockGeometry(blockBytes) {
  const k = Math.max(1, Math.ceil(blockBytes / DATA_SHARD));
  const m = parityCount(k);
  const n = k + 2 * m;
  const ss = Math.floor(256 / n); // symbols per fragment per codeword
  const inputSize = ss * k;
  const padded = Math.ceil(blockBytes / inputSize) * inputSize;
  return { k, m, n, ss, inputSize, padded, shard: padded / k };
}

// Encode a file buffer into packets. Pure: no DB access, logs each state.
export function encodeToPackets(buffer, { name = "file", mime = "application/octet-stream" } = {}) {
  const started = Date.now();
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TextPackError("File is empty", 400);
  }
  logState("READ", { file: name, bytes: buffer.length });

  const sha256 = sha256Hex(buffer);
  const fileId = sha256.slice(0, 8);
  logState("SHA", { fileId, sha256 });

  const blockCount = Math.ceil(buffer.length / BLOCK_CAP);
  const blocks = [];
  const packets = [];

  for (let b = 0; b < blockCount; b++) {
    const start = b * BLOCK_CAP;
    const end = Math.min((b + 1) * BLOCK_CAP, buffer.length);
    const blockBytes = end - start;
    const g = blockGeometry(blockBytes);

    const padded = new Uint8Array(g.padded);
    padded.set(buffer.subarray(start, end));

    const fragments = erasure.split(padded, g.k, g.m);
    if (fragments.length !== g.n) {
      throw new TextPackError(`Erasure encode produced ${fragments.length} fragments, expected ${g.n}`);
    }

    blocks.push({ start, end, bytes: blockBytes, k: g.k, m: g.m, n: g.n, shard: g.shard });
    for (let j = 0; j < g.k; j++) {
      packets.push({ seq: packets.length + 1, type: "data", payload: Buffer.from(fragments[j]).toString("base64") });
    }
    for (let j = g.k; j < g.n; j++) {
      packets.push({ seq: packets.length + 1, type: "parity", payload: Buffer.from(fragments[j]).toString("base64") });
    }
  }

  logState("CHUNK", { blocks: blockCount, dataShards: blocks.reduce((s, bl) => s + bl.k, 0) });
  logState("ERASURE", {
    parityShards: blocks.reduce((s, bl) => s + (bl.n - bl.k), 0),
    shardBytes: blocks[0].shard,
  });

  const manifest = {
    v: 1,
    fileId,
    name,
    mime,
    size: buffer.length,
    sha256,
    dataShard: DATA_SHARD,
    totalPackets: packets.length + 1,
    blocks,
  };
  const manifestPacket = {
    seq: 0,
    type: "manifest",
    payload: Buffer.from(JSON.stringify(manifest)).toString("base64"),
  };
  const allPackets = [manifestPacket, ...packets];

  logState("ENCODE", {
    packets: allPackets.length,
    ms: Date.now() - started,
  });
  return { fileId, sha256, manifest, packets: allPackets };
}

function base64ToBytes(payload) {
  return new Uint8Array(Buffer.from(payload, "base64"));
}

// Reassemble packets into the original file. Pure; returns the buffer plus a
// list of repairs (missing or tampered packets whose corrected payloads can be
// written back to the DB to self-heal storage).
export function decodeFromPackets(packets) {
  const started = Date.now();
  if (!Array.isArray(packets) || packets.length === 0) {
    throw new TextPackError("No packets to decode", 422);
  }

  const bySeq = new Map();
  for (const p of packets) bySeq.set(Number(p.seq), p);
  const manifestPacket = bySeq.get(0);
  if (!manifestPacket) {
    throw new TextPackError("Manifest packet is missing — file is unrecoverable", 422);
  }

  let manifest;
  try {
    manifest = JSON.parse(Buffer.from(manifestPacket.payload, "base64").toString("utf8"));
  } catch {
    throw new TextPackError("Manifest packet is corrupt", 422);
  }
  logState("FETCH", { packets: packets.length, blocks: manifest.blocks?.length });

  const repairs = [];
  const missing = [];
  const out = new Uint8Array(manifest.size);
  let recoveredBytes = 0;

  let seq = 1;
  for (const bl of manifest.blocks) {
    const g = blockGeometry(bl.bytes);
    if (g.n !== bl.n || g.k !== bl.k || g.m !== bl.m) {
      throw new TextPackError(`Block geometry mismatch (block ${bl.start})`, 422);
    }

    const fragments = [];
    const missingHere = [];
    for (let j = 0; j < bl.n; j++) {
      const p = bySeq.get(seq);
      if (!p || !p.payload) {
        fragments.push(new Uint8Array(bl.shard));
        missingHere.push(seq);
      } else {
        fragments.push(base64ToBytes(p.payload));
      }
      seq++;
    }
    if (missingHere.length > bl.m) {
      throw new TextPackError(
        `Block at byte ${bl.start} is missing ${missingHere.length} packets (only ${bl.m} recoverable)`,
        422,
      );
    }
    missing.push(...missingHere);

    const decoded = erasure.recombine(fragments, bl.bytes, bl.k, bl.m);
    if (decoded.length > bl.bytes) {
      throw new TextPackError(`Decode returned ${decoded.length} bytes, expected ${bl.bytes}`, 500);
    }
    out.set(decoded, bl.start);
    recoveredBytes += decoded.length;

    // Detect tampered packets: re-encode the recovered bytes and diff each
    // fragment against what was stored. Anything that differs gets corrected.
    const padded = new Uint8Array(g.padded);
    padded.set(decoded);
    const corrected = erasure.split(padded, bl.k, bl.m);
    let blockSeq = seq - bl.n;
    for (let j = 0; j < bl.n; j++) {
      const p = bySeq.get(blockSeq);
      const correct = Buffer.from(corrected[j]).toString("base64");
      if (!p || !p.payload || p.payload !== correct) {
        repairs.push({ seq: blockSeq, payload: correct, wasMissing: !p || !p.payload });
      }
      blockSeq++;
    }
  }

  logState("REASSEMBLE", { blocks: manifest.blocks.length, bytes: recoveredBytes });
  if (missing.length > 0) logState("REPAIR", { missing: missing.length, repairs: repairs.length });

  const sha256 = sha256Hex(Buffer.from(out));
  const ok = sha256 === manifest.sha256;
  logState("VERIFY", { sha256, ok });
  if (!ok) {
    logState("FAIL", { reason: "sha256 mismatch" });
    throw new TextPackError("Decoded bytes failed integrity check", 422);
  }

  logState("DECODE", { bytes: out.length, ms: Date.now() - started });
  return { buffer: Buffer.from(out), manifest, repairs, missing };
}

// Human-readable packet line for transport/debug views.
export function packetLine(packet, fileId, total) {
  return `[${fileId}]:${packet.seq}/${total}:${packet.payload}`;
}