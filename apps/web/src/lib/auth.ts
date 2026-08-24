import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@devflow/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET ?? "change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
});

export type Session = typeof auth.$Infer.Session;