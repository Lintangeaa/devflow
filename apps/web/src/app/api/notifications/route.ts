import { NextResponse } from "next/server";
import { desc, eq, and, count } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";

export async function GET() {
  const { user } = await requireUser();

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

  return NextResponse.json({
    notifications: items,
    unreadCount,
  });
}
