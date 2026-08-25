"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, FolderKanban, Plus } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  role?: string | null;
}

interface ProjectSwitcherProps {
  isCollapsed: boolean;
}

export function ProjectSwitcher({ isCollapsed }: ProjectSwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const currentProjectId = typeof params?.id === "string" ? params.id : null;

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [currentProjectId]);

  const activeProject = projects.find((p) => p.id === currentProjectId);
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelectProject(projectId: string) {
    router.push(`/projects/${projectId}/board`);
  }

  if (isCollapsed) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 mx-auto"
            title={activeProject ? activeProject.name : "Select Project"}
          >
            {activeProject ? (
              <span className="text-xs font-bold uppercase tracking-wider">
                {activeProject.name.slice(0, 2)}
              </span>
            ) : (
              <FolderKanban className="h-5 w-5" />
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="right"
            align="start"
            sideOffset={12}
            className="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Projects ({projects.length})
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {projects.map((p) => (
                <DropdownMenu.Item
                  key={p.id}
                  onSelect={() => handleSelectProject(p.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors",
                    p.id === currentProjectId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted focus:bg-muted",
                  )}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{p.name}</span>
                    <span className={cn("text-[10px]", p.id === currentProjectId ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {p.slug}
                    </span>
                  </div>
                  {p.id === currentProjectId && <Check className="h-3.5 w-3.5 shrink-0" />}
                </DropdownMenu.Item>
              ))}
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={() => router.push("/projects")}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>All Projects / New</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-background/60 p-2 text-left text-xs transition-all hover:border-primary/40 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold uppercase text-[11px]">
              {activeProject ? activeProject.name.slice(0, 2) : <FolderKanban className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground">
                {activeProject ? activeProject.name : "Select Project"}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {activeProject ? activeProject.slug : `${projects.length} project tersedia`}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80"
        >
          <div className="p-1">
            <input
              type="text"
              placeholder="Cari project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredProjects.length === 0 ? (
              <div className="p-2 text-center text-xs text-muted-foreground">
                Tidak ada project
              </div>
            ) : (
              filteredProjects.map((p) => (
                <DropdownMenu.Item
                  key={p.id}
                  onSelect={() => handleSelectProject(p.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors",
                    p.id === currentProjectId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted focus:bg-muted",
                  )}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className={cn("text-[10px]", p.id === currentProjectId ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {p.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.role && (
                      <Badge
                        variant="neutral"
                        className={cn("text-[9px] px-1.5 py-0 uppercase", p.id === currentProjectId && "bg-primary-foreground/20 text-primary-foreground")}
                      >
                        {p.role}
                      </Badge>
                    )}
                    {p.id === currentProjectId && <Check className="h-3.5 w-3.5" />}
                  </div>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={() => router.push("/projects")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground outline-none transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Lihat Semua / Buat Project</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
