"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bug, Plus, Sparkles } from "lucide-react";
import { useProject } from "@/components/projects/project-context";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { TicketDetailModal, type TicketWithMeta } from "@/components/tickets/ticket-detail-modal";

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { project, phases, members, isOwner, reload: reloadProject } = useProject();

  const [tickets, setTickets] = useState<TicketWithMeta[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);
  const [creatingDefaultPhases, setCreatingDefaultPhases] = useState(false);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/tickets?type=task`);
    if (res.ok) {
      const data = (await res.json()) as TicketWithMeta[];
      setTickets(data);
    }
  }, [id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function createDefaultPhases() {
    if (!project) return;
    setCreatingDefaultPhases(true);
    const defaults = [
      { name: "Planning", color: "#6366f1", order: 0 },
      { name: "In Progress", color: "#f59e0b", order: 1 },
      { name: "Testing / QA", color: "#8b5cf6", order: 2 },
      { name: "Done", color: "#10b981", order: 3 },
    ];

    try {
      for (const phase of defaults) {
        await fetch(`/api/projects/${project.id}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(phase),
        });
      }
      await reloadProject();
      await loadTasks();
    } finally {
      setCreatingDefaultPhases(false);
    }
  }

  const unphasedTickets = tickets.filter((t) => !t.phaseId);

  return (
    <div className="space-y-6">
      {/* Top Bar inside Board */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Task Board</h2>
          <p className="text-xs text-muted-foreground">
            Alur kerja pengerjaan task pengembangan fitur dan perbaikan.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Buat Task</span>
        </Button>
      </div>

      {showCreateForm && (
        <CreateTicketForm
          projectId={id}
          type="task"
          phases={phases}
          members={members}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadTasks();
          }}
        />
      )}

      {/* If no phases yet */}
      {phases.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-medium">Project belum memiliki fase alur kerja</p>
            <p className="text-xs text-muted-foreground">
              Buat 4 fase standar (Planning, In Progress, Testing, Done) untuk mengelompokkan task.
            </p>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              disabled={creatingDefaultPhases}
              onClick={createDefaultPhases}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{creatingDefaultPhases ? "Membuat fase..." : "Buat Fase Standar"}</span>
            </Button>
          )}
        </div>
      )}

      {/* Board Columns View */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {phases.map((phase) => {
          const phaseTickets = tickets.filter((t) => t.phaseId === phase.id);

          return (
            <div
              key={phase.id}
              className="w-72 shrink-0 rounded-xl border bg-muted/40 p-3 flex flex-col max-h-[calc(100vh-16rem)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color }} />
                <h3 className="font-medium text-sm">{phase.name}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {phaseTickets.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {phaseTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                    Belum ada task
                  </div>
                ) : (
                  phaseTickets.map((t) => (
                    <BoardTaskCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* Unphased column */}
        {(phases.length === 0 || unphasedTickets.length > 0) && (
          <div className="w-72 shrink-0 rounded-xl border border-dashed bg-muted/20 p-3 flex flex-col max-h-[calc(100vh-16rem)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
              <h3 className="font-medium text-sm">Tanpa Fase / General</h3>
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {unphasedTickets.length}
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {unphasedTickets.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                  Semua task sudah memiliki fase
                </div>
              ) : (
                unphasedTickets.map((t) => (
                  <BoardTaskCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        projectId={id}
        ticket={selectedTicket}
        phases={phases}
        members={members}
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        onUpdated={loadTasks}
        onDeleted={loadTasks}
      />
    </div>
  );
}

function BoardTaskCard({ ticket, onClick }: { ticket: TicketWithMeta; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border bg-background p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <TypeBadge type={ticket.type} />
        <PriorityBadge priority={ticket.priority} />
        {ticket.status !== "todo" && ticket.status !== "backlog" && (
          <Badge className="capitalize text-[10px]">{(ticket.status ?? "").replace("_", " ")}</Badge>
        )}
      </div>

      <p className="mt-2 text-xs font-medium text-foreground line-clamp-2">{ticket.headline}</p>

      {/* Linked bug indicator */}
      {ticket.parentId && ticket.parentHeadline && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-primary/5 px-2 py-1 text-[11px] text-primary border border-primary/10">
          <Bug className="h-3 w-3 shrink-0" />
          <span className="truncate">Bug: {ticket.parentHeadline}</span>
        </div>
      )}

      {ticket.assigneeName && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <Avatar name={ticket.assigneeName} size="sm" />
          <p className="text-[11px] text-muted-foreground truncate">{ticket.assigneeName}</p>
        </div>
      )}
    </div>
  );
}
