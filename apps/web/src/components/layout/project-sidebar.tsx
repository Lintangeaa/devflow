"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bug,
  Columns3,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface ProjectSidebarProps {
  projectId: string;
}

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: `/projects/${projectId}/overview`,
      icon: BarChart3,
    },
    {
      label: "Board",
      href: `/projects/${projectId}/board`,
      icon: Columns3,
    },
    {
      label: "Bugs",
      href: `/projects/${projectId}/bugs`,
      icon: Bug,
    },
    {
      label: "Ticket",
      href: `/projects/${projectId}/ticket`,
      icon: Flame,
    },
  ];

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/20 p-4 flex flex-col gap-1 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="mb-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu Project
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
