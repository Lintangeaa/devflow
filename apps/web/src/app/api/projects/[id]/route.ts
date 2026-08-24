import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember, requireProjectOwner } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectMember(id);
  const project = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!project.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const phases = await db
    .select()
    .from(schema.phases)
    .where(eq(schema.phases.projectId, id))
    .orderBy(schema.phases.order);
  return NextResponse.json({ ...project[0], phases });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectOwner(id);
  const body = await req.json().catch(() => null);
  const { name, slug, description, status } = body ?? {};
  const [updated] = await db
    .update(schema.projects)
    .set({
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectOwner(id);
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return new Response(null, { status: 204 });
}
