import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@devflow/db";
import { PROJECT_MEMBER_ROLES } from "@devflow/shared";
import { requireProjectOwner } from "@/lib/access";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const updateRoleSchema = z.object({
  role: z.enum(PROJECT_MEMBER_ROLES),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  await requireProjectOwner(id);

  const body = await req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [targetMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });
  }

  if (targetMember.role === "owner" && parsed.data.role !== "owner") {
    const ownerCount = await db.$count(
      schema.projectMembers,
      and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.role, "owner")),
    );
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Tidak dapat mengubah role owner terakhir dari project" },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(schema.projectMembers)
    .set({ role: parsed.data.role })
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  await requireProjectOwner(id);

  const [targetMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    const ownerCount = await db.$count(
      schema.projectMembers,
      and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.role, "owner")),
    );
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus owner terakhir dari project" },
        { status: 400 },
      );
    }
  }

  await db
    .delete(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)));

  return new Response(null, { status: 204 });
}
