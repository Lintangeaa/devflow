import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";

export async function PATCH() {
  const { user } = await requireUser();

  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.read, false),
      ),
    );

  return NextResponse.json({ success: true });
}
