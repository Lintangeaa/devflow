import React from "react";
import { CheckSquare } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function MyTasksPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
              <Badge variant="neutral" className="text-xs border border-primary/40 text-primary bg-primary/10">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Personal dashboard untuk memantau semua tugas dan bug yang di-assign ke Anda lintas project.
            </p>
          </div>
        </div>

        <EmptyState
          icon={CheckSquare}
          title="Personal Workspace Segera Hadir"
          description="Fitur My Tasks sedang dalam tahap perancangan untuk mengumpulkan seluruh tiket dan bug Anda dalam satu tampilan terpusat."
          className="my-12 py-16 border-dashed"
        />
      </div>
    </AppShell>
  );
}
