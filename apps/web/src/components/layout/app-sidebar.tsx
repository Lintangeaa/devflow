"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  BarChart3,
  Bug,
  CheckSquare,
  Columns3,
  Flame,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSidebar } from "./sidebar-context";
import { ProjectSwitcher } from "./project-switcher";
import { UserProfileMenu } from "./user-profile-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const currentProjectId = typeof params?.id === "string" ? params.id : null;
  const { isCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useSidebar();

  const globalNavItems = [
    {
      label: "Projects",
      href: "/projects",
      icon: FolderKanban,
      matchExact: true,
    },
    {
      label: "My Tasks",
      href: "/my-tasks",
      icon: CheckSquare,
      matchExact: false,
    },
  ];

  const projectNavItems = currentProjectId
    ? [
        {
          label: "Overview",
          href: `/projects/${currentProjectId}/overview`,
          icon: BarChart3,
        },
        {
          label: "Board",
          href: `/projects/${currentProjectId}/board`,
          icon: Columns3,
        },
        {
          label: "Bugs",
          href: `/projects/${currentProjectId}/bugs`,
          icon: Bug,
        },
        {
          label: "Ticket",
          href: `/projects/${currentProjectId}/ticket`,
          icon: Flame,
        },
      ]
    : [];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3">
      {/* Top Header & Brand */}
      <div className="flex flex-col gap-4">
        <div className={cn("flex items-center gap-2", isCollapsed ? "justify-center" : "justify-between")}>
          <Link
            href="/projects"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <Image
              src="/devflow-logo-v2.png"
              alt="Devflow logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover shadow-xs shrink-0"
              priority
            />
            {!isCollapsed && <span className="text-base tracking-tight">Devflow</span>}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Collapse sidebar (Cmd+B)"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Project Switcher */}
        <ProjectSwitcher isCollapsed={isCollapsed} />

        {/* Navigation Sections */}
        <div className="flex flex-col gap-4 overflow-y-auto overflow-x-hidden pt-1">
          {/* Global Menu */}
          <div className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Menu
              </span>
            )}
            {globalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchExact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center rounded-xl font-medium transition-all",
                    isCollapsed ? "h-10 w-10 justify-center mx-auto" : "gap-3 px-3 py-2 text-xs",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Project Contextual Menu */}
          {projectNavItems.length > 0 && (
            <div className="flex flex-col gap-1 pt-2 border-t border-border/60">
              {!isCollapsed && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Project Active
                  </span>
                </div>
              )}
              {projectNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center rounded-xl font-medium transition-all",
                      isCollapsed ? "h-10 w-10 justify-center mx-auto" : "gap-3 px-3 py-2 text-xs",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: Expand button (when collapsed) + User Profile */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
        {isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto"
            title="Expand sidebar (Cmd+B)"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <UserProfileMenu isCollapsed={isCollapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-30",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative z-50 flex flex-col w-72 h-full bg-sidebar border-r border-border shadow-2xl p-2 animate-in slide-in-from-left duration-200">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
