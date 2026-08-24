import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { memberSchema } from "@devflow/shared";
import { requireProjectMember, requireProjectOwner } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectMember(id);

  const members = await db
    .select({
      projectId: schema.projectMembers.projectId,
      userId: schema.projectMembers.userId,
      role: schema.projectMembers.role,
      joinedAt: schema.projectMembers.joinedAt,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
    })
    .from(schema.projectMembers)
    .innerJoin(schema.user, eq(schema.projectMembers.userId, schema.user.id))
    .where(eq(schema.projectMembers.projectId, id))
    .orderBy(asc(schema.projectMembers.joinedAt));

  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectOwner(id);

  const body = await req.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  const [targetUser] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const [existingMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (existingMember) {
    return NextResponse.json({ error: "User sudah menjadi member project ini" }, { status: 409 });
  }

  const [newMember] = await db
    .insert(schema.projectMembers)
    .values({
      projectId: id,
      userId,
      role,
    })
    .returning();

  return NextResponse.json(
    {
      ...newMember,
      name: targetUser.name,
      email: targetUser.email,
      image: targetUser.image,
    },
    { status: 201 },
  );
}
