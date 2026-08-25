"use client";

import { useEffect, useRef, useState } from "react";
import { Bug, FileIcon, Loader2, Paperclip, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge, SeverityBadge } from "@/components/ui/badge";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { toast } from "sonner";
import { PRIORITIES, SEVERITIES, type BugDetails } from "@devflow/shared";
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 5;
const ALLOWED_MIME = /^image\/(png|jpe?g|gif|webp|avif)$|^video\/(mp4|webm|quicktime)$/i;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
  required,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(rows * 26, scrollH)}px`;
    }
  }, [value, rows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className={className}
    />
  );
}

interface LocalFileItem {
  id: string;
  file: File;
  previewUrl: string;
  isImage: boolean;
  isVideo: boolean;
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
  const [bugFields, setBugFields] = useState<BugDetails>({
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
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<LocalFileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when items are removed or component unmounts
  const attachedFilesRef = useRef<LocalFileItem[]>(attachedFiles);
  attachedFilesRef.current = attachedFiles;

  useEffect(() => {
    return () => {
      for (const item of attachedFilesRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setError(null);

    const newItems: LocalFileItem[] = [];
    const currentCount = attachedFiles.length;

    for (let i = 0; i < selected.length; i++) {
      if (currentCount + newItems.length >= MAX_FILES) {
        setError(`Maksimal ${MAX_FILES} file attachment yang dapat dilampirkan.`);
        break;
      }

      const file = selected[i];
      const mime = file.type.toLowerCase();

      if (!ALLOWED_MIME.test(mime)) {
        setError(`File "${file.name}" memiliki tipe yang tidak diizinkan.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" melebihi batas ukuran 50MB.`);
        continue;
      }

      newItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isImage: mime.startsWith("image/"),
        isVideo: mime.startsWith("video/"),
      });
    }

    if (newItems.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveFile(id: string) {
    setAttachedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavingStatus("Menyimpan tiket...");
    setError(null);

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
        setSavingStatus(null);
        return;
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          headline,
          description: type === "task" ? (taskDescription || null) : null,
          bugDetails: type === "bug" ? bugFields : null,
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
        const errMsg = j?.error?.form?.[0] ?? j?.error ?? "Gagal menyimpan tiket";
        setError(errMsg);
        toast.error(errMsg);
        setSaving(false);
        setSavingStatus(null);
        return;
      }

      const newTicket = (await res.json()) as { id: string };

      // Upload queued attachments in parallel if any
      if (attachedFiles.length > 0 && newTicket?.id) {
        setSavingStatus(`Mengunggah ${attachedFiles.length} file lampiran...`);
        const uploadPromises = attachedFiles.map(async ({ file }) => {
          const formData = new FormData();
          formData.append("file", file);
          return fetch(`/api/projects/${projectId}/tickets/${newTicket.id}/media`, {
            method: "POST",
            body: formData,
          });
        });

        await Promise.allSettled(uploadPromises);
      }

      toast.success(type === "bug" ? "Laporan bug berhasil dibuat" : "Task baru berhasil dibuat");
      onCreated();
    } catch {
      setError("Terjadi kesalahan jaringan saat menyimpan tiket");
      toast.error("Terjadi kesalahan jaringan saat menyimpan tiket");
      setSaving(false);
      setSavingStatus(null);
    }
  }

  const fieldClass =
    "h-9 rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  const textareaClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary resize-none overflow-hidden leading-relaxed";

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
                <AutoResizeTextarea
                  required
                  rows={2}
                  placeholder="e.g. User login sebagai member di project X"
                  value={bugFields.given}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, given: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">When (Aksi Dilakukan)</label>
                <AutoResizeTextarea
                  required
                  rows={2}
                  placeholder="e.g. Menekan tombol 'Export Excel'"
                  value={bugFields.when}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, when: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Then (Ekspektasi)</label>
                <AutoResizeTextarea
                  required
                  rows={2}
                  placeholder="e.g. File xlsx berhasil diunduh tanpa error"
                  value={bugFields.then}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, then: e.target.value }))}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Output (Hasil Aktual / Error)</label>
                <AutoResizeTextarea
                  required
                  rows={2}
                  placeholder="e.g. Muncul toast error 500 dan unduhan gagal"
                  value={bugFields.output}
                  onChange={(e) => setBugFields((prev) => ({ ...prev, output: e.target.value }))}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Deskripsi (opsional)</label>
            <AutoResizeTextarea
              placeholder="Deskripsi / acceptance criteria..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </div>
        )}

        {/* Attachments Section */}
        <div className="sm:col-span-2 rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Paperclip className="h-3.5 w-3.5" />
              <span>Lampiran / Bukti ({attachedFiles.length}/{MAX_FILES})</span>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileSelect}
                disabled={attachedFiles.length >= MAX_FILES || saving}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                disabled={attachedFiles.length >= MAX_FILES || saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Pilih File Bukti</span>
              </Button>
            </div>
          </div>

          {attachedFiles.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Belum ada file dipilih. Anda dapat melampirkan screenshot atau video (maks {MAX_FILES} file, maks 50MB/file).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {attachedFiles.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow-xs transition-all hover:shadow-md"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-muted/50 overflow-hidden">
                    {item.isImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : item.isVideo ? (
                      <video
                        src={item.previewUrl}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileIcon className="h-7 w-7 text-muted-foreground" />
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      disabled={saving}
                      className="absolute top-1.5 right-1.5 rounded-md bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                      title="Hapus file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="p-2">
                    <p className="truncate text-[11px] font-medium text-foreground" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatBytes(item.file.size)}</span>
                      <span className="uppercase">{item.file.type.split("/")[1] || "FILE"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {savingStatus || "Menyimpan..."}
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
