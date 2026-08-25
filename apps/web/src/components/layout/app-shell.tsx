"use client";

import React from "react";
import { SidebarProvider } from "./sidebar-context";
import { AppSidebar } from "./app-sidebar";
import { AppTopBar } from "./app-topbar";

interface AppShellProps {
  children: React.ReactNode;
  projectName?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, projectName, actions }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AppTopBar projectName={projectName} actions={actions} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
