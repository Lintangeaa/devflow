import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import SignupForm from "@/components/auth/signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignupForm />
    </main>
  );
}