import { NextResponse } from "next/server";
import { ilike } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.user)
    .where(ilike(schema.user.email, `%${q}%`))
    .limit(20);

  return NextResponse.json(users);
}
