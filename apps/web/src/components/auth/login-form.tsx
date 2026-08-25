"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Login gagal. Periksa kembali email dan password Anda.");
        setLoading(false);
        return;
      }
      toast.success("Login berhasil! Mengalihkan ke dashboard...");
      window.location.href = "/projects";
    } catch {
      setError("Terjadi kesalahan jaringan saat login.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-6 shadow-soft">
      <div>
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-muted-foreground">Masuk ke Devflow</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses..." : "Login"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}