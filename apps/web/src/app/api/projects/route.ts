import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { projectSchema } from "@devflow/shared";
import { requireUser } from "@/lib/api";

// GET /api/projects — projects that the current user owns or is a member of
export async function GET() {
  const { user } = await requireUser();
  const memberships = await db
    .select({ projectId: schema.projectMembers.projectId, role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.userId, user.id));

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return NextResponse.json([]);
  }
  const projects = await db
    .select()
    .from(schema.projects)
    .where(inArray(schema.projects.id, projectIds))
    .orderBy(desc(schema.projects.createdAt));

  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      role: memberships.find((m) => m.projectId === p.id)?.role ?? null,
    })),
  );
}

// POST /api/projects
export async function POST(req: Request) {
  const { user } = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, slug, description } = parsed.data;

  const [project] = await db
    .insert(schema.projects)
    .values({ name, slug, description: description ?? null, ownerId: user.id })
    .returning();

  await db.insert(schema.projectMembers).values({ projectId: project.id, userId: user.id, role: "owner" });

  return NextResponse.json(project, { status: 201 });
}
