"use client";

import { Search, X, RotateCcw, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PRIORITIES, SEVERITIES } from "@devflow/shared";
import type { ProjectMember } from "@/components/projects/members-modal";
import type { TicketWithMeta } from "./ticket-detail-modal";

export interface BoardFilterState {
  search: string;
  assigneeId: string; // "" = all, "unassigned" = unassigned, or userId
  priority: string; // "" = all
  severity: string; // "" = all
}

export const defaultFilterState: BoardFilterState = {
  search: "",
  assigneeId: "",
  priority: "",
  severity: "",
};

export function matchTicketFilter(
  ticket: TicketWithMeta,
  filters: BoardFilterState,
): boolean {
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    const headlineMatch = (ticket.headline || "").toLowerCase().includes(q);
    const descMatch = (ticket.description || "").toLowerCase().includes(q);
    const scenarioMatch = (ticket.bugDetails?.scenario || "").toLowerCase().includes(q);
    const featureMatch = (ticket.bugDetails?.feature || "").toLowerCase().includes(q);
    if (!headlineMatch && !descMatch && !scenarioMatch && !featureMatch) {
      return false;
    }
  }

  if (filters.assigneeId) {
    if (filters.assigneeId === "unassigned") {
      if (ticket.assigneeId) return false;
    } else if (ticket.assigneeId !== filters.assigneeId) {
      return false;
    }
  }

  if (filters.priority && ticket.priority !== filters.priority) {
    return false;
  }

  if (filters.severity && ticket.severity !== filters.severity) {
    return false;
  }

  return true;
}

interface BoardFilterBarProps {
  filters: BoardFilterState;
  onFilterChange: (filters: BoardFilterState) => void;
  members: ProjectMember[];
  totalCount: number;
  filteredCount: number;
  showSeverity?: boolean;
}

export function BoardFilterBar({
  filters,
  onFilterChange,
  members,
  totalCount,
  filteredCount,
  showSeverity = false,
}: BoardFilterBarProps) {
  const isFiltered =
    Boolean(filters.search.trim()) ||
    Boolean(filters.assigneeId) ||
    Boolean(filters.priority) ||
    Boolean(filters.severity);

  function updateFilter<K extends keyof BoardFilterState>(key: K, value: BoardFilterState[K]) {
    onFilterChange({ ...filters, [key]: value });
  }

  function toggleAssignee(userId: string) {
    if (filters.assigneeId === userId) {
      updateFilter("assigneeId", "");
    } else {
      updateFilter("assigneeId", userId);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3 shadow-2xs backdrop-blur">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex items-center min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Cari judul, skenario, deskripsi..."
            className="h-8 w-full rounded-xl border bg-background/80 pl-8 pr-7 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter("search", "")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="h-8 rounded-xl border bg-background/80 px-2.5 text-xs font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">Semua Prioritas</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>

        {/* Severity Filter (if applicable) */}
        {showSeverity && (
          <select
            value={filters.severity}
            onChange={(e) => updateFilter("severity", e.target.value)}
            className="h-8 rounded-xl border bg-background/80 px-2.5 text-xs font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Semua Severity</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        )}

        {/* Assignee Avatars Strip */}
        <div className="flex items-center gap-1 border-l pl-2.5 border-border/80">
          <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">Assignee:</span>
          <button
            type="button"
            onClick={() => toggleAssignee("unassigned")}
            title="Filter tiket belum ditugaskan"
            className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-all ${
              filters.assigneeId === "unassigned"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <UserX className="h-3 w-3" />
            <span className="hidden md:inline">Unassigned</span>
          </button>

          {members.map((m) => {
            const isSelected = filters.assigneeId === m.userId;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggleAssignee(m.userId)}
                title={`${m.name} (${m.email})`}
                className={`group relative rounded-full transition-all ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Avatar name={m.name} size="sm" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Info & Reset Button */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {isFiltered ? (
            <>
              Menampilkan <span className="font-semibold text-foreground">{filteredCount}</span> dari{" "}
              {totalCount} tiket
            </>
          ) : (
            <>
              Total <span className="font-semibold text-foreground">{totalCount}</span> tiket
            </>
          )}
        </span>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(defaultFilterState)}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
