import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
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

  const conds = [eq(schema.tickets.projectId, id)];
  if (type) conds.push(eq(schema.tickets.type, type));
  if (priority && ["low", "medium", "high", "critical"].includes(priority)) {
    conds.push(eq(schema.tickets.priority, priority as "low" | "medium" | "high" | "critical"));
  }
  if (phaseId) conds.push(eq(schema.tickets.phaseId, phaseId));

  const rows = await db
    .select({
      t: schema.tickets,
      phaseName: schema.phases.name,
      assigneeName: schema.user.name,
    })
    .from(schema.tickets)
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(schema.user, eq(schema.tickets.assigneeId, schema.user.id))
    .where(and(...conds))
    .orderBy(desc(schema.tickets.createdAt));

  return NextResponse.json(rows.map((r) => ({ ...r.t, phaseName: r.phaseName, assigneeName: r.assigneeName })));
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
  const [ticket] = await db
    .insert(schema.tickets)
    .values({
      projectId: id,
      type: d.type,
      headline: d.headline,
      description: d.description ?? null,
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