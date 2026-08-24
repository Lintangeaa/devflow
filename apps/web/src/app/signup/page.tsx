import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { AuthHeader } from "@/components/layout/auth-header";
import SignupForm from "@/components/auth/signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/projects");
  return (
    <>
      <AuthHeader />
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <SignupForm />
      </main>
    </>
  );
}