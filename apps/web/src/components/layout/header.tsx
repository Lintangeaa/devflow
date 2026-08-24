"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme/theme-selector";

export function Header() {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-primary">
            Devflow
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
