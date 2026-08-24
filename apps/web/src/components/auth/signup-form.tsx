"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signUp.email({ name, email, password });
    if (res.error) {
      setError(res.error.message ?? "Pendaftaran gagal");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border p-6">
      <div>
        <h1 className="text-xl font-semibold">Daftar</h1>
        <p className="text-sm text-muted-foreground">Buat akun Devflow</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder="Nama"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses..." : "Daftar"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}