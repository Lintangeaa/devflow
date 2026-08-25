"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { AlertCircle, CheckSquare, Plus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge, SeverityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import {
  TicketDetailModal,
  type Phase,
  type TicketWithMeta,
} from "@/components/tickets/ticket-detail-modal";
import {
  BoardFilterBar,
  defaultFilterState,
  matchTicketFilter,
  type BoardFilterState,
} from "@/components/tickets/board-filter-bar";
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
  ready_for_qa: { title: "Ready for QA", color: "#8b5cf6", bg: "bg-purple-500/10" },
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

  const [filters, setFilters] = useState<BoardFilterState>(defaultFilterState);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => matchTicketFilter(t, filters));
  }, [tickets, filters]);

  const ticketsByStatus = useMemo(() => {
    const map: Record<string, TicketWithMeta[]> = {};
    for (const s of BUG_STATUSES) {
      map[s] = [];
    }
    for (const t of filteredTickets) {
      const st = t.status || "new";
      if (map[st]) {
        map[st].push(t);
      } else {
        map.new = map.new || [];
        map.new.push(t);
      }
    }
    return map;
  }, [filteredTickets]);

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

    // Determine target column / status
    let targetStatus = "";
    if (BUG_STATUSES.includes(overId as (typeof BUG_STATUSES)[number])) {
      targetStatus = overId;
    } else {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket && overTicket.status) {
        targetStatus = overTicket.status;
      }
    }

    if (!targetStatus) return;

    const previousTickets = [...tickets];
    const isStatusChanged = sourceTicket.status !== targetStatus;

    // Compute new target column list
    const currentColumnTickets = (ticketsByStatus[targetStatus] || []).filter(
      (t) => t.id !== activeId,
    );

    let insertIndex = currentColumnTickets.length;
    if (overId !== targetStatus) {
      const overIndex = currentColumnTickets.findIndex((t) => t.id === overId);
      if (overIndex !== -1) {
        insertIndex = overIndex;
      }
    }

    const updatedSource = { ...sourceTicket, status: targetStatus, position: insertIndex };
    currentColumnTickets.splice(insertIndex, 0, updatedSource);

    // Recompute positions in target column
    const reorderedTarget = currentColumnTickets.map((t, idx) => ({
      ...t,
      position: idx,
    }));

    // Construct full new ticket list
    const otherTickets = tickets.filter(
      (t) => t.id !== activeId && t.status !== targetStatus,
    );

    const newTickets = [...otherTickets, ...reorderedTarget];
    setTickets(newTickets);
    setErrorBanner(null);

    // Persist via PATCH
    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isStatusChanged ? { status: targetStatus } : {}),
          position: insertIndex,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal memindahkan posisi bug");
      }
    } catch (err) {
      // Rollback
      setTickets(previousTickets);
      setErrorBanner(
        err instanceof Error ? err.message : "Gagal memindahkan bug. Posisi dikembalikan.",
      );
    }
  }

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

      {errorBanner && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

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

      {/* Quick Filter Toolbar */}
      <BoardFilterBar
        filters={filters}
        onFilterChange={setFilters}
        members={members}
        totalCount={tickets.length}
        filteredCount={filteredTickets.length}
        showSeverity={true}
      />

      {/* 6-Column Kanban with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BUG_STATUSES.map((statusKey) => {
            const cfg = BUG_STATUS_CONFIG[statusKey] ?? {
              title: statusKey,
              color: "#6b7280",
              bg: "bg-muted/40",
            };
            const statusTickets = ticketsByStatus[statusKey] || [];

            return (
              <BugDroppableColumn
                key={statusKey}
                statusKey={statusKey}
                config={cfg}
                tickets={statusTickets}
                environmentFilter={environmentFilter}
                onSelectTicket={setSelectedTicket}
                onCreateTaskForBug={setTaskParentBug}
              />
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTicket ? (
            <div className="rotate-2 opacity-90 scale-105 pointer-events-none">
              <BugCard
                ticket={activeTicket}
                environmentFilter={environmentFilter}
                onClick={() => {}}
                onCreateTask={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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

function BugDroppableColumn({
  statusKey,
  config,
  tickets,
  environmentFilter,
  onSelectTicket,
  onCreateTaskForBug,
}: {
  statusKey: string;
  config: { title: string; color: string; bg: string };
  tickets: TicketWithMeta[];
  environmentFilter: "non_production" | "production";
  onSelectTicket: (t: TicketWithMeta) => void;
  onCreateTaskForBug: (b: { id: string; headline: string }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: statusKey,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-xl border p-3 flex flex-col max-h-[calc(100vh-16rem)] transition-colors ${
        isOver ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20" : "bg-muted/40"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: config.color }} />
        <h3 className="font-medium text-sm">{config.title}</h3>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground font-mono">
          {tickets.length}
        </span>
      </div>

      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-[80px]">
          {tickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
              Tarik bug ke sini
            </div>
          ) : (
            tickets.map((t) => (
              <SortableBugCard
                key={t.id}
                ticket={t}
                environmentFilter={environmentFilter}
                onClick={() => onSelectTicket(t)}
                onCreateTask={() => onCreateTaskForBug({ id: t.id, headline: t.headline })}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableBugCard({
  ticket,
  environmentFilter,
  onClick,
  onCreateTask,
}: {
  ticket: TicketWithMeta;
  environmentFilter: "non_production" | "production";
  onClick: () => void;
  onCreateTask: () => void;
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
      <BugCard
        ticket={ticket}
        environmentFilter={environmentFilter}
        onClick={onClick}
        onCreateTask={onCreateTask}
        isDragging={isDragging}
      />
    </div>
  );
}

function BugCard({
  ticket,
  environmentFilter,
  onClick,
  onCreateTask,
  isDragging = false,
}: {
  ticket: TicketWithMeta;
  environmentFilter: "non_production" | "production";
  onClick: () => void;
  onCreateTask: () => void;
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
        <PriorityBadge priority={ticket.priority} />
        {ticket.severity && <SeverityBadge severity={ticket.severity} />}
        {ticket.environment && environmentFilter !== "production" && (
          <Badge variant="neutral" className="text-[10px]">
            {ticket.environment}
          </Badge>
        )}
      </div>

      <p className="mt-2 text-xs font-medium text-foreground line-clamp-2">
        {ticket.headline}
      </p>

      {/* Linked Task badge */}
      {ticket.linkedTaskId && ticket.linkedTaskHeadline ? (
        <div className="mt-2.5 flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckSquare className="h-3 w-3 shrink-0" />
          <span className="truncate">Linked → {ticket.linkedTaskHeadline}</span>
        </div>
      ) : (
        /* "Buat Task" quick action */
        <div className="mt-2.5 pt-2 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Buat Task</span>
          </button>
        </div>
      )}

      {/* People footer (Creator & Assignee) */}
      {(ticket.creatorName || ticket.assigneeName) && (
        <div className="mt-2.5 pt-2 border-t flex items-center justify-between gap-2">
          {ticket.creatorName ? (
            <div className="flex items-center gap-1.5 min-w-0" title={`Dibuat oleh ${ticket.creatorName}`}>
              <Avatar name={ticket.creatorName} size="sm" />
              <p className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                {ticket.creatorName}
              </p>
            </div>
          ) : (
            <div />
          )}

          {ticket.assigneeName && (
            <div className="flex items-center gap-1.5 min-w-0" title={`Ditugaskan ke ${ticket.assigneeName}`}>
              <Avatar name={ticket.assigneeName} size="sm" />
              <p className="text-[11px] font-medium text-foreground truncate max-w-[90px]">
                {ticket.assigneeName}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
