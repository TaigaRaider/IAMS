import "dotenv/config";
import { db } from "../src/db.js";
import { users, applications, interviews, offers, offerRevisions, offerMessages, authTokens, internTasks, notifications, onboardingSteps } from "../src/db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { rmSync } from "node:fs";
import { join } from "node:path";

const USER_ID = 29;

const target = await db.select().from(users).where(eq(users.id, USER_ID)).get();
if (!target) {
  console.log("No user with id", USER_ID);
  process.exit(0);
}
console.log("Deleting:", JSON.stringify({ id: target.id, full_name: target.full_name, email: target.email, avatar_url: target.avatar_url }));

const appIds = (await db.select({ id: applications.id }).from(applications).where(eq(applications.applicant_id, USER_ID)).all()).map((r) => r.id);
console.log("applications:", appIds);

for (const appId of appIds) {
  const offerIds = (await db.select({ id: offers.id }).from(offers).where(eq(offers.application_id, appId)).all()).map((r) => r.id);
  for (const oid of offerIds) {
    await db.delete(offerMessages).where(eq(offerMessages.offer_id, oid)).run();
    await db.delete(offerRevisions).where(eq(offerRevisions.offer_id, oid)).run();
  }
  if (offerIds.length) await db.delete(offers).where(inArray(offers.id, offerIds)).run();
  await db.delete(interviews).where(eq(interviews.application_id, appId)).run();
}
if (appIds.length) await db.delete(applications).where(inArray(applications.id, appIds)).run();

await db.delete(authTokens).where(eq(authTokens.user_id, USER_ID)).run();
await db.delete(notifications).where(eq(notifications.user_id, USER_ID)).run();
await db.delete(onboardingSteps).where(eq(onboardingSteps.user_id, USER_ID)).run();
await db.delete(internTasks).where(eq(internTasks.intern_id, USER_ID)).run();

await db.delete(users).where(eq(users.id, USER_ID)).run();

if (target.avatar_url) {
  const name = target.avatar_url.split("/").pop();
  if (name) {
    try {
      rmSync(join("src", "uploads", name), { force: true });
      console.log("removed avatar file:", name);
    } catch {
      console.log("no avatar file at src/uploads/" + name);
    }
  }
}

const gone = await db.select({ id: users.id }).from(users).where(eq(users.id, USER_ID)).get();
console.log(gone ? "STILL EXISTS" : "USER ROW REMOVED");
process.exit(0);