import Link from "next/link";
import { ThemeSelector } from "@/components/theme/theme-selector";

export function AuthHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold">
          Devflow
        </Link>
        <ThemeSelector />
      </div>
    </header>
  );
}
