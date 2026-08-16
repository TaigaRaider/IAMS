import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db.js";
import { notifications } from "../db/schema.js";
import { verifyAuth } from "../middleware/auth.middleware.js";
import { compare } from "../utils/compare.js";

const notificationRouter = Router();

// GET /api/notifications — the signed-in user's own notifications, newest
// first, with the running unread count for a badge.
notificationRouter.get("/", verifyAuth, async (req, res, next) => {
  try {
    const items = await db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        message: notifications.message,
        is_read: notifications.is_read,
        created_at: notifications.created_at,
      })
      .from(notifications)
      .where(eq(notifications.user_id, Number(req.user.sub)))
      .orderBy(desc(notifications.created_at))
      .limit(50)
      .all();

    const unreadRow = await db
      .select({ count: notifications.is_read })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, Number(req.user.sub)),
          eq(notifications.is_read, 0),
        ),
      )
      .all();

    res.json({ data: { items, unread: unreadRow.length } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — mark one of your own as read.
notificationRouter.patch("/:id/read", verifyAuth, async (req, res, next) => {
  try {
    const row = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, Number(req.params.id)),
          eq(notifications.user_id, Number(req.user.sub)),
        ),
      )
      .get();
    if (!row) {
      return res.status(404).json({ error: "Notification not found" });
    }
    await db
      .update(notifications)
      .set({ is_read: 1 })
      .where(eq(notifications.id, row.id))
      .run();
    res.json({ data: { id: row.id } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — mark everything of the user's as read.
notificationRouter.patch("/read-all", verifyAuth, async (req, res, next) => {
  try {
    await db
      .update(notifications)
      .set({ is_read: 1 })
      .where(eq(notifications.user_id, Number(req.user.sub)))
      .run();
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — dismiss one of your own notifications.
notificationRouter.delete("/:id", verifyAuth, async (req, res, next) => {
  try {
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, Number(req.params.id)),
          eq(notifications.user_id, Number(req.user.sub)),
        ),
      )
      .run();
    if (!compare(Number(result.rowsAffected), 1)) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export { notificationRouter };