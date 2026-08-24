import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, inArray, desc } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NewProjectForm } from "@/components/projects/new-project-form";

export default async function DashboardPage() {
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
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Halo, {user.name}</p>
        </div>
        <NewProjectForm />
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada project. Buat project pertama dengan tombol "New Project".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border p-5 transition-colors hover:border-primary/60"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                  {memberships.find((m) => m.projectId === p.id)?.role}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{p.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}