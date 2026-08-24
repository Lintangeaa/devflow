import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}