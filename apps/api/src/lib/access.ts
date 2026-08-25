import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { auth, type Session } from "./auth.js";

export type ProjectRole = "owner" | "member";

export type AppVariables = {
  user: Session["user"];
  session: Session["session"];
};

export const requireAuth = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

export async function getProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const [row] = await db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
    .limit(1);
  return (row?.role as ProjectRole) ?? null;
}

export async function requireProjectMember(c: Context, projectId: string) {
  const user = c.get("user") as Session["user"] | undefined;
  if (!user) throw new HTTPException(401, { message: "Unauthorized" });
  const role = await getProjectRole(user.id, projectId);
  if (!role) throw new HTTPException(403, { message: "Anda bukan member project ini" });
  return { user, role };
}

export async function requireProjectOwner(c: Context, projectId: string) {
  const { user, role } = await requireProjectMember(c, projectId);
  if (role !== "owner") throw new HTTPException(403, { message: "Hanya owner yang bisa melakukan ini" });
  return { user, role };
}
