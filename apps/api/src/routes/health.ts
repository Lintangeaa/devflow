import { Hono } from "hono";
import { checkDb } from "@devflow/db";

export const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
  const ok = await checkDb();
  return c.json({ ok, db: ok, service: "devflow-api" }, ok ? 200 : 503);
});
