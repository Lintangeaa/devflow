import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@devflow/db";
import { ticketSchema } from "@devflow/shared";
import { requireProjectMember } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

const STATUS_BY_TYPE: Record<"task" | "bug", string> = { task: "todo", bug: "new" };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectMember(id);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as "task" | "bug" | null;
  const priority = url.searchParams.get("priority");
  const phaseId = url.searchParams.get("phase");
  const environment = url.searchParams.get("environment");

  const conds = [eq(schema.tickets.projectId, id)];
  if (type) conds.push(eq(schema.tickets.type, type));
  if (priority && ["low", "medium", "high", "critical"].includes(priority)) {
    conds.push(eq(schema.tickets.priority, priority as "low" | "medium" | "high" | "critical"));
  }
  if (phaseId) conds.push(eq(schema.tickets.phaseId, phaseId));

  if (environment === "production") {
    conds.push(eq(schema.tickets.environment, "production"));
  } else if (environment === "non_production" || environment === "non-production") {
    conds.push(or(isNull(schema.tickets.environment), ne(schema.tickets.environment, "production"))!);
  } else if (environment) {
    conds.push(eq(schema.tickets.environment, environment));
  }

  const parentTicket = alias(schema.tickets, "parent_ticket");
  const creatorUser = alias(schema.user, "creator_user");

  const rows = await db
    .select({
      id: schema.tickets.id,
      projectId: schema.tickets.projectId,
      phaseId: schema.tickets.phaseId,
      parentId: schema.tickets.parentId,
      type: schema.tickets.type,
      headline: schema.tickets.headline,
      description: schema.tickets.description,
      bugDetails: schema.tickets.bugDetails,
      position: schema.tickets.position,
      status: schema.tickets.status,
      priority: schema.tickets.priority,
      severity: schema.tickets.severity,
      assigneeId: schema.tickets.assigneeId,
      creatorId: schema.tickets.creatorId,
      dueDate: schema.tickets.dueDate,
      component: schema.tickets.component,
      environment: schema.tickets.environment,
      tags: schema.tickets.tags,
      resolvedAt: schema.tickets.resolvedAt,
      createdAt: schema.tickets.createdAt,
      updatedAt: schema.tickets.updatedAt,
      phaseName: schema.phases.name,
      assigneeName: schema.user.name,
      creatorName: creatorUser.name,
      parentHeadline: parentTicket.headline,
      parentType: parentTicket.type,
    })
    .from(schema.tickets)
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(schema.user, eq(schema.tickets.assigneeId, schema.user.id))
    .leftJoin(creatorUser, eq(schema.tickets.creatorId, creatorUser.id))
    .leftJoin(parentTicket, eq(schema.tickets.parentId, parentTicket.id))
    .where(and(...conds))
    .orderBy(schema.tickets.position, desc(schema.tickets.createdAt));

  const ticketIds = rows.map((r) => r.id);
  const linkedChildTasks =
    ticketIds.length > 0
      ? await db
          .select({
            id: schema.tickets.id,
            headline: schema.tickets.headline,
            parentId: schema.tickets.parentId,
          })
          .from(schema.tickets)
          .where(
            and(
              inArray(schema.tickets.parentId, ticketIds),
              eq(schema.tickets.projectId, id),
            ),
          )
      : [];

  const childTaskMap = new Map<string, { id: string; headline: string }>();
  for (const task of linkedChildTasks) {
    if (task.parentId && !childTaskMap.has(task.parentId)) {
      childTaskMap.set(task.parentId, { id: task.id, headline: task.headline });
    }
  }

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      linkedTaskId: childTaskMap.get(r.id)?.id ?? null,
      linkedTaskHeadline: childTaskMap.get(r.id)?.headline ?? null,
    })),
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user } = await requireProjectMember(id);
  const body = await req.json().catch(() => null);
  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Auto-sync: if creating a task pointing to a bug in 'new'/'open', update bug to 'in_progress'
  if (d.type === "task" && d.parentId) {
    const [parent] = await db
      .select({ id: schema.tickets.id, type: schema.tickets.type, status: schema.tickets.status })
      .from(schema.tickets)
      .where(and(eq(schema.tickets.id, d.parentId), eq(schema.tickets.projectId, id)));

    if (parent && parent.type === "bug" && ["new", "open"].includes(parent.status)) {
      await db
        .update(schema.tickets)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(schema.tickets.id, parent.id));
    }
  }

  const [ticket] = await db
    .insert(schema.tickets)
    .values({
      projectId: id,
      type: d.type,
      headline: d.headline,
      description: d.description ?? null,
      bugDetails: d.bugDetails ?? null,
      position: d.position ?? 0,
      phaseId: d.phaseId ?? null,
      parentId: d.parentId ?? null,
      priority: d.priority,
      severity: d.severity ?? null,
      assigneeId: d.assigneeId ?? null,
      status: d.status ?? STATUS_BY_TYPE[d.type],
      creatorId: user.id,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      component: d.component ?? null,
      environment: d.environment ?? null,
      tags: d.tags ?? [],
    })
    .returning();

  return NextResponse.json(ticket, { status: 201 });
}