import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@devflow/db";
import { BUG_STATUSES, TASK_STATUSES } from "@devflow/shared";
import { requireProjectMember } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectMember(id);

  const parentTicket = alias(schema.tickets, "parent_ticket");

  // Fetch all tickets for this project
  const allRows = await db
    .select({
      id: schema.tickets.id,
      projectId: schema.tickets.projectId,
      phaseId: schema.tickets.phaseId,
      parentId: schema.tickets.parentId,
      type: schema.tickets.type,
      headline: schema.tickets.headline,
      description: schema.tickets.description,
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
      parentHeadline: parentTicket.headline,
      parentType: parentTicket.type,
    })
    .from(schema.tickets)
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(schema.user, eq(schema.tickets.assigneeId, schema.user.id))
    .leftJoin(parentTicket, eq(schema.tickets.parentId, parentTicket.id))
    .where(eq(schema.tickets.projectId, id))
    .orderBy(desc(schema.tickets.updatedAt));

  // Initialize count aggregates
  const taskCounts: Record<string, number> = Object.fromEntries(
    TASK_STATUSES.map((s) => [s, 0]),
  );

  const bugCounts: Record<string, number> = Object.fromEntries(
    BUG_STATUSES.map((s) => [s, 0]),
  );

  const prodBugCounts: Record<string, number> = Object.fromEntries(
    BUG_STATUSES.map((s) => [s, 0]),
  );

  let totalTasks = 0;
  let totalBugs = 0;
  let totalProdBugs = 0;

  const inProgressTickets = allRows.filter((item) => item.status === "in_progress");

  for (const item of allRows) {
    if (item.type === "task") {
      totalTasks++;
      if (taskCounts[item.status] !== undefined) {
        taskCounts[item.status]++;
      }
    } else if (item.type === "bug") {
      if (item.environment === "production") {
        totalProdBugs++;
        if (prodBugCounts[item.status] !== undefined) {
          prodBugCounts[item.status]++;
        }
      } else {
        totalBugs++;
        if (bugCounts[item.status] !== undefined) {
          bugCounts[item.status]++;
        }
      }
    }
  }

  return NextResponse.json({
    summary: {
      totalTasks,
      totalBugs,
      totalProdBugs,
      totalInProgress: inProgressTickets.length,
    },
    tasks: {
      total: totalTasks,
      byStatus: taskCounts,
    },
    bugs: {
      total: totalBugs,
      byStatus: bugCounts,
    },
    productionBugs: {
      total: totalProdBugs,
      byStatus: prodBugCounts,
    },
    inProgressTickets,
  });
}
