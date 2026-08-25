import { Hono } from "hono";
import { and, count, desc, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireAuth, type AppVariables } from "../lib/access.js";

export const notificationsRouter = new Hono<{ Variables: AppVariables }>();

notificationsRouter.use("*", requireAuth);

notificationsRouter.get("/", async (c) => {
  const user = c.get("user");

  const [items, unreadResult] = await Promise.all([
    db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50),
    db
      .select({ count: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, user.id),
          eq(schema.notifications.read, false),
        ),
      ),
  ]);

  const unreadCount = Number(unreadResult[0]?.count ?? 0);

  return c.json({
    notifications: items,
    unreadCount,
  });
});

notificationsRouter.patch("/read-all", async (c) => {
  const user = c.get("user");

  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.read, false),
      ),
    );

  return c.json({ success: true });
});

notificationsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const [updated] = await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.userId, user.id),
      ),
    )
    .returning();

  if (!updated) {
    return c.json({ error: "Notification not found" }, 404);
  }

  return c.json(updated);
});
