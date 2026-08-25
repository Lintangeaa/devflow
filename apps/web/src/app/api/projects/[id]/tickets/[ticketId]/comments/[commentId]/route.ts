import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember } from "@/lib/access";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; ticketId: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, ticketId, commentId } = await params;
  const { user, role } = await requireProjectMember(id);

  const [comment] = await db
    .select()
    .from(schema.comments)
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.ticketId, ticketId)));

  if (!comment) {
    throw new HttpError(404, "Komentar tidak ditemukan");
  }

  // Only author or project owner can delete
  if (comment.userId !== user.id && role !== "owner") {
    throw new HttpError(403, "Anda tidak memiliki izin untuk menghapus komentar ini");
  }

  await db.delete(schema.comments).where(eq(schema.comments.id, commentId));

  return new Response(null, { status: 204 });
}
