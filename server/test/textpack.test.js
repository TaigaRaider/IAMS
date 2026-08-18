import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  encodeToPackets,
  decodeFromPackets,
  TextPackError,
  BLOCK_CAP,
} from "../src/utils/textpack.js";

function packetBySeq(packets, seq) {
  return packets.find((p) => p.seq === seq);
}

function dropPackets(packets, seqs) {
  return packets.filter((p) => !seqs.includes(p.seq));
}

function tamper(packets, seq) {
  return packets.map((p) =>
    p.seq === seq ? { ...p, payload: (p.payload[0] === "A" ? "B" : "A") + p.payload.slice(1) } : p,
  );
}

test("round-trip: small file", () => {
  const data = randomBytes(3 * 1024 + 17);
  const { packets } = encodeToPackets(data, { name: "a.bin" });
  const { buffer, repairs } = decodeFromPackets(packets);
  assert.deepEqual(buffer, data);
  assert.equal(repairs.length, 0);
});

test("round-trip: multi-block file (3 blocks)", () => {
  const data = randomBytes(BLOCK_CAP * 2 + 40 * 1024);
  const { manifest, packets } = encodeToPackets(data, { name: "big.bin" });
  assert.ok(manifest.blocks.length >= 3);
  const { buffer } = decodeFromPackets(packets);
  assert.deepEqual(buffer, data);
});

test("round-trip: exact block boundary", () => {
  const data = randomBytes(BLOCK_CAP);
  const { manifest, packets } = encodeToPackets(data, { name: "edge.bin" });
  assert.equal(manifest.blocks.length, 1);
  const { buffer } = decodeFromPackets(packets);
  assert.deepEqual(buffer, data);
});

test("round-trip: tiny file (1 shard)", () => {
  const data = Buffer.from("x");
  const { packets } = encodeToPackets(data, { name: "tiny.txt" });
  const { buffer } = decodeFromPackets(packets);
  assert.deepEqual(buffer, data);
});

test("reassembly tolerates shuffled packets", () => {
  const data = randomBytes(8 * 1024);
  const { packets } = encodeToPackets(data, { name: "shuffled.bin" });
  const shuffled = [...packets].sort(() => Math.random() - 0.5);
  const { buffer } = decodeFromPackets(shuffled);
  assert.deepEqual(buffer, data);
});

test("recover: exactly m packets dropped from a block", () => {
  const data = randomBytes(40 * 1024);
  const { manifest, packets } = encodeToPackets(data, { name: "lossy.bin" });
  const bl = manifest.blocks[0];
  const drop = bl.k + 1; // first parity packet
  const dropped = [...Array(bl.m)].map((_, i) => drop + i);
  const { buffer, repairs, missing } = decodeFromPackets(dropPackets(packets, dropped));
  assert.deepEqual(buffer, data);
  assert.equal(missing.length, bl.m);
  assert.equal(repairs.length, bl.m);
});

test("recover: m packets dropped across multiple blocks", () => {
  const data = randomBytes(BLOCK_CAP * 2 + 10 * 1024);
  const { manifest, packets } = encodeToPackets(data, { name: "multi.bin" });
  const dropped = [];
  for (const bl of manifest.blocks) {
    dropped.push(bl.start === 0 ? 1 : undefined); // first data packet of each block
  }
  const seqs = manifest.blocks.map((bl, i) => {
    let seq = 1;
    for (let b = 0; b < i; b++) seq += manifest.blocks[b].n;
    return seq;
  });
  const { buffer } = decodeFromPackets(dropPackets(packets, seqs));
  assert.deepEqual(buffer, data);
});

test("unrecoverable: more than m packets dropped", () => {
  const data = randomBytes(40 * 1024);
  const { manifest, packets } = encodeToPackets(data, { name: "doomed.bin" });
  const bl = manifest.blocks[0];
  const drop = [...Array(bl.m + 1)].map((_, i) => bl.k + 1 + i);
  assert.throws(() => decodeFromPackets(dropPackets(packets, drop)), TextPackError);
});

test("detects and corrects tampered packets", () => {
  const data = randomBytes(40 * 1024);
  const { manifest, packets } = encodeToPackets(data, { name: "tamper.bin" });
  const bl = manifest.blocks[0];
  const tamperedSeqs = [1, bl.k + 1];
  const { buffer, repairs } = decodeFromPackets(tamper(packets, tamperedSeqs[0]));
  assert.deepEqual(buffer, data);
  assert.ok(repairs.some((r) => r.seq === tamperedSeqs[0]));
});

test("rejects missing manifest packet", () => {
  const data = randomBytes(1024);
  const { packets } = encodeToPackets(data, { name: "nomanifest.bin" });
  assert.throws(() => decodeFromPackets(dropPackets(packets, [0])), TextPackError);
});

test("rejects tampered manifest (sha256 mismatch)", () => {
  const data = randomBytes(1024);
  const { packets } = encodeToPackets(data, { name: "badmanifest.bin" });
  assert.throws(() => decodeFromPackets(tamper(packets, 0)), TextPackError);
});

test("rejects empty input", () => {
  assert.throws(() => encodeToPackets(Buffer.alloc(0), { name: "empty" }), TextPackError);
});
