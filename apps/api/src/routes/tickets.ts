import { Hono } from "hono";
import { and, asc, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@devflow/db";
import {
  ticketSchema,
  ticketUpdateSchema,
  bugDetailsSchema,
  commentSchema,
} from "@devflow/shared";
import {
  requireAuth,
  requireProjectMember,
  type AppVariables,
} from "../lib/access.js";
import {
  createNotification,
  formatStatusLabel,
  parseMentions,
} from "../lib/notifications.js";
import { getObject, newKey, uploadObject } from "../lib/s3.js";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MEDIA_MIME = /^image\/(png|jpe?g|gif|webp|avif)$|^video\/(mp4|webm|quicktime)$/;

export const ticketsRouter = new Hono<{ Variables: AppVariables }>();

ticketsRouter.use("*", requireAuth);

// GET /api/projects/:id/tickets
ticketsRouter.get("/", async (c) => {
  const id = c.req.param("id")!;
  await requireProjectMember(c, id);

  const type = c.req.query("type") as "task" | "bug" | undefined;
  const priority = c.req.query("priority");
  const phaseId = c.req.query("phase");
  const environment = c.req.query("environment");

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
  const [linkedChildTasks, commentCounts, mediaCounts] =
    ticketIds.length > 0
      ? await Promise.all([
          db
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
            ),
          db
            .select({
              ticketId: schema.comments.ticketId,
              count: count(),
            })
            .from(schema.comments)
            .where(inArray(schema.comments.ticketId, ticketIds))
            .groupBy(schema.comments.ticketId),
          db
            .select({
              ticketId: schema.media.ticketId,
              count: count(),
            })
            .from(schema.media)
            .where(inArray(schema.media.ticketId, ticketIds))
            .groupBy(schema.media.ticketId),
        ])
      : [[], [], []];

  const childTaskMap = new Map<string, { id: string; headline: string }>();
  for (const task of linkedChildTasks) {
    if (task.parentId && !childTaskMap.has(task.parentId)) {
      childTaskMap.set(task.parentId, { id: task.id, headline: task.headline });
    }
  }

  const commentCountMap = new Map<string, number>();
  for (const cItem of commentCounts) {
    commentCountMap.set(cItem.ticketId, Number(cItem.count));
  }

  const mediaCountMap = new Map<string, number>();
  for (const m of mediaCounts) {
    mediaCountMap.set(m.ticketId, Number(m.count));
  }

  return c.json(
    rows.map((r) => ({
      ...r,
      linkedTaskId: childTaskMap.get(r.id)?.id ?? null,
      linkedTaskHeadline: childTaskMap.get(r.id)?.headline ?? null,
      commentCount: commentCountMap.get(r.id) ?? 0,
      mediaCount: mediaCountMap.get(r.id) ?? 0,
    })),
  );
});

// POST /api/projects/:id/tickets
ticketsRouter.post("/", async (c) => {
  const id = c.req.param("id")!;
  const { user } = await requireProjectMember(c, id);
  const body = await c.req.json().catch(() => null);
  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
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
      description: d.type === "task" ? d.description : null,
      bugDetails: d.type === "bug" ? d.bugDetails : null,
      phaseId: d.type === "task" ? d.phaseId : null,
      parentId: d.parentId ?? null,
      priority: d.priority ?? "medium",
      severity: d.type === "bug" ? d.severity : null,
      assigneeId: d.assigneeId ?? null,
      creatorId: user.id,
      status: d.status ?? (d.type === "task" ? "todo" : "new"),
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      component: d.component ?? null,
      environment: d.environment ?? null,
      tags: d.tags ?? [],
    })
    .returning();

  if (ticket.assigneeId && ticket.assigneeId !== user.id) {
    await createNotification({
      userId: ticket.assigneeId,
      type: "assigned",
      ticketId: ticket.id,
      projectId: id,
      message: `Kamu di-assign ke ${ticket.type === "bug" ? "bug" : "task"}: ${ticket.headline}`,
    });
  }

  return c.json(ticket, 201);
});

// PATCH /api/projects/:id/tickets/:ticketId
ticketsRouter.patch("/:ticketId", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  const { user } = await requireProjectMember(c, id);

  const body = await c.req.json().catch(() => null);
  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

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

  if (!existing) return c.json({ error: "ticket not found" }, 404);

  if (existing.type === "bug" && d.bugDetails !== undefined && d.bugDetails !== null) {
    const bugParsed = bugDetailsSchema.safeParse(d.bugDetails);
    if (!bugParsed.success) {
      return c.json({ error: bugParsed.error.flatten() }, 400);
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

  // Auto-sync: when a task ticket becomes 'done' and has a parentId, update parent bug to 'ready_for_qa'
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

  return c.json(updated);
});

// DELETE /api/projects/:id/tickets/:ticketId
ticketsRouter.delete("/:ticketId", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  await requireProjectMember(c, id);
  await db.delete(schema.tickets).where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)));
  return c.body(null, 204);
});

// GET /api/projects/:id/tickets/:ticketId/comments
ticketsRouter.get("/:ticketId/comments", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  await requireProjectMember(c, id);

  const rows = await db
    .select({
      id: schema.comments.id,
      ticketId: schema.comments.ticketId,
      userId: schema.comments.userId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      user: {
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      },
    })
    .from(schema.comments)
    .leftJoin(schema.user, eq(schema.comments.userId, schema.user.id))
    .where(eq(schema.comments.ticketId, ticketId))
    .orderBy(asc(schema.comments.createdAt));

  return c.json({ comments: rows });
});

// POST /api/projects/:id/tickets/:ticketId/comments
ticketsRouter.post("/:ticketId/comments", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  const { user } = await requireProjectMember(c, id);

  const body = await c.req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [ticket] = await db
    .select({
      id: schema.tickets.id,
      headline: schema.tickets.headline,
      type: schema.tickets.type,
      assigneeId: schema.tickets.assigneeId,
      creatorId: schema.tickets.creatorId,
    })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)));

  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  const [comment] = await db
    .insert(schema.comments)
    .values({
      ticketId,
      userId: user.id,
      body: parsed.data.body,
    })
    .returning();

  const authorName = user.name || "Seseorang";
  const mentionedUserIds = parseMentions(parsed.data.body).filter((uId) => uId !== user.id);

  for (const mentionedId of mentionedUserIds) {
    await createNotification({
      userId: mentionedId,
      type: "mentioned",
      ticketId: ticket.id,
      projectId: id,
      message: `${authorName} me-mention Anda di tiket: ${ticket.headline}`,
    });
  }

  const ticketStakeholders = Array.from(
    new Set(
      [ticket.assigneeId, ticket.creatorId].filter(
        (uId): uId is string => Boolean(uId) && uId !== user.id && !mentionedUserIds.includes(uId!),
      ),
    ),
  );

  for (const stakeholderId of ticketStakeholders) {
    await createNotification({
      userId: stakeholderId,
      type: "comment",
      ticketId: ticket.id,
      projectId: id,
      message: `${authorName} berkomentar di tiket: ${ticket.headline}`,
    });
  }

  return c.json(
    {
      ...comment,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    },
    201,
  );
});

// DELETE /api/projects/:id/tickets/:ticketId/comments/:commentId
ticketsRouter.delete("/:ticketId/comments/:commentId", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  const commentId = c.req.param("commentId")!;
  const { user, role } = await requireProjectMember(c, id);

  const [comment] = await db
    .select()
    .from(schema.comments)
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.ticketId, ticketId)));

  if (!comment) {
    return c.json({ error: "Komentar tidak ditemukan" }, 404);
  }

  if (comment.userId !== user.id && role !== "owner") {
    return c.json({ error: "Anda tidak memiliki izin untuk menghapus komentar ini" }, 403);
  }

  await db.delete(schema.comments).where(eq(schema.comments.id, commentId));

  return c.body(null, 204);
});

// GET /api/projects/:id/tickets/:ticketId/media
ticketsRouter.get("/:ticketId/media", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  await requireProjectMember(c, id);

  const rows = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.ticketId, ticketId))
    .orderBy(asc(schema.media.createdAt));

  const items = rows.map((m) => ({
    ...m,
    url: `/api/projects/${id}/tickets/${ticketId}/media/${m.id}`,
  }));

  return c.json(items);
});

// POST /api/projects/:id/tickets/:ticketId/media
ticketsRouter.post("/:ticketId/media", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  const { user } = await requireProjectMember(c, id);

  const [ticket] = await db
    .select({ id: schema.tickets.id })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)))
    .limit(1);
  if (!ticket) return c.json({ error: "ticket not found" }, 404);

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "file wajib" }, 400);

  const mime = String(file.type).toLowerCase();
  if (!ALLOWED_MEDIA_MIME.test(mime)) {
    return c.json({ error: `tipe file tidak diizinkan: ${mime}` }, 415);
  }
  if (file.size > MAX_MEDIA_SIZE) {
    return c.json({ error: "file terlalu besar (maks 50MB)" }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = newKey(`media/${ticketId}`, file.name);

  await uploadObject(key, buffer, mime);

  const [record] = await db
    .insert(schema.media)
    .values({
      ticketId,
      uploadedBy: user.id,
      fileKey: key,
      originalName: file.name,
      mime,
      size: file.size,
      width: null,
      height: null,
      duration: null,
    })
    .returning();

  return c.json(
    {
      ...record,
      url: `/api/projects/${id}/tickets/${ticketId}/media/${record.id}`,
    },
    201,
  );
});

// GET /api/projects/:id/tickets/:ticketId/media/:mediaId
ticketsRouter.get("/:ticketId/media/:mediaId", async (c) => {
  const id = c.req.param("id")!;
  const ticketId = c.req.param("ticketId")!;
  const mediaId = c.req.param("mediaId")!;
  await requireProjectMember(c, id);

  const [ticket] = await db
    .select({ id: schema.tickets.id })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)))
    .limit(1);
  if (!ticket) return c.text("Ticket not found", 404);

  const [media] = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), eq(schema.media.ticketId, ticketId)))
    .limit(1);
  if (!media) return c.text("Media not found", 404);

  const rangeHeader = c.req.header("range");

  try {
    const s3Res = await getObject(media.fileKey, rangeHeader ?? undefined);
    if (!s3Res.Body) {
      return c.text("Object body empty", 404);
    }

    const stream = s3Res.Body.transformToWebStream();
    const headers = new Headers();

    headers.set("Content-Type", media.mime || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("Accept-Ranges", "bytes");

    if (s3Res.ContentLength !== undefined) {
      headers.set("Content-Length", String(s3Res.ContentLength));
    }

    if (rangeHeader && s3Res.ContentRange) {
      headers.set("Content-Range", s3Res.ContentRange);
      return new Response(stream, {
        status: 206,
        headers,
      });
    }

    return new Response(stream, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") {
      return c.text("Object not found in storage", 404);
    }
    throw err;
  }
});
