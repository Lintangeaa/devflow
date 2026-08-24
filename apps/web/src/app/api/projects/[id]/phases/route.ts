import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { phaseSchema } from "@devflow/shared";
import { requireProjectOwner } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const phases = await db
    .select()
    .from(schema.phases)
    .where(eq(schema.phases.projectId, id))
    .orderBy(schema.phases.order);
  return NextResponse.json(phases);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectOwner(id);
  const body = await req.json().catch(() => null);
  const parsed = phaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await db.$count(schema.phases, eq(schema.phases.projectId, id));
  const order = parsed.data.order ?? count;

  const [phase] = await db
    .insert(schema.phases)
    .values({ projectId: id, name: parsed.data.name, order, color: parsed.data.color ?? "#6366f1" })
    .returning();
  return NextResponse.json(phase, { status: 201 });
}