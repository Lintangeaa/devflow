import { Hono } from "hono";
import { ilike, or } from "drizzle-orm";
import { db, schema } from "@devflow/db";
import { requireAuth, type AppVariables } from "../lib/access.js";

export const usersRouter = new Hono<{ Variables: AppVariables }>();

usersRouter.use("*", requireAuth);

usersRouter.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) {
    return c.json([]);
  }

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.user)
    .where(or(ilike(schema.user.email, `%${q}%`), ilike(schema.user.name, `%${q}%`)))
    .limit(20);

  return c.json(users);
});
