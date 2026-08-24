import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://devflow:devflow@localhost:5433/devflow";

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export { pool };
export { schema };

/** Connect + run a tiny check (useful for container healthcheck / startup). */
export async function checkDb(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}