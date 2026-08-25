import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { commentSchema } from "@devflow/shared";
import { requireProjectMember } from "@/lib/access";
import { createNotification, parseMentions } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string; ticketId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);

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

  return NextResponse.json({ comments: rows });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  const { user } = await requireProjectMember(id);

  const body = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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

  // 1. Dispatch mention notifications
  for (const mentionedId of mentionedUserIds) {
    await createNotification({
      userId: mentionedId,
      type: "mentioned",
      ticketId: ticket.id,
      projectId: id,
      message: `${authorName} me-mention Anda di tiket: ${ticket.headline}`,
    });
  }

  // 2. Dispatch comment notifications to assignee and creator (if not already notified via mention)
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

  return NextResponse.json(
    {
      ...comment,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    },
    { status: 201 },
  );
}
