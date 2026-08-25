"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bug,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  Layers,
  MessageSquare,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { PriorityBadge, SeverityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { TicketWithMeta } from "@/components/tickets/ticket-detail-modal";

export interface MyTasksTicketItem extends TicketWithMeta {
  projectId: string;
  projectName: string;
  projectSlug: string;
  commentsCount?: number;
  mediaCount?: number;
  creatorImage?: string | null;
}

interface GroupSection {
  key: string;
  title: string;
  color: string;
  bg: string;
  tickets: MyTasksTicketItem[];
}

export function MyTasksList({
  tickets,
  onSelectTicket,
  emptyTitle = "Tidak ada tiket tugas",
  emptyDescription = "Anda belum memiliki tugas pada kategori ini.",
}: {
  tickets: MyTasksTicketItem[];
  onSelectTicket: (ticket: MyTasksTicketItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  // Group tickets by logical status
  const inProgressList = tickets.filter((t) => t.status === "in_progress");
  const todoList = tickets.filter((t) => ["todo", "new", "open"].includes(t.status || ""));
  const qaList = tickets.filter((t) => ["ready_for_qa", "testing"].includes(t.status || ""));
  const doneList = tickets.filter((t) => ["done", "resolved", "closed"].includes(t.status || ""));

  const sections: GroupSection[] = [
    {
      key: "in_progress",
      title: "Sedang Dikerjakan (In Progress)",
      color: "bg-amber-500",
      bg: "border-amber-500/30",
      tickets: inProgressList,
    },
    {
      key: "todo",
      title: "Antrean (Todo & Open)",
      color: "bg-blue-500",
      bg: "border-blue-500/30",
      tickets: todoList,
    },
    {
      key: "qa",
      title: "Siap Uji (Ready for QA)",
      color: "bg-purple-500",
      bg: "border-purple-500/30",
      tickets: qaList,
    },
    {
      key: "done",
      title: "Terselesaikan (Done & Resolved)",
      color: "bg-emerald-500",
      bg: "border-emerald-500/30",
      tickets: doneList,
    },
  ];

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={emptyTitle}
        description={emptyDescription}
        className="my-8 py-16"
      />
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        if (section.tickets.length === 0) return null;
        return (
          <StatusGroup
            key={section.key}
            section={section}
            onSelectTicket={onSelectTicket}
          />
        );
      })}
    </div>
  );
}

function StatusGroup({
  section,
  onSelectTicket,
}: {
  section: GroupSection;
  onSelectTicket: (ticket: MyTasksTicketItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border bg-card/40 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${section.color}`} />
          <h3 className="font-semibold text-sm tracking-tight">{section.title}</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground font-mono font-medium">
            {section.tickets.length}
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {section.tickets.map((t) => (
            <MyTaskCard key={t.id} ticket={t} onSelect={() => onSelectTicket(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyTaskCard({
  ticket,
  onSelect,
}: {
  ticket: MyTasksTicketItem;
  onSelect: () => void;
}) {
  const isDone = ["done", "resolved", "closed"].includes(ticket.status || "");

  // Due Date calculation
  let isOverdue = false;
  let isDueSoon = false;
  if (ticket.dueDate && !isDone) {
    const due = new Date(ticket.dueDate);
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (due < now) isOverdue = true;
    else if (due <= threeDays) isDueSoon = true;
  }

  return (
    <div
      onClick={onSelect}
      className="group flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Type Icon */}
        <div className="mt-0.5 shrink-0">
          {ticket.type === "bug" ? (
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Bug className="h-4 w-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Project Badge */}
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-[11px]">
              <FolderGit2 className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px]">{ticket.projectName}</span>
            </span>

            {ticket.phaseName && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-[11px]">
                <Layers className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]">{ticket.phaseName}</span>
              </span>
            )}

            <PriorityBadge priority={ticket.priority} />
            {ticket.severity && <SeverityBadge severity={ticket.severity} />}
          </div>

          <h4
            className={`text-sm font-medium leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2 ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {ticket.headline}
          </h4>

          {ticket.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {ticket.description}
            </p>
          )}
        </div>
      </div>

      {/* Right meta */}
      <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs text-muted-foreground self-end md:self-center">
        {ticket.dueDate && (
          <div
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
              isOverdue
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : isDueSoon
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>{new Date(ticket.dueDate).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}</span>
          </div>
        )}

        {(ticket.commentsCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-[11px]">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{ticket.commentsCount}</span>
          </div>
        )}

        {(ticket.mediaCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-[11px]">
            <Paperclip className="h-3.5 w-3.5" />
            <span>{ticket.mediaCount}</span>
          </div>
        )}

        {/* Board Direct Link */}
        <Link
          href={`/projects/${ticket.projectId}/board`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-muted transition-colors text-[11px]"
          title="Buka di Kanban Board"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Board</span>
        </Link>
      </div>
    </div>
  );
}
