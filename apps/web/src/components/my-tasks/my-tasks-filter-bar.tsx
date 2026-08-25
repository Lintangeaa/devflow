"use client";

import { Bug, CheckSquare, FolderGit2, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MyTasksProjectOption {
  projectId: string;
  projectName: string;
  projectSlug: string;
  role: string | null;
}

export interface MyTasksFilterState {
  search: string;
  projectId: string;
  type: "all" | "task" | "bug";
  priority: string;
}

export const defaultMyTasksFilterState: MyTasksFilterState = {
  search: "",
  projectId: "all",
  type: "all",
  priority: "all",
};

export function MyTasksFilterBar({
  filters,
  onFilterChange,
  projects,
  totalCount,
  filteredCount,
}: {
  filters: MyTasksFilterState;
  onFilterChange: (filters: MyTasksFilterState) => void;
  projects: MyTasksProjectOption[];
  totalCount: number;
  filteredCount: number;
}) {
  const isFiltered =
    filters.search !== "" ||
    filters.projectId !== "all" ||
    filters.type !== "all" ||
    filters.priority !== "all";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari tugas, bug, atau nama project..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Project Dropdown */}
        <div className="flex items-center gap-1">
          <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={filters.projectId}
            onChange={(e) => onFilterChange({ ...filters, projectId: e.target.value })}
            className="h-8 rounded-lg border bg-background px-2 text-xs outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="all">Semua Project ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectName}
              </option>
            ))}
          </select>
        </div>

        {/* Type Toggle Buttons */}
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, type: "all" })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              filters.type === "all"
                ? "bg-background shadow-xs text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, type: "task" })}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              filters.type === "task"
                ? "bg-background shadow-xs text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckSquare className="h-3 w-3 text-blue-500" />
            <span>Task</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, type: "bug" })}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              filters.type === "bug"
                ? "bg-background shadow-xs text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bug className="h-3 w-3 text-rose-500" />
            <span>Bug</span>
          </button>
        </div>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
          className="h-8 rounded-lg border bg-background px-2 text-xs outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="all">Semua Prioritas</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {isFiltered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onFilterChange(defaultMyTasksFilterState)}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground font-mono shrink-0">
        Menampilkan {filteredCount} dari {totalCount} tiket
      </div>
    </div>
  );
}
