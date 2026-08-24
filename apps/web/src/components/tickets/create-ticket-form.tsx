"use client";

import { useEffect, useState } from "react";
import { Bug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge, SeverityBadge } from "@/components/ui/badge";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { PRIORITIES, SEVERITIES } from "@devflow/shared";
import type { Phase } from "@/components/tickets/ticket-detail-modal";
import type { ProjectMember } from "@/components/projects/members-modal";

export interface CreateTicketFormProps {
  projectId: string;
  type: "task" | "bug";
  lockType?: boolean;
  parentId?: string | null;
  parentHeadline?: string | null;
  defaultEnvironment?: string | null;
  phases: Phase[];
  members: ProjectMember[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTicketForm({
  projectId,
  type,
  parentId = null,
  parentHeadline = null,
  defaultEnvironment = null,
  phases,
  members,
  onClose,
  onCreated,
}: CreateTicketFormProps) {
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? "");
  const [priority, setPriority] = useState<string>("medium");
  const [severity, setSeverity] = useState<string>(type === "bug" ? "minor" : "");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [environment, setEnvironment] = useState<string>(defaultEnvironment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!phaseId && phases.length > 0) {
      setPhaseId(phases[0].id);
    }
  }, [phases, phaseId]);

  const priorityOptions: ComboboxOption[] = PRIORITIES.map((p) => ({
    value: p,
    label: p,
    badge: <PriorityBadge priority={p} />,
  }));

  const severityOptions: ComboboxOption[] = SEVERITIES.map((s) => ({
    value: s,
    label: s,
    badge: <SeverityBadge severity={s} />,
  }));

  const phaseOptions: ComboboxOption[] = [
    { value: "", label: "Tanpa Fase" },
    ...phases.map((p) => ({
      value: p.id,
      label: p.name,
      color: p.color,
    })),
  ];

  const assigneeOptions: ComboboxOption[] = [
    { value: "", label: "Belum Ditugaskan" },
    ...members.map((m) => ({
      value: m.userId,
      label: m.name,
      description: m.email,
      badge: <Avatar name={m.name} size="sm" />,
    })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          headline,
          description: description || null,
          phaseId: phaseId || null,
          parentId: parentId || null,
          priority,
          severity: type === "bug" ? (severity || undefined) : undefined,
          assigneeId: assigneeId || null,
          environment: environment || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error?.form?.[0] ?? j?.error ?? "Gagal menyimpan tiket");
        setSaving(false);
        return;
      }

      onCreated();
    } catch {
      setError("Terjadi kesalahan jaringan");
      setSaving(false);
    }
  }

  const fieldClass =
    "h-9 rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="mb-6 rounded-xl border bg-background p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-sm">
          Buat {type === "bug" ? (defaultEnvironment === "production" ? "Ticket (Production Incident)" : "Bug") : "Task"} baru
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {parentId && parentHeadline && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs">
          <Bug className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground">Perbaikan untuk bug: </span>
            <span className="font-semibold text-foreground truncate">{parentHeadline}</span>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <input
            required
            placeholder="Judul tiket..."
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={`w-full ${fieldClass}`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
          <Combobox
            options={priorityOptions}
            value={priority}
            onChange={setPriority}
            placeholder="Pilih Priority..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Fase</label>
          <Combobox
            options={phaseOptions}
            value={phaseId}
            onChange={setPhaseId}
            placeholder="Pilih Fase..."
          />
        </div>

        {type === "bug" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Severity</label>
            <Combobox
              options={severityOptions}
              value={severity}
              onChange={setSeverity}
              placeholder="Pilih Severity..."
            />
          </div>
        )}

        <div className={type === "bug" ? "" : "sm:col-span-2"}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Assignee</label>
          <Combobox
            options={assigneeOptions}
            value={assigneeId}
            onChange={setAssigneeId}
            placeholder="Belum Ditugaskan"
            searchPlaceholder="Cari member..."
          />
        </div>

        {type === "bug" && defaultEnvironment === undefined && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Environment (opsional)</label>
            <input
              placeholder="e.g. staging, preview, local..."
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className={`w-full ${fieldClass}`}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Deskripsi (opsional)</label>
          <textarea
            placeholder="Deskripsi / langkah reproduksi / acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
