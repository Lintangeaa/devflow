"use client";

import { AlertCircle, CheckCircle2, Clock, ListTodo } from "lucide-react";

export interface MyTasksMetricsData {
  totalAssigned: number;
  totalReported: number;
  totalMentioned: number;
  totalInProgress: number;
  totalTodo: number;
  totalDueSoon: number;
  totalResolved: number;
}

export function MyTasksMetrics({ metrics }: { metrics: MyTasksMetricsData }) {
  const cards = [
    {
      title: "Sedang Dikerjakan",
      value: metrics.totalInProgress,
      label: "In Progress",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Antrean Kerja",
      value: metrics.totalTodo,
      label: "Todo & Open",
      icon: ListTodo,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Mendekati Deadline",
      value: metrics.totalDueSoon,
      label: "Due Soon / Overdue",
      icon: AlertCircle,
      color: metrics.totalDueSoon > 0 ? "text-rose-500" : "text-muted-foreground",
      bg: metrics.totalDueSoon > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/40 border-border",
    },
    {
      title: "Terselesaikan",
      value: metrics.totalResolved,
      label: "Resolved & Done",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className={`flex items-center justify-between rounded-xl border p-4 transition-all shadow-soft ${c.bg}`}
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.title}</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1">{c.value}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">{c.label}</p>
            </div>
            <div className={`p-2.5 rounded-lg bg-background/80 ${c.color} shadow-xs`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
