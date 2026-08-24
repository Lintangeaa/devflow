import ExcelJS from "exceljs";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireProjectMember } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const TYPE_LABEL = { task: "Task", bug: "Bug" };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await requireProjectMember(id);

  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!project) return new Response("not found", { status: 404 });

  const rows = await db
    .select({
      t: schema.tickets,
      phaseName: schema.phases.name,
      assigneeName: schema.user.name,
    })
    .from(schema.tickets)
    .leftJoin(schema.phases, eq(schema.tickets.phaseId, schema.phases.id))
    .leftJoin(schema.user, eq(schema.tickets.assigneeId, schema.user.id))
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
    { header: "Component", key: "component", width: 16 },
    { header: "Tags", key: "tags", width: 20 },
    { header: "Created", key: "created", width: 20 },
    { header: "Updated", key: "updated", width: 20 },
    { header: "Description", key: "description", width: 50 },
  ];

  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    const rr = ws.addRow({
      id: r.t.id,
      type: TYPE_LABEL[r.t.type as keyof typeof TYPE_LABEL] ?? r.t.type,
      headline: r.t.headline,
      status: r.t.status,
      priority: r.t.priority,
      severity: r.t.severity ?? "",
      phase: r.phaseName ?? "",
      assignee: r.assigneeName ?? "",
      component: r.t.component ?? "",
      tags: (r.t.tags ?? []).join(", "),
      created: r.t.createdAt?.toISOString().slice(0, 10) ?? "",
      updated: r.t.updatedAt?.toISOString().slice(0, 10) ?? "",
      description: r.t.description ?? "",
    });
    if (r.t.priority && PRIORITY_RANK[r.t.priority] >= 3) {
      rr.getCell("priority").font = { bold: true, color: { argb: "FF9B0000" } };
    }
  }

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="devflow-${project.slug}-tickets.xlsx"`,
    },
  });
}