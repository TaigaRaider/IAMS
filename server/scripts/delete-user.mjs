import "dotenv/config";
import { createClient } from "@libsql/client";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url =
  process.env.TURSO_DATABASE_URL ||
  pathToFileURL(join(__dirname, "..", "data", "iams.db")).href;

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
await client.execute("PRAGMA foreign_keys = ON");

const run = (sql, params = []) => client.execute({ sql, args: params });

const name = process.argv[2] ?? "Olufikayo Amos";
const user = await run("SELECT * FROM users WHERE full_name LIKE ?", [`%${name}%`]);
if (user.rows.length === 0) {
  console.log("NO USER FOUND for:", name);
  process.exit(1);
}
const u = user.rows[0];
console.log("FOUND:", JSON.stringify(u));

const userId = u.id;
const apps = (await run("SELECT id FROM applications WHERE applicant_id = ?", [userId])).rows;
const appIds = apps.map((a) => a.id);
console.log("applications:", appIds);

if (appIds.length > 0) {
  const placeholders = appIds.map(() => "?").join(",");
  const offers = (await run(`SELECT id FROM offers WHERE application_id IN (${placeholders})`, appIds)).rows;
  const offerIds = offers.map((o) => o.id);
  console.log("offers:", offerIds);

  if (offerIds.length > 0) {
    const op = offerIds.map(() => "?").join(",");
    await run(`UPDATE offers SET current_revision_id = NULL WHERE id IN (${op})`, offerIds);
    const delRev = await run(`DELETE FROM offer_revisions WHERE offer_id IN (${op})`, offerIds);
    const delMsg = await run(`DELETE FROM offer_messages WHERE offer_id IN (${op})`, offerIds);
    console.log("deleted offer_revisions:", delRev.rowsAffected, "offer_messages:", delMsg.rowsAffected);
    const delOffers = await run(`DELETE FROM offers WHERE id IN (${op})`, offerIds);
    console.log("deleted offers:", delOffers.rowsAffected);
  }

  const delInt = await run(`DELETE FROM interviews WHERE application_id IN (${placeholders})`, appIds);
  console.log("deleted interviews:", delInt.rowsAffected);
  const delApps = await run(`DELETE FROM applications WHERE id IN (${placeholders})`, appIds);
  console.log("deleted applications:", delApps.rowsAffected);
}

const delTok = await run("DELETE FROM auth_tokens WHERE user_id = ?", [userId]);
const delTasks = await run("DELETE FROM intern_tasks WHERE intern_id = ?", [userId]);
const delNotif = await run("DELETE FROM notifications WHERE user_id = ?", [userId]);
const delOnb = await run("DELETE FROM onboarding_steps WHERE user_id = ?", [userId]);
const updInt = await run("UPDATE interviews SET interviewer_id = NULL WHERE interviewer_id = ?", [userId]);
const updRev = await run("UPDATE offer_revisions SET created_by = NULL WHERE created_by = ?", [userId]);
console.log(
  "deleted auth_tokens:", delTok.rowsAffected,
  "| intern_tasks:", delTasks.rowsAffected,
  "| notifications:", delNotif.rowsAffected,
  "| onboarding_steps:", delOnb.rowsAffected,
  "| interviews re-pointed:", updInt.rowsAffected,
  "| revisions re-pointed:", updRev.rowsAffected,
);

const delUser = await run("DELETE FROM users WHERE id = ?", [userId]);
console.log("deleted users:", delUser.rowsAffected);

const still = await run("SELECT COUNT(*) AS n FROM users WHERE full_name LIKE ?", [`%${name}%`]);
console.log("remaining matches:", still.rows[0].n);
