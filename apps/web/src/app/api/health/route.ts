import { NextResponse } from "next/server";
import { checkDb } from "@devflow/db";

export async function GET() {
  const ok = await checkDb();
  return NextResponse.json({ ok, db: ok, service: "devflow" }, { status: ok ? 200 : 503 });
}