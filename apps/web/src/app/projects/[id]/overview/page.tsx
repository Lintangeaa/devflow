"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bug,
  CheckCircle2,
  CheckSquare,
  Flame,
  PlusCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProject } from "@/components/projects/project-context";
import { Badge, PriorityBadge, SeverityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TicketDetailModal, type TicketWithMeta } from "@/components/tickets/ticket-detail-modal";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

type OverviewData = {
  summary: {
    totalTasks: number;
    totalBugs: number;
    totalProdBugs: number;
    totalInProgress: number;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
  };
  bugs: {
    total: number;
    byStatus: Record<string, number>;
  };
  productionBugs: {
    total: number;
    byStatus: Record<string, number>;
  };
  inProgressTickets: TicketWithMeta[];
};

const TASK_STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#64748b",
  in_progress: "#3b82f6",
  done: "#10b981",
};

const BUG_STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  open: "#eab308",
  in_progress: "#f97316",
  ready_for_qa: "#8b5cf6",
  resolved: "#10b981",
  closed: "#6b7280",
};

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { phases, members } = useProject();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);
  const [taskParentBug, setTaskParentBug] = useState<{ id: string; headline: string } | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/overview`);
      if (res.ok) {
        const json = (await res.json()) as OverviewData;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Memuat overview project...
      </div>
    );
  }

  const taskChartData = Object.entries(data.tasks.byStatus).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    count,
    color: TASK_STATUS_COLORS[status] ?? "#6366f1",
  }));

  const bugChartData = Object.entries(data.bugs.byStatus).map(([status, count]) => ({
    name: status === "ready_for_qa" ? "Ready QA" : status.replace(/_/g, " "),
    count,
    color: BUG_STATUS_COLORS[status] ?? "#ef4444",
  }));

  const prodBugChartData = Object.entries(data.productionBugs.byStatus).map(
    ([status, count]) => ({
      name: status === "ready_for_qa" ? "Ready QA" : status.replace(/_/g, " "),
      count,
      color: BUG_STATUS_COLORS[status] ?? "#f97316",
    }),
  );

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-background p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Tasks</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight">{data.summary.totalTasks}</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{data.tasks.byStatus.done ?? 0} selesai</span>
              <span>•</span>
              <span>{data.tasks.byStatus.in_progress ?? 0} aktif</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Bugs (Pre-Production)</span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Bug className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight">{data.summary.totalBugs}</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{data.bugs.byStatus.resolved ?? 0} resolved</span>
              <span>•</span>
              <span>
                {(data.bugs.byStatus.new ?? 0) +
                  (data.bugs.byStatus.open ?? 0) +
                  (data.bugs.byStatus.in_progress ?? 0) +
                  (data.bugs.byStatus.ready_for_qa ?? 0)}{" "}
                unresolved
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Production Bugs</span>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight">{data.summary.totalProdBugs}</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{data.productionBugs.byStatus.resolved ?? 0} resolved</span>
              <span>•</span>
              <span>
                {(data.productionBugs.byStatus.new ?? 0) +
                  (data.productionBugs.byStatus.open ?? 0) +
                  (data.productionBugs.byStatus.in_progress ?? 0) +
                  (data.productionBugs.byStatus.ready_for_qa ?? 0)}{" "}
                unresolved
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sedang Dikerjakan</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight">{data.summary.totalInProgress}</span>
            <p className="mt-1 text-xs text-muted-foreground">Tiket aktif ditangani</p>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task Distribution */}
        <div className="rounded-2xl border bg-background p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Status Task Dev</h3>
              <p className="text-xs text-muted-foreground">Distribusi workflow pengerjaan</p>
            </div>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {taskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bug Distribution */}
        <div className="rounded-2xl border bg-background p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Status Bug Pre-Production</h3>
              <p className="text-xs text-muted-foreground">Temuan internal & staging</p>
            </div>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bugChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {bugChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production Ticket Distribution */}
        <div className="rounded-2xl border bg-background p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Status Production Tickets</h3>
              <p className="text-xs text-muted-foreground">Insiden & live bug produksi</p>
            </div>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodBugChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {prodBugChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* In-Progress Tickets List */}
      <div className="rounded-2xl border bg-background p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Tiket Sedang Dikerjakan (In Progress)</h3>
            <p className="text-xs text-muted-foreground">
              Daftar pekerjaan aktif yang sedang ditangani oleh tim
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {data.inProgressTickets.length} aktif
          </span>
        </div>

        {data.inProgressTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-xl">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">Tidak ada tiket yang sedang in-progress</p>
            <p className="text-xs text-muted-foreground">Semua tiket sedang dalam backlog, todo, atau telah selesai.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.inProgressTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="cursor-pointer rounded-xl border bg-muted/20 p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <TypeBadge type={ticket.type} />
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.type === "bug" && ticket.severity && (
                    <SeverityBadge severity={ticket.severity} />
                  )}
                  {ticket.environment && (
                    <Badge variant="neutral" className="text-[10px]">
                      {ticket.environment}
                    </Badge>
                  )}
                </div>

                <p className="mt-2 text-xs font-medium text-foreground line-clamp-2">
                  {ticket.headline}
                </p>

                {/* Bug Details Preview */}
                {ticket.type === "bug" &&
                  ticket.bugDetails &&
                  (ticket.bugDetails.scenario || ticket.bugDetails.feature) && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground/80 italic">
                      {ticket.bugDetails.scenario || ticket.bugDetails.feature}
                    </p>
                  )}

                {/* Parent Bug link for tasks */}
                {ticket.parentId && ticket.parentHeadline && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-primary truncate">
                    <Bug className="h-3 w-3 shrink-0" />
                    <span className="truncate">Bug: {ticket.parentHeadline}</span>
                  </div>
                )}

                {/* Linked Task badge or Buat Task quick action for bugs */}
                {ticket.type === "bug" &&
                  (ticket.linkedTaskId && ticket.linkedTaskHeadline ? (
                    <div className="mt-2.5 flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate">Linked → {ticket.linkedTaskHeadline}</span>
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskParentBug({ id: ticket.id, headline: ticket.headline });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Buat Task</span>
                      </button>
                    </div>
                  ))}

                {/* People footer (Creator & Assignee) */}
                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground gap-2">
                  {ticket.creatorName ? (
                    <div
                      className="flex items-center gap-1.5 min-w-0"
                      title={`Dibuat oleh ${ticket.creatorName}`}
                    >
                      <Avatar name={ticket.creatorName} size="sm" />
                      <span className="truncate max-w-[90px] text-muted-foreground">
                        {ticket.creatorName}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-1.5 min-w-0">
                    {ticket.assigneeName ? (
                      <div
                        className="flex items-center gap-1.5 min-w-0"
                        title={`Ditugaskan ke ${ticket.assigneeName}`}
                      >
                        <Avatar name={ticket.assigneeName} size="sm" />
                        <span className="truncate max-w-[90px] font-medium text-foreground">
                          {ticket.assigneeName}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-[10px]">Tanpa Assignee</span>
                    )}
                    {ticket.phaseName && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] shrink-0">
                        {ticket.phaseName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
        onUpdated={loadOverview}
        onDeleted={loadOverview}
      />

      {/* Create Task modal linked to a parent bug */}
      {taskParentBug && (
        <CreateTicketForm
          projectId={id}
          type="task"
          parentId={taskParentBug.id}
          parentHeadline={taskParentBug.headline}
          phases={phases}
          members={members}
          onClose={() => setTaskParentBug(null)}
          onCreated={() => {
            setTaskParentBug(null);
            loadOverview();
          }}
        />
      )}
    </div>
  );
}
