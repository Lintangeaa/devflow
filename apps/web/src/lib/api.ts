import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type Authed = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return session;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}