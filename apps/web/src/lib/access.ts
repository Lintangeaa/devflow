import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { HttpError, requireUser } from "@/lib/api";

export type ProjectRole = "owner" | "member";

/** Returns the role of the current user in a project, or null if not a member. */
export async function projectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const [row] = await db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

/** Require membership in a project (any role). Returns {user, role}. */
export async function requireProjectMember(projectId: string) {
  const { user } = await requireUser();
  const role = await projectRole(user.id, projectId);
  if (!role) throw new HttpError(403, "Anda bukan member project ini");
  return { user, role };
}

/** Require the user to be the project owner. */
export async function requireProjectOwner(projectId: string) {
  const { user, role } = await requireProjectMember(projectId);
  if (role !== "owner") throw new HttpError(403, "Hanya owner yang bisa melakukan ini");
  return { user, role };
}