import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, inArray, desc } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Badge } from "@/components/ui/badge";

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
    <>
      <Header />
      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">Halo, {user.name}</p>
          </div>
          <NewProjectForm />
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Belum ada project. Buat project pertama dengan tombol &quot;New Project&quot;.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-lg border bg-background p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{p.name}</h2>
                  <Badge>{memberships.find((m) => m.projectId === p.id)?.role}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{p.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
