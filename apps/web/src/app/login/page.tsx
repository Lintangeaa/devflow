import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { AuthHeader } from "@/components/layout/auth-header";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <>
      <AuthHeader />
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <LoginForm />
      </main>
    </>
  );
}