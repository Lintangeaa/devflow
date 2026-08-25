import { Hono } from "hono";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import ExcelJS from "exceljs";
import { db, schema } from "@devflow/db";
import {
  projectSchema,
  memberSchema,
  phaseSchema,
  PROJECT_MEMBER_ROLES,
  TASK_STATUSES,
  BUG_STATUSES,
} from "@devflow/shared";
import {
  requireAuth,
  requireProjectMember,
  requireProjectOwner,
  type AppVariables,
} from "../lib/access.js";

export const projectsRouter = new Hono<{ Variables: AppVariables }>();

projectsRouter.use("*", requireAuth);

// GET /api/projects — projects that current user belongs to
projectsRouter.get("/", async (c) => {
  const user = c.get("user");
  const memberships = await db
    .select({ projectId: schema.projectMembers.projectId, role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.userId, user.id));

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return c.json([]);
  }

  const projects = await db
    .select()
    .from(schema.projects)
    .where(inArray(schema.projects.id, projectIds))
    .orderBy(desc(schema.projects.createdAt));

  return c.json(
    projects.map((p) => ({
      ...p,
      role: memberships.find((m) => m.projectId === p.id)?.role ?? null,
    })),
  );
});

const DEFAULT_STANDARD_PHASES = [
  { name: "Planning", color: "#6366f1", order: 0 },
  { name: "In Progress", color: "#f59e0b", order: 1 },
  { name: "Testing", color: "#8b5cf6", order: 2 },
  { name: "Done", color: "#10b981", order: 3 },
];

// POST /api/projects
projectsRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const { name, slug, description } = parsed.data;

  const [project] = await db
    .insert(schema.projects)
    .values({ name, slug, description: description ?? null, ownerId: user.id })
    .returning();

  await db
    .insert(schema.projectMembers)
    .values({ projectId: project.id, userId: user.id, role: "owner" });

  // Automatically create standard 4 workflow phases
  const phases = await db
    .insert(schema.phases)
    .values(
      DEFAULT_STANDARD_PHASES.map((p) => ({
        projectId: project.id,
        name: p.name,
        color: p.color,
        order: p.order,
      })),
    )
    .returning();

  return c.json({ ...project, phases }, 201);
});

// GET /api/projects/:id
projectsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  await requireProjectMember(c, id);

  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!project) return c.json({ error: "not found" }, 404);

  let phases = await db
    .select()
    .from(schema.phases)
    .where(eq(schema.phases.projectId, id))
    .orderBy(schema.phases.order);

  // Auto-backfill 4 standard phases if project has none
  if (phases.length === 0) {
    phases = await db
      .insert(schema.phases)
      .values(
        DEFAULT_STANDARD_PHASES.map((p) => ({
          projectId: id,
          name: p.name,
          color: p.color,
          order: p.order,
        })),
      )
      .returning();
  }

  return c.json({ ...project, phases });
});

// PATCH /api/projects/:id
projectsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  await requireProjectOwner(c, id);

  const body = await c.req.json().catch(() => null);
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

  return c.json(updated);
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await requireProjectOwner(c, id);
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return c.body(null, 204);
});

// GET /api/projects/:id/members
projectsRouter.get("/:id/members", async (c) => {
  const id = c.req.param("id");
  await requireProjectMember(c, id);

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

  return c.json(members);
});

// POST /api/projects/:id/members
projectsRouter.post("/:id/members", async (c) => {
  const id = c.req.param("id");
  await requireProjectOwner(c, id);

  const body = await c.req.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
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
    return c.json({ error: "User tidak ditemukan" }, 404);
  }

  const [existingMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (existingMember) {
    return c.json({ error: "User sudah menjadi member project ini" }, 409);
  }

  const [newMember] = await db
    .insert(schema.projectMembers)
    .values({
      projectId: id,
      userId,
      role,
    })
    .returning();

  return c.json(
    {
      ...newMember,
      name: targetUser.name,
      email: targetUser.email,
      image: targetUser.image,
    },
    201,
  );
});

// PATCH /api/projects/:id/members/:userId
const updateRoleSchema = z.object({
  role: z.enum(PROJECT_MEMBER_ROLES),
});

projectsRouter.patch("/:id/members/:userId", async (c) => {
  const id = c.req.param("id");
  const userId = c.req.param("userId");
  await requireProjectOwner(c, id);

  const body = await c.req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [targetMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (!targetMember) {
    return c.json({ error: "Member tidak ditemukan" }, 404);
  }

  if (targetMember.role === "owner" && parsed.data.role !== "owner") {
    const ownerCount = await db.$count(
      schema.projectMembers,
      and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.role, "owner")),
    );
    if (ownerCount <= 1) {
      return c.json({ error: "Tidak dapat mengubah role owner terakhir dari project" }, 400);
    }
  }

  const [updated] = await db
    .update(schema.projectMembers)
    .set({ role: parsed.data.role })
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .returning();

  return c.json(updated);
});

// DELETE /api/projects/:id/members/:userId
projectsRouter.delete("/:id/members/:userId", async (c) => {
  const id = c.req.param("id");
  const userId = c.req.param("userId");
  await requireProjectOwner(c, id);

  const [targetMember] = await db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)))
    .limit(1);

  if (!targetMember) {
    return c.json({ error: "Member tidak ditemukan" }, 404);
  }

  if (targetMember.role === "owner") {
    const ownerCount = await db.$count(
      schema.projectMembers,
      and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.role, "owner")),
    );
    if (ownerCount <= 1) {
      return c.json({ error: "Tidak dapat menghapus owner terakhir dari project" }, 400);
    }
  }

  await db
    .delete(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, id), eq(schema.projectMembers.userId, userId)));

  return c.body(null, 204);
});

// GET /api/projects/:id/phases
projectsRouter.get("/:id/phases", async (c) => {
  const id = c.req.param("id");
  const phases = await db
    .select()
    .from(schema.phases)
    .where(eq(schema.phases.projectId, id))
    .orderBy(schema.phases.order);
  return c.json(phases);
});

// POST /api/projects/:id/phases
projectsRouter.post("/:id/phases", async (c) => {
  const id = c.req.param("id");
  await requireProjectOwner(c, id);
  const body = await c.req.json().catch(() => null);
  const parsed = phaseSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const count = await db.$count(schema.phases, eq(schema.phases.projectId, id));
  const order = parsed.data.order ?? count;

  const [phase] = await db
    .insert(schema.phases)
    .values({ projectId: id, name: parsed.data.name, order, color: parsed.data.color ?? "#6366f1" })
    .returning();
  return c.json(phase, 201);
});

// GET /api/projects/:id/overview
projectsRouter.get("/:id/overview", async (c) => {
  const id = c.req.param("id");
  await requireProjectMember(c, id);

  const parentTicket = alias(schema.tickets, "parent_ticket");
  const creatorUser = alias(schema.user, "creator_user");

  const allRows = await db
    .select({
      id: schema.tickets.id,
      projectId: schema.tickets.projectId,
      phaseId: schema.tickets.phaseId,
      parentId: schema.tickets.parentId,
      type: schema.tickets.type,
      headline: schema.tickets.headline,
      description: schema.tickets.description,
      bugDetails: schema.tickets.bugDetails,
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
    .where(eq(schema.tickets.projectId, id))
    .orderBy(desc(schema.tickets.updatedAt));

  const ticketIds = allRows.map((r) => r.id);
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

  const allRowsWithLinks = allRows.map((r) => ({
    ...r,
    linkedTaskId: childTaskMap.get(r.id)?.id ?? null,
    linkedTaskHeadline: childTaskMap.get(r.id)?.headline ?? null,
  }));

  const taskCounts: Record<string, number> = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  const bugCounts: Record<string, number> = Object.fromEntries(BUG_STATUSES.map((s) => [s, 0]));
  const prodBugCounts: Record<string, number> = Object.fromEntries(BUG_STATUSES.map((s) => [s, 0]));

  let totalTasks = 0;
  let totalBugs = 0;
  let totalProdBugs = 0;

  const inProgressTickets = allRowsWithLinks.filter((item) => item.status === "in_progress");

  for (const item of allRowsWithLinks) {
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

  return c.json({
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
});

// GET /api/projects/:id/export
const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const TYPE_LABEL = { task: "Task", bug: "Bug" };

function formatBugDetails(d: schema.BugDetails | null | undefined): string {
  if (!d) return "";
  return [
    `Feature: ${d.feature || ""}`,
    `Devices: ${d.devices || ""}`,
    `Scenario: ${d.scenario || ""}`,
    `Given: ${d.given || ""}`,
    `When: ${d.when || ""}`,
    `Then: ${d.then || ""}`,
    `Output: ${d.output || ""}`,
  ].join("\n");
}

projectsRouter.get("/:id/export", async (c) => {
  const id = c.req.param("id");
  await requireProjectMember(c, id);

  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!project) return c.text("not found", 404);

  const creatorUser = alias(schema.user, "creator_user");

  const rows = await db
    .select({
      t: schema.tickets,
      phaseName: schema.phases.name,
      assigneeName: schema.user.name,
      creatorName: creatorUser.name,
    })
    .from(schema.tickets)
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(schema.user, eq(schema.tickets.assigneeId, schema.user.id))
    .leftJoin(creatorUser, eq(schema.tickets.creatorId, creatorUser.id))
    .where(eq(schema.tickets.projectId, id))
    .orderBy(sql`${schema.tickets.type} ASC, ${schema.tickets.priority} DESC`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tickets");

  ws.columns = [
    { header: "ID", key: "id", width: 12 },
    { header: "Type", key: "type", width: 8 },
    { header: "Headline", key: "headline", width: 40 },
    { header: "Status", key: "status", width: 14 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Severity", key: "severity", width: 10 },
    { header: "Phase", key: "phase", width: 16 },
    { header: "Assignee", key: "assignee", width: 18 },
    { header: "Creator", key: "creator", width: 18 },
    { header: "Component", key: "component", width: 16 },
    { header: "Tags", key: "tags", width: 20 },
    { header: "Created", key: "created", width: 20 },
    { header: "Updated", key: "updated", width: 20 },
    { header: "Resolved", key: "resolved", width: 20 },
    { header: "Description", key: "description", width: 50 },
  ];

  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    const desc =
      r.t.type === "bug" && r.t.bugDetails
        ? formatBugDetails(r.t.bugDetails)
        : (r.t.description ?? "");

    const rr = ws.addRow({
      id: r.t.id,
      type: TYPE_LABEL[r.t.type as keyof typeof TYPE_LABEL] ?? r.t.type,
      headline: r.t.headline,
      status: r.t.status,
      priority: r.t.priority,
      severity: r.t.severity ?? "",
      phase: r.phaseName ?? "",
      assignee: r.assigneeName ?? "",
      creator: r.creatorName ?? "",
      component: r.t.component ?? "",
      tags: (r.t.tags ?? []).join(", "),
      created: r.t.createdAt?.toISOString().slice(0, 10) ?? "",
      updated: r.t.updatedAt?.toISOString().slice(0, 10) ?? "",
      resolved: r.t.resolvedAt?.toISOString().slice(0, 10) ?? "",
      description: desc,
    });
    if (r.t.priority && PRIORITY_RANK[r.t.priority] >= 3) {
      rr.getCell("priority").font = { bold: true, color: { argb: "FF9B0000" } };
    }
  }

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return c.body(buf, 200, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="devflow-${project.slug}-tickets.xlsx"`,
  });
});
