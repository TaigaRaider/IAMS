import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import "dotenv/config";

const migrationFolderTo = "./drizzle";
const journal = JSON.parse(fs.readFileSync(`${migrationFolderTo}/meta/_journal.json`).toString());

const entries = journal.entries.map((e) => {
  const query = fs.readFileSync(`${migrationFolderTo}/${e.tag}.sql`).toString();
  return {
    tag: e.tag,
    folderMillis: e.when,
    hash: crypto.createHash("sha256").update(query).digest("hex"),
  };
});

console.log("Computed hashes:");
for (const e of entries) console.log(` ${e.tag}  ${e.folderMillis}  ${e.hash}`);

const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = await c.execute("SELECT id, hash, created_at FROM __drizzle_migrations");
console.log("Existing journal rows:", existing.rows.length);

for (const e of entries) {
  const dup = existing.rows.find((r) => Number(r.created_at) === e.folderMillis);
  if (dup) {
    console.log(`already present: ${e.tag}`);
    continue;
  }
  await c.execute({
    sql: 'INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)',
    args: [e.hash, e.folderMillis],
  });
  console.log(`inserted: ${e.tag}`);
}

const after = await c.execute("SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at");
console.log("Journal rows after:", after.rows.length);
for (const r of after.rows) console.log(` ${r.id}  ${r.hash}  ${r.created_at}`);

c.close();