import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { bugDetailsSchema, ticketUpdateSchema } from "@devflow/shared";
import { requireProjectMember } from "@/lib/access";
import { createNotification, formatStatusLabel } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string; ticketId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  const { user } = await requireProjectMember(id);
  const body = await req.json().catch(() => null);
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Retrieve existing ticket before updating to check type, parentId, and status
  const [existing] = await db
    .select({
      id: schema.tickets.id,
      type: schema.tickets.type,
      parentId: schema.tickets.parentId,
      status: schema.tickets.status,
      assigneeId: schema.tickets.assigneeId,
      creatorId: schema.tickets.creatorId,
      headline: schema.tickets.headline,
    })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)));

  if (!existing) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  if (existing.type === "bug" && d.bugDetails !== undefined && d.bugDetails !== null) {
    const bugParsed = bugDetailsSchema.safeParse(d.bugDetails);
    if (!bugParsed.success) {
      return NextResponse.json({ error: bugParsed.error.flatten() }, { status: 400 });
    }
  }

  const resolvedAt =
    d.status && ["resolved", "closed", "done"].includes(d.status) ? new Date() : undefined;

  const [updated] = await db
    .update(schema.tickets)
    .set({
      ...(d.headline !== undefined ? { headline: d.headline } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.bugDetails !== undefined ? { bugDetails: d.bugDetails } : {}),
      ...(d.position !== undefined ? { position: d.position } : {}),
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

  // Notification Trigger: Assignee changed
  if (
    d.assigneeId !== undefined &&
    d.assigneeId !== existing.assigneeId &&
    d.assigneeId &&
    d.assigneeId !== user.id
  ) {
    await createNotification({
      userId: d.assigneeId,
      type: "assigned",
      ticketId: updated.id,
      projectId: id,
      message: `Kamu di-assign ke ${updated.type === "bug" ? "bug" : "task"}: ${updated.headline}`,
    });
  }

  // Notification Trigger: Status changed
  if (d.status !== undefined && d.status !== existing.status) {
    const notifyUserIds = Array.from(
      new Set(
        [updated.assigneeId, updated.creatorId].filter(
          (uId): uId is string => Boolean(uId) && uId !== user.id,
        ),
      ),
    );

    for (const targetId of notifyUserIds) {
      await createNotification({
        userId: targetId,
        type: "status_changed",
        ticketId: updated.id,
        projectId: id,
        message: `Status ${updated.type === "bug" ? "bug" : "task"} "${updated.headline}" diubah menjadi ${formatStatusLabel(updated.status)}`,
      });
    }
  }

  // Auto-sync: when a task ticket becomes 'done' and has a parentId, update parent bug to 'ready_for_qa' unless already ready_for_qa/resolved/closed
  const effectiveType = d.type ?? existing.type;
  const effectiveStatus = d.status ?? existing.status;
  const effectiveParentId = d.parentId !== undefined ? d.parentId : existing.parentId;

  if (effectiveType === "task" && effectiveStatus === "done" && effectiveParentId) {
    const [parent] = await db
      .select({
        id: schema.tickets.id,
        type: schema.tickets.type,
        status: schema.tickets.status,
        headline: schema.tickets.headline,
        assigneeId: schema.tickets.assigneeId,
        creatorId: schema.tickets.creatorId,
      })
      .from(schema.tickets)
      .where(and(eq(schema.tickets.id, effectiveParentId), eq(schema.tickets.projectId, id)));

    if (
      parent &&
      parent.type === "bug" &&
      !["ready_for_qa", "resolved", "closed"].includes(parent.status)
    ) {
      await db
        .update(schema.tickets)
        .set({
          status: "ready_for_qa",
          updatedAt: new Date(),
        })
        .where(eq(schema.tickets.id, parent.id));

      const parentNotifyUserIds = Array.from(
        new Set(
          [parent.assigneeId, parent.creatorId].filter(
            (uId): uId is string => Boolean(uId) && uId !== user.id,
          ),
        ),
      );

      for (const targetId of parentNotifyUserIds) {
        await createNotification({
          userId: targetId,
          type: "status_changed",
          ticketId: parent.id,
          projectId: id,
          message: `Bug "${parent.headline}" otomatis berstatus Ready for QA karena task terkait telah selesai`,
        });
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);
  await db.delete(schema.tickets).where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)));
  return new Response(null, { status: 204 });
}