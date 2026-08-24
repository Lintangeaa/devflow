import Link from "next/link";
import { ThemeSelector } from "@/components/theme/theme-selector";

export function AuthHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold text-primary">
          Devflow
        </Link>
        <ThemeSelector />
      </div>
    </header>
  );
}
