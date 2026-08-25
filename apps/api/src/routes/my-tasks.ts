import { Hono } from "hono";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@devflow/db";
import { requireAuth, type AppVariables } from "../lib/access.js";

export const myTasksRouter = new Hono<{ Variables: AppVariables }>();

myTasksRouter.use("*", requireAuth);

// GET /api/my-tasks
myTasksRouter.get("/", async (c) => {
  const user = c.get("user");
  const view = c.req.query("view") || "assigned"; // "assigned" | "reported" | "mentioned"
  const projectIdParam = c.req.query("projectId");
  const typeParam = c.req.query("type"); // "all" | "task" | "bug"
  const priorityParam = c.req.query("priority");
  const searchParam = c.req.query("search")?.trim().toLowerCase();

  // 1. Get all projects where the user is a member
  const memberships = await db
    .select({
      projectId: schema.projectMembers.projectId,
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      role: schema.projectMembers.role,
    })
    .from(schema.projectMembers)
    .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
    .where(eq(schema.projectMembers.userId, user.id));

  const userProjectIds = memberships.map((m) => m.projectId);
  if (userProjectIds.length === 0) {
    return c.json({
      metrics: {
        totalAssigned: 0,
        totalReported: 0,
        totalMentioned: 0,
        totalInProgress: 0,
        totalTodo: 0,
        totalDueSoon: 0,
        totalResolved: 0,
      },
      projects: [],
      tickets: [],
    });
  }

  // 2. Compute user overall metrics across all projects
  const allUserAssigned = await db
    .select({
      id: schema.tickets.id,
      status: schema.tickets.status,
      dueDate: schema.tickets.dueDate,
    })
    .from(schema.tickets)
    .where(
      and(
        eq(schema.tickets.assigneeId, user.id),
        inArray(schema.tickets.projectId, userProjectIds),
      ),
    );

  const reportedCount = await db.$count(
    schema.tickets,
    and(
      eq(schema.tickets.creatorId, user.id),
      inArray(schema.tickets.projectId, userProjectIds),
    ),
  );

  // Mentioned ticket IDs from notifications
  const mentionedNotifs = await db
    .selectDistinct({ ticketId: schema.notifications.ticketId })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.type, "mentioned"),
        inArray(schema.notifications.projectId, userProjectIds),
      ),
    );
  const mentionedTicketIds = mentionedNotifs.map((n) => n.ticketId);

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let totalInProgress = 0;
  let totalTodo = 0;
  let totalDueSoon = 0;
  let totalResolved = 0;

  for (const t of allUserAssigned) {
    if (t.status === "in_progress") totalInProgress++;
    else if (["todo", "new", "open"].includes(t.status)) totalTodo++;
    else if (["resolved", "done", "closed"].includes(t.status)) totalResolved++;

    if (t.dueDate) {
      const due = new Date(t.dueDate);
      if (due <= threeDaysFromNow && !["resolved", "done", "closed"].includes(t.status)) {
        totalDueSoon++;
      }
    }
  }

  const metrics = {
    totalAssigned: allUserAssigned.length,
    totalReported: reportedCount,
    totalMentioned: mentionedTicketIds.length,
    totalInProgress,
    totalTodo,
    totalDueSoon,
    totalResolved,
  };

  // 3. Build target query filter for the requested view
  const conditions = [inArray(schema.tickets.projectId, userProjectIds)];

  if (projectIdParam && userProjectIds.includes(projectIdParam)) {
    conditions.push(eq(schema.tickets.projectId, projectIdParam));
  }

  if (typeParam && (typeParam === "task" || typeParam === "bug")) {
    conditions.push(eq(schema.tickets.type, typeParam));
  }

  if (priorityParam && ["low", "medium", "high", "critical"].includes(priorityParam)) {
    conditions.push(eq(schema.tickets.priority, priorityParam as any));
  }

  if (view === "reported") {
    conditions.push(eq(schema.tickets.creatorId, user.id));
  } else if (view === "mentioned") {
    if (mentionedTicketIds.length === 0) {
      return c.json({
        metrics,
        projects: memberships,
        tickets: [],
      });
    }
    conditions.push(inArray(schema.tickets.id, mentionedTicketIds));
  } else {
    // default: "assigned"
    conditions.push(eq(schema.tickets.assigneeId, user.id));
  }

  const assigneeUser = alias(schema.user, "assignee_user");
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
      projectName: schema.projects.name,
      projectSlug: schema.projects.slug,
      phaseName: schema.phases.name,
      assigneeName: assigneeUser.name,
      assigneeImage: assigneeUser.image,
      creatorName: creatorUser.name,
      creatorImage: creatorUser.image,
      commentsCount: sql<number>`cast(count(distinct ${schema.comments.id}) as integer)`,
      mediaCount: sql<number>`cast(count(distinct ${schema.media.id}) as integer)`,
    })
    .from(schema.tickets)
    .innerJoin(schema.projects, eq(schema.tickets.projectId, schema.projects.id))
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(assigneeUser, eq(schema.tickets.assigneeId, assigneeUser.id))
    .leftJoin(creatorUser, eq(schema.tickets.creatorId, creatorUser.id))
    .leftJoin(schema.comments, eq(schema.tickets.id, schema.comments.ticketId))
    .leftJoin(schema.media, eq(schema.tickets.id, schema.media.ticketId))
    .where(and(...conditions))
    .groupBy(
      schema.tickets.id,
      schema.projects.name,
      schema.projects.slug,
      schema.phases.name,
      assigneeUser.name,
      assigneeUser.image,
      creatorUser.name,
      creatorUser.image,
    )
    .orderBy(desc(schema.tickets.updatedAt));

  const filteredRows = searchParam
    ? rows.filter(
        (r) =>
          r.headline.toLowerCase().includes(searchParam) ||
          r.id.toLowerCase().includes(searchParam) ||
          (r.projectName && r.projectName.toLowerCase().includes(searchParam)),
      )
    : rows;

  return c.json({
    metrics,
    projects: memberships,
    tickets: filteredRows,
  });
});
