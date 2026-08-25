"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Bug, MessageSquare, Paperclip, Plus, RotateCcw, Search, Sparkles } from "lucide-react";
import { useProject } from "@/components/projects/project-context";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonBoard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { TicketDetailModal, type TicketWithMeta } from "@/components/tickets/ticket-detail-modal";
import {
  BoardFilterBar,
  defaultFilterState,
  matchTicketFilter,
  type BoardFilterState,
} from "@/components/tickets/board-filter-bar";

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { phases, members } = useProject();

  const [tickets, setTickets] = useState<TicketWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketWithMeta | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/tickets?type=task`);
      if (res.ok) {
        const data = (await res.json()) as TicketWithMeta[];
        setTickets(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const [filters, setFilters] = useState<BoardFilterState>(defaultFilterState);

  // Sorted phases by order
  const sortedPhases = useMemo(() => {
    return [...phases].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [phases]);

  const lastPhase = sortedPhases.length > 0 ? sortedPhases[sortedPhases.length - 1] : null;

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => matchTicketFilter(t, filters));
  }, [tickets, filters]);

  const ticketsByPhase = useMemo(() => {
    const map: Record<string, TicketWithMeta[]> = {};
    for (const p of phases) {
      map[p.id] = [];
    }
    const defaultPhaseId = sortedPhases[0]?.id;

    for (const t of filteredTickets) {
      if (t.phaseId && map[t.phaseId]) {
        map[t.phaseId].push(t);
      } else if (defaultPhaseId && map[defaultPhaseId]) {
        map[defaultPhaseId].push(t);
      }
    }
    return map;
  }, [filteredTickets, phases, sortedPhases]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const found = tickets.find((t) => t.id === active.id);
    if (found) setActiveTicket(found);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceTicket = tickets.find((t) => t.id === activeId);
    if (!sourceTicket) return;

    // Determine target phase column ID
    let targetPhaseKey = "";
    if (phases.some((p) => p.id === overId)) {
      targetPhaseKey = overId;
    } else {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket && overTicket.phaseId) {
        targetPhaseKey = overTicket.phaseId;
      }
    }

    if (!targetPhaseKey) return;

    const targetPhaseId = targetPhaseKey;
    const previousTickets = [...tickets];
    const isPhaseChanged = sourceTicket.phaseId !== targetPhaseId;

    // Check if moving to last phase (auto-done)
    const isDroppingToLastPhase = lastPhase && targetPhaseId === lastPhase.id;
    let newStatus = sourceTicket.status;
    if (isDroppingToLastPhase) {
      newStatus = "done";
    } else if (isPhaseChanged && sourceTicket.status === "done") {
      newStatus = "in_progress";
    }

    // Compute new target column list
    const currentColumnTickets = (ticketsByPhase[targetPhaseKey] || []).filter(
      (t) => t.id !== activeId,
    );

    let insertIndex = currentColumnTickets.length;
    if (overId !== targetPhaseKey) {
      const overIndex = currentColumnTickets.findIndex((t) => t.id === overId);
      if (overIndex !== -1) {
        insertIndex = overIndex;
      }
    }

    // Optimistic UI update
    setTickets((prev) => {
      const remaining = prev.filter((t) => t.id !== activeId);
      const updatedSource: TicketWithMeta = {
        ...sourceTicket,
        phaseId: targetPhaseId,
        status: newStatus,
      };

      const targetList = remaining.filter((t) => (t.phaseId ?? null) === targetPhaseId);
      const otherList = remaining.filter((t) => (t.phaseId ?? null) !== targetPhaseId);

      targetList.splice(insertIndex, 0, updatedSource);

      const reindexedTarget = targetList.map((t, idx) => ({
        ...t,
        position: idx * 1000,
      }));

      return [...otherList, ...reindexedTarget];
    });

    try {
      const newPos = insertIndex * 1000;
      const res = await fetch(`/api/projects/${id}/tickets/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: targetPhaseId,
          status: newStatus,
          position: newPos,
        }),
      });

      if (!res.ok) {
        setTickets(previousTickets);
        setErrorBanner("Gagal memindahkan task. Perubahan dibatalkan.");
      }
    } catch {
      setTickets(previousTickets);
      setErrorBanner("Terjadi kesalahan jaringan saat memindahkan task.");
    }
  }

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

      {errorBanner && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

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

      {/* Quick Filter Toolbar */}
      <BoardFilterBar
        filters={filters}
        onFilterChange={setFilters}
        members={members}
        totalCount={tickets.length}
        filteredCount={filteredTickets.length}
        showSeverity={false}
      />

      {loading ? (
        <SkeletonBoard columns={Math.max(phases.length, 3)} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada task pada project ini"
          description="Mulai alur kerja tim dengan membuat task pertama Anda."
          action={{
            label: "Buat Task Pertama",
            icon: Plus,
            onClick: () => setShowCreateForm(true),
          }}
          className="my-6 py-12"
        />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Tidak ada task yang cocok dengan filter"
          description="Coba ubah kata kunci pencarian atau reset filter untuk melihat semua task."
          action={{
            label: "Reset Filter",
            icon: RotateCcw,
            onClick: () => setFilters(defaultFilterState),
          }}
          className="my-4 py-12"
        />
      ) : (
        /* Board Columns View with DndContext */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sortedPhases.map((phase) => {
              const phaseTickets = ticketsByPhase[phase.id] || [];

              return (
                <TaskDroppableColumn
                  key={phase.id}
                  columnId={phase.id}
                  title={phase.name}
                  color={phase.color}
                  tickets={phaseTickets}
                  onSelectTicket={setSelectedTicket}
                />
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTicket ? (
              <div className="rotate-2 opacity-90 scale-105 pointer-events-none">
                <BoardTaskCard
                  ticket={activeTicket}
                  onClick={() => {}}
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

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

function TaskDroppableColumn({
  columnId,
  title,
  color,
  tickets,
  isDashed = false,
  onSelectTicket,
}: {
  columnId: string;
  title: string;
  color: string;
  tickets: TicketWithMeta[];
  isDashed?: boolean;
  onSelectTicket: (t: TicketWithMeta) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-xl border p-3 flex flex-col max-h-[calc(100vh-16rem)] transition-colors ${
        isDashed ? "border-dashed" : ""
      } ${
        isOver
          ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20"
          : isDashed
            ? "bg-muted/20"
            : "bg-muted/40"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground font-mono">
          {tickets.length}
        </span>
      </div>

      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[80px]">
          {tickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
              Tarik task ke sini
            </div>
          ) : (
            tickets.map((t) => (
              <SortableTaskCard
                key={t.id}
                ticket={t}
                onClick={() => onSelectTicket(t)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({
  ticket,
  onClick,
}: {
  ticket: TicketWithMeta;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: { ticket },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardTaskCard ticket={ticket} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

function BoardTaskCard({
  ticket,
  onClick,
  isDragging = false,
}: {
  ticket: TicketWithMeta;
  onClick: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-background p-3.5 shadow-soft transition-all hover:border-primary/40 hover:shadow-md ${
        isDragging ? "shadow-lg border-primary" : ""
      }`}
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

      {/* People footer (Creator & Assignee) + Meta Badges */}
      <div className="mt-2.5 pt-2 border-t flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {ticket.creatorName ? (
            <div className="flex items-center gap-1.5 min-w-0" title={`Dibuat oleh ${ticket.creatorName}`}>
              <Avatar name={ticket.creatorName} size="sm" />
              <p className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                {ticket.creatorName}
              </p>
            </div>
          ) : (
            <div />
          )}

          {/* Comment and Media Counts */}
          {((ticket.commentCount !== undefined && ticket.commentCount > 0) ||
            (ticket.mediaCount !== undefined && ticket.mediaCount > 0)) && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
              {ticket.commentCount !== undefined && ticket.commentCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${ticket.commentCount} komentar`}>
                  <MessageSquare className="h-3 w-3" />
                  <span>{ticket.commentCount}</span>
                </span>
              )}
              {ticket.mediaCount !== undefined && ticket.mediaCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${ticket.mediaCount} lampiran`}>
                  <Paperclip className="h-3 w-3" />
                  <span>{ticket.mediaCount}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {ticket.assigneeName && (
          <div className="flex items-center gap-1.5 min-w-0" title={`Ditugaskan ke ${ticket.assigneeName}`}>
            <Avatar name={ticket.assigneeName} size="sm" />
            <p className="text-[11px] font-medium text-foreground truncate max-w-[80px]">
              {ticket.assigneeName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
