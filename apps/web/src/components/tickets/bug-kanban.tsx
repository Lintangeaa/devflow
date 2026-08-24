"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Plus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge, SeverityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { TicketDetailModal, type Phase, type TicketWithMeta } from "@/components/tickets/ticket-detail-modal";
import type { ProjectMember } from "@/components/projects/members-modal";
import { BUG_STATUSES } from "@devflow/shared";

interface BugKanbanProps {
  projectId: string;
  environmentFilter: "non_production" | "production";
  title: string;
  description: string;
  createButtonLabel: string;
  phases: Phase[];
  members: ProjectMember[];
}

const BUG_STATUS_CONFIG: Record<
  string,
  { title: string; color: string; bg: string }
> = {
  new: { title: "New", color: "#3b82f6", bg: "bg-blue-500/10" },
  open: { title: "Open", color: "#eab308", bg: "bg-yellow-500/10" },
  in_progress: { title: "In Progress", color: "#f97316", bg: "bg-orange-500/10" },
  resolved: { title: "Resolved", color: "#10b981", bg: "bg-emerald-500/10" },
  closed: { title: "Closed", color: "#6b7280", bg: "bg-zinc-500/10" },
};

export function BugKanban({
  projectId,
  environmentFilter,
  title,
  description,
  createButtonLabel,
  phases,
  members,
}: BugKanbanProps) {
  const [tickets, setTickets] = useState<TicketWithMeta[]>([]);
  const [showCreateBug, setShowCreateBug] = useState(false);
  const [taskParentBug, setTaskParentBug] = useState<{ id: string; headline: string } | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);

  const loadBugs = useCallback(async () => {
    const res = await fetch(
      `/api/projects/${projectId}/tickets?type=bug&environment=${environmentFilter}`,
    );
    if (res.ok) {
      const data = (await res.json()) as TicketWithMeta[];
      setTickets(data);
    }
  }, [projectId, environmentFilter]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          onClick={() => setShowCreateBug(true)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>{createButtonLabel}</span>
        </Button>
      </div>

      {/* Create Bug Form */}
      {showCreateBug && (
        <CreateTicketForm
          projectId={projectId}
          type="bug"
          defaultEnvironment={environmentFilter === "production" ? "production" : undefined}
          phases={phases}
          members={members}
          onClose={() => setShowCreateBug(false)}
          onCreated={() => {
            setShowCreateBug(false);
            loadBugs();
          }}
        />
      )}

      {/* Create Task linked to a Bug Form */}
      {taskParentBug && (
        <CreateTicketForm
          projectId={projectId}
          type="task"
          parentId={taskParentBug.id}
          parentHeadline={taskParentBug.headline}
          phases={phases}
          members={members}
          onClose={() => setTaskParentBug(null)}
          onCreated={() => {
            setTaskParentBug(null);
            loadBugs();
          }}
        />
      )}

      {/* 5-Column Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BUG_STATUSES.map((statusKey) => {
          const cfg = BUG_STATUS_CONFIG[statusKey] ?? {
            title: statusKey,
            color: "#6b7280",
            bg: "bg-muted/40",
          };
          const statusTickets = tickets.filter((t) => t.status === statusKey);

          return (
            <div
              key={statusKey}
              className="w-72 shrink-0 rounded-xl border bg-muted/40 p-3 flex flex-col max-h-[calc(100vh-16rem)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                <h3 className="font-medium text-sm">{cfg.title}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground font-mono">
                  {statusTickets.length}
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {statusTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                    Kosong
                  </div>
                ) : (
                  statusTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="cursor-pointer rounded-xl border bg-background p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md group"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={t.priority} />
                        {t.severity && <SeverityBadge severity={t.severity} />}
                        {t.environment && environmentFilter !== "production" && (
                          <Badge variant="neutral" className="text-[10px]">
                            {t.environment}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-2 text-xs font-medium text-foreground line-clamp-2">
                        {t.headline}
                      </p>

                      {/* Linked Task badge */}
                      {t.linkedTaskId && t.linkedTaskHeadline ? (
                        <div className="mt-2.5 flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckSquare className="h-3 w-3 shrink-0" />
                          <span className="truncate">Linked → {t.linkedTaskHeadline}</span>
                        </div>
                      ) : (
                        /* "Buat Task" quick action */
                        <div className="mt-2.5 pt-2 border-t flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskParentBug({ id: t.id, headline: t.headline });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Buat Task</span>
                          </button>
                        </div>
                      )}

                      {t.assigneeName && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Avatar name={t.assigneeName} size="sm" />
                          <p className="text-[11px] text-muted-foreground truncate">
                            {t.assigneeName}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        projectId={projectId}
        ticket={selectedTicket}
        phases={phases}
        members={members}
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        onUpdated={loadBugs}
        onDeleted={loadBugs}
      />
    </div>
  );
}
