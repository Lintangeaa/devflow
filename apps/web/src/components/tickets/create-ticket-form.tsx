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
import {
  serializeStructuredDescription,
  type StructuredBugDescription,
} from "./structured-description";

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
  const [taskDescription, setTaskDescription] = useState("");
  const [bugFields, setBugFields] = useState<StructuredBugDescription>({
    feature: "",
    devices: "",
    scenario: "",
    given: "",
    when: "",
    then: "",
    output: "",
  });

  const [phaseId, setPhaseId] = useState(type === "task" ? (phases[0]?.id ?? "") : "");
  const [priority, setPriority] = useState<string>("medium");
  const [severity, setSeverity] = useState<string>(type === "bug" ? "minor" : "");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [environment, setEnvironment] = useState<string>(defaultEnvironment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === "task" && !phaseId && phases.length > 0) {
      setPhaseId(phases[0].id);
    }
  }, [type, phases, phaseId]);

  const priorityOptions: ComboboxOption[] = PRIORITIES.map((p) => ({
    value: p,
    label: p,
    badge: <PriorityBadge priority={p} />,
    hideLabel: true,
  }));

  const severityOptions: ComboboxOption[] = SEVERITIES.map((s) => ({
    value: s,
    label: s,
    badge: <SeverityBadge severity={s} />,
    hideLabel: true,
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

    let finalDescription: string | null = null;
    if (type === "bug") {
      if (
        !bugFields.feature.trim() ||
        !bugFields.devices.trim() ||
        !bugFields.scenario.trim() ||
        !bugFields.given.trim() ||
        !bugFields.when.trim() ||
        !bugFields.then.trim() ||
        !bugFields.output.trim()
      ) {
        setError("Seluruh 7 field deskripsi bug (Feature, Devices, Scenario, Given, When, Then, Output) wajib diisi.");
        setSaving(false);
        return;
      }
      finalDescription = serializeStructuredDescription(bugFields);
    } else {
      finalDescription = taskDescription || null;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          headline,
          description: finalDescription,
          phaseId: type === "task" ? (phaseId || null) : null,
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Judul Tiket</label>
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

        {/* Fase only shown for Tasks */}
        {type === "task" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fase</label>
            <Combobox
              options={phaseOptions}
              value={phaseId}
              onChange={setPhaseId}
              placeholder="Pilih Fase..."
            />
          </div>
        )}

        {/* Severity for Bugs */}
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
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Environment (opsional)</label>
            <input
              placeholder="e.g. staging, preview, local..."
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className={`w-full ${fieldClass}`}
            />
          </div>
        )}

        {/* Description: Structured for Bug, Plain for Task */}
        {type === "bug" ? (
          <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-semibold text-foreground">
                Detail Laporan Bug (7 Field Terstruktur)
              </span>
              <span className="text-[10px] text-muted-foreground">Semua field wajib diisi</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Feature</label>
                <input
                  required
                  placeholder="e.g. Login Authentication, Ticket Export"
                  value={bugFields.feature}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, feature: e.target.value }))}
                  className={`w-full ${fieldClass}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Devices</label>
                <input
                  required
                  placeholder="e.g. Chrome macOS, Safari iOS 18"
                  value={bugFields.devices}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, devices: e.target.value }))}
                  className={`w-full ${fieldClass}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Scenario</label>
                <input
                  required
                  placeholder="e.g. User gagal export file saat koneksi lambat"
                  value={bugFields.scenario}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, scenario: e.target.value }))}
                  className={`w-full ${fieldClass}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Given (Kondisi Awal)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. User login sebagai member di project X"
                  value={bugFields.given}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, given: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">When (Aksi Dilakukan)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Menekan tombol 'Export Excel'"
                  value={bugFields.when}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, when: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Then (Ekspektasi)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. File xlsx berhasil diunduh tanpa error"
                  value={bugFields.then}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, then: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Output (Hasil Aktual / Error)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Muncul toast error 500 dan unduhan gagal"
                  value={bugFields.output}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, output: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Deskripsi (opsional)</label>
            <textarea
              placeholder="Deskripsi / acceptance criteria..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        )}

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
