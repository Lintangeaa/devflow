import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember } from "@/lib/access";
import { getObject } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string; ticketId: string; mediaId: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id, ticketId, mediaId } = await params;
  await requireProjectMember(id);

  const [ticket] = await db
    .select({ id: schema.tickets.id })
    .from(schema.tickets)
    .where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.projectId, id)))
    .limit(1);
  if (!ticket) return new Response("Ticket not found", { status: 404 });

  const [media] = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), eq(schema.media.ticketId, ticketId)))
    .limit(1);
  if (!media) return new Response("Media not found", { status: 404 });

  const rangeHeader = req.headers.get("range");

  try {
    const s3Res = await getObject(media.fileKey, rangeHeader ?? undefined);

    if (!s3Res.Body) {
      return new Response("Object body empty", { status: 404 });
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
      return new Response("Object not found in storage", { status: 404 });
    }
    throw err;
  }
}
