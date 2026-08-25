"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface AppTopBarProps {
  projectName?: string;
  actions?: React.ReactNode;
}

export function AppTopBar({ projectName, actions }: AppTopBarProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentProjectId = typeof params?.id === "string" ? params.id : null;
  const { toggleMobileOpen } = useSidebar();

  const getPageTitle = () => {
    if (pathname.includes("/overview")) return "Overview";
    if (pathname.includes("/board")) return "Task Board";
    if (pathname.includes("/bugs")) return "Bug Kanban";
    if (pathname.includes("/ticket")) return "Ticket List";
    if (pathname === "/my-tasks") return "My Tasks";
    if (pathname === "/projects") return "Projects";
    return "";
  };

  const pageTitle = getPageTitle();

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb Trail */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <Link href="/projects" className="hover:text-foreground transition-colors font-medium">
            Projects
          </Link>

          {currentProjectId && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <Link
                href={`/projects/${currentProjectId}/board`}
                className="hover:text-foreground transition-colors font-medium truncate max-w-[120px] md:max-w-[200px]"
              >
                {projectName || "Project"}
              </Link>
            </>
          )}

          {pageTitle && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <span className="font-semibold text-foreground truncate">{pageTitle}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Actions & Notification Bell */}
      <div className="flex items-center gap-2.5 shrink-0">
        {actions}
        <NotificationBell />
      </div>
    </header>
  );
}
