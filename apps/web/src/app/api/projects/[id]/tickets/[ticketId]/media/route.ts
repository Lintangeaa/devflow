import { NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember } from "@/lib/access";
import { newKey, uploadObject } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string; ticketId: string }> };
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME = /^image\/(png|jpe?g|gif|webp|avif)$|^video\/(mp4|webm|quicktime)$/;

export async function GET(_req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);

  const rows = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.ticketId, ticketId))
    .orderBy(asc(schema.media.createdAt));

  const items = rows.map((m) => ({
    ...m,
    url: `/api/projects/${id}/tickets/${ticketId}/media/${m.id}`,
  }));

  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  const { user } = await requireProjectMember(id);

  const [ticket] = await db
    .select({ id: schema.tickets.id })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)))
    .limit(1);
  if (!ticket) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file wajib" }, { status: 400 });

  const mime = String(file.type).toLowerCase();
  if (!ALLOWED_MIME.test(mime)) {
    return NextResponse.json({ error: `tipe file tidak diizinkan: ${mime}` }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file terlalu besar (maks 50MB)" }, { status: 413 });
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

  return NextResponse.json(
    {
      ...record,
      url: `/api/projects/${id}/tickets/${ticketId}/media/${record.id}`,
    },
    { status: 201 },
  );
}