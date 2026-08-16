import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { notifications, users } from "../db/schema.js";

// Fire-and-forget in-app notification. Never throws on its own — a failed
// notify must not take down a business operation that already succeeded.
export async function notify(userId, kind, message) {
  try {
    await db.insert(notifications).values({ user_id: userId, kind, message }).run();
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

// Notify every active admin (used for candidate-driven events like
// accept/decline/withdraw that admins need to act on).
export async function notifyAdmins(kind, message) {
  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.user_role, "admin"))
      .all();
    for (const admin of admins) {
      await notify(admin.id, kind, message);
    }
  } catch (err) {
    console.error("[notifyAdmins] failed:", err);
  }
}