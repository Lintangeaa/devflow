import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, inArray, desc } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage() {
  const { user } = await requireUser().catch((e) => {
    if (e?.status === 401) redirect("/login");
    throw e;
  });

  const memberships = await db
    .select({ projectId: schema.projectMembers.projectId, role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.userId, user.id));

  let projects: TypeProject[] = [];

  type TypeProject = typeof schema.projects.$inferSelect;
  if (memberships.length) {
    projects = await db
      .select()
      .from(schema.projects)
      .where(inArray(schema.projects.id, memberships.map((m) => m.projectId)))
      .orderBy(desc(schema.projects.createdAt));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Halo, {user.name}. Kelola project dan tiket tim Anda di sini.</p>
          </div>
          <NewProjectForm />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Belum ada project"
            description="Mulai kelola alur kerja dan pelacakan bug tim Anda dengan membuat project pertama."
            className="my-8 py-12"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}/board`}
                className="group rounded-xl border border-border/80 bg-background/60 p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base group-hover:text-primary transition-colors">{p.name}</h2>
                  <Badge variant="neutral" className="text-[10px] uppercase font-medium">
                    {memberships.find((m) => m.projectId === p.id)?.role}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description || "Tidak ada deskripsi project."}</p>
                <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] opacity-80">{p.slug}</span>
                  <span className="font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Buka Board →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
