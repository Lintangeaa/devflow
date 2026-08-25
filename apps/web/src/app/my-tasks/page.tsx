"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AtSign,
  CheckSquare,
  Loader2,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  MyTasksMetrics,
  type MyTasksMetricsData,
} from "@/components/my-tasks/my-tasks-metrics";
import {
  MyTasksFilterBar,
  defaultMyTasksFilterState,
  type MyTasksFilterState,
  type MyTasksProjectOption,
} from "@/components/my-tasks/my-tasks-filter-bar";
import {
  MyTasksList,
  type MyTasksTicketItem,
} from "@/components/my-tasks/my-tasks-list";
import { TicketDetailModal } from "@/components/tickets/ticket-detail-modal";
import { SkeletonMetricGrid } from "@/components/ui/skeleton";

type ViewTab = "assigned" | "reported" | "mentioned";

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("assigned");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MyTasksMetricsData>({
    totalAssigned: 0,
    totalReported: 0,
    totalMentioned: 0,
    totalInProgress: 0,
    totalTodo: 0,
    totalDueSoon: 0,
    totalResolved: 0,
  });
  const [projects, setProjects] = useState<MyTasksProjectOption[]>([]);
  const [tickets, setTickets] = useState<MyTasksTicketItem[]>([]);
  const [filters, setFilters] = useState<MyTasksFilterState>(defaultMyTasksFilterState);

  // Selected ticket for modal preview
  const [selectedTicket, setSelectedTicket] = useState<MyTasksTicketItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/my-tasks?view=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        setProjects(data.projects || []);
        setTickets(data.tickets || []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Client side filtering for responsive feel
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchHeadline = t.headline.toLowerCase().includes(query);
        const matchId = t.id.toLowerCase().includes(query);
        const matchProject = t.projectName?.toLowerCase().includes(query);
        if (!matchHeadline && !matchId && !matchProject) return false;
      }

      // 2. Project
      if (filters.projectId !== "all" && t.projectId !== filters.projectId) {
        return false;
      }

      // 3. Type
      if (filters.type !== "all" && t.type !== filters.type) {
        return false;
      }

      // 4. Priority
      if (filters.priority !== "all" && t.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [tickets, filters]);

  const tabLabels: Record<ViewTab, { title: string; desc: string; emptyTitle: string; emptyDesc: string }> = {
    assigned: {
      title: "Tugasku",
      desc: "Seluruh task dan bug yang didelegasikan atau ditugaskan kepada Anda.",
      emptyTitle: "Belum ada tugas yang di-assign ke Anda",
      emptyDesc: "Anda tidak memiliki tugas atau perbaikan bug aktif saat ini.",
    },
    reported: {
      title: "Dibuat oleh Saya",
      desc: "Daftar seluruh tiket task atau laporan bug yang pernah Anda buat.",
      emptyTitle: "Belum ada tiket yang Anda laporkan",
      emptyDesc: "Tiket atau bug yang Anda buat akan muncul di sini.",
    },
    mentioned: {
      title: "Disebutkan (Mentions)",
      desc: "Tiket di mana rekan tim me-mention @namaAnda dalam diskusi komentar.",
      emptyTitle: "Belum ada sebutan mention untuk Anda",
      emptyDesc: "Ketika seseorang menyebut Anda di komentar tiket, tiket akan muncul di sini.",
    },
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personal workspace terpadu untuk memantau beban kerja dan progres tugas Anda lintas seluruh project.
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        {loading ? (
          <SkeletonMetricGrid />
        ) : (
          <MyTasksMetrics metrics={metrics} />
        )}

        {/* View Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("assigned");
                setFilters(defaultMyTasksFilterState);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all ${
                activeTab === "assigned"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Tugasku (Assigned)</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono font-semibold">
                {metrics.totalAssigned}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("reported");
                setFilters(defaultMyTasksFilterState);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all ${
                activeTab === "reported"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Dibuat oleh Saya (Reported)</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono font-semibold">
                {metrics.totalReported}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("mentioned");
                setFilters(defaultMyTasksFilterState);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all ${
                activeTab === "mentioned"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <AtSign className="h-4 w-4" />
              <span>Disebutkan (Mentions)</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono font-semibold">
                {metrics.totalMentioned}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Description & Quick Filters */}
        <div className="space-y-4">
          <MyTasksFilterBar
            filters={filters}
            onFilterChange={setFilters}
            projects={projects}
            totalCount={tickets.length}
            filteredCount={filteredTickets.length}
          />

          {/* Grouped Status List */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memuat tiket personal...</span>
            </div>
          ) : (
            <MyTasksList
              tickets={filteredTickets}
              onSelectTicket={setSelectedTicket}
              emptyTitle={tabLabels[activeTab].emptyTitle}
              emptyDescription={tabLabels[activeTab].emptyDesc}
            />
          )}
        </div>

        {/* In-place Ticket Detail Modal */}
        {selectedTicket && (
          <TicketDetailModal
            projectId={selectedTicket.projectId}
            ticket={selectedTicket}
            phases={[]}
            members={[]}
            open={!!selectedTicket}
            onOpenChange={(open) => {
              if (!open) setSelectedTicket(null);
            }}
            onUpdated={() => {
              loadData();
            }}
            onDeleted={() => {
              setSelectedTicket(null);
              loadData();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
