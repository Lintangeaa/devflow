import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember } from "@/lib/access";
import { newKey, signedUrl, uploadObject } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string; ticketId: string }> };
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME = /^image\/(png|jpe?g|gif|webp|avif)$|^video\/(mp4|webm|quicktime)$/;

export async function GET(_req: Request, { params }: Ctx) {
  const { id, ticketId } = await params;
  await requireProjectMember(id);
  const rows = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.ticketId, ticketId), eq(schema.media.ticketId, ticketId)))
    .orderBy(asc(schema.media.createdAt));
  const items = await Promise.all(
    rows.map(async (m) => ({ ...m, url: await signedUrl(m.fileKey) })),
  );
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

  return NextResponse.json({ ...record, url: await signedUrl(key) }, { status: 201 });
}