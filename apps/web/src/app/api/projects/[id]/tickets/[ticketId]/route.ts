import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { ticketUpdateSchema } from "@devflow/shared";
import { requireProjectMember } from "@/lib/access";

type Ctx = { params: Promise<{ id: string; ticketId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);
  const body = await req.json().catch(() => null);
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const resolvedAt =
    d.status && ["resolved", "closed", "done"].includes(d.status) ? new Date() : undefined;

  const [updated] = await db
    .update(schema.tickets)
    .set({
      ...(d.headline !== undefined ? { headline: d.headline } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.phaseId !== undefined ? { phaseId: d.phaseId } : {}),
      ...(d.priority !== undefined ? { priority: d.priority } : {}),
      ...(d.severity !== undefined ? { severity: d.severity } : {}),
      ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
      ...(d.component !== undefined ? { component: d.component } : {}),
      ...(d.environment !== undefined ? { environment: d.environment } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
      ...(resolvedAt ? { resolvedAt } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "ticket not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);
  await db.delete(schema.tickets).where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)));
  return new Response(null, { status: 204 });
}