"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  Bug,
  CheckSquare,
  FileIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, PriorityBadge, SeverityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  BUG_STATUSES,
  PRIORITIES,
  SEVERITIES,
  TASK_STATUSES,
  type BugDetails,
  type Ticket,
} from "@devflow/shared";
import { authClient } from "@/lib/auth-client";
import { CommentSection } from "./comment-section";
import type { ProjectMember } from "@/components/projects/members-modal";

export type Phase = { id: string; name: string; order: number; color: string };
export type TicketWithMeta = Ticket & {
  id: string;
  bugDetails?: BugDetails | null;
  position?: number;
  phaseName?: string;
  assigneeName?: string | null;
  assigneeImage?: string | null;
  creatorId?: string | null;
  creatorName?: string | null;
  creatorImage?: string | null;
  parentHeadline?: string | null;
  parentType?: string | null;
  linkedTaskId?: string | null;
  linkedTaskHeadline?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type MediaItem = {
  id: string;
  ticketId: string;
  uploadedBy: string;
  fileKey: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  createdAt: string;
  url: string;
};

interface TicketDetailModalProps {
  projectId: string;
  ticket: TicketWithMeta | null;
  phases: Phase[];
  members: ProjectMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

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

export function TicketDetailModal({
  projectId,
  ticket,
  phases,
  members,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: TicketDetailModalProps) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const isOwner = members.some((m) => m.userId === currentUserId && m.role === "owner");

  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [bugFields, setBugFields] = useState<BugDetails>({
    feature: "",
    devices: "",
    scenario: "",
    given: "",
    when: "",
    then: "",
    output: "",
  });

  const [phaseId, setPhaseId] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [severity, setSeverity] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(
    async (ticketId: string) => {
      setLoadingMedia(true);
      setMediaError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/tickets/${ticketId}/media`);
        if (res.ok) {
          const data = (await res.json()) as MediaItem[];
          setMediaList(data);
        }
      } catch {
        setMediaError("Gagal memuat attachment");
      } finally {
        setLoadingMedia(false);
      }
    },
    [projectId],
  );

  // Sync state when ticket changes or modal opens
  useEffect(() => {
    if (ticket && open) {
      setHeadline(ticket.headline ?? "");
      setDescription(ticket.description ?? "");
      setPhaseId(ticket.phaseId ?? "");
      setPriority(ticket.priority ?? "medium");
      setSeverity(ticket.severity ?? "");
      setStatus(ticket.status ?? (ticket.type === "bug" ? "new" : "todo"));
      setAssigneeId(ticket.assigneeId ?? "");
      setError(null);
      setMediaError(null);

      if (ticket.type === "bug") {
        setBugFields({
          feature: ticket.bugDetails?.feature ?? "",
          devices: ticket.bugDetails?.devices ?? "",
          scenario: ticket.bugDetails?.scenario ?? "",
          given: ticket.bugDetails?.given ?? "",
          when: ticket.bugDetails?.when ?? "",
          then: ticket.bugDetails?.then ?? "",
          output: ticket.bugDetails?.output ?? "",
        });
      }

      loadMedia(ticket.id);
    }
  }, [ticket, open, loadMedia]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    setUploadingMedia(true);
    setMediaError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticket.id}/media`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal mengunggah file");
      }

      const newMedia = (await res.json()) as MediaItem;
      setMediaList((prev) => [...prev, newMedia]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "Gagal mengunggah file");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;

    setSaving(true);
    setError(null);

    if (ticket.type === "bug") {
      if (
        !bugFields.feature.trim() ||
        !bugFields.devices.trim() ||
        !bugFields.scenario.trim() ||
        !bugFields.given.trim() ||
        !bugFields.when.trim() ||
        !bugFields.then.trim() ||
        !bugFields.output.trim()
      ) {
        setError("Seluruh 7 field deskripsi bug wajib diisi.");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          description: ticket.type === "task" ? (description || null) : null,
          bugDetails: ticket.type === "bug" ? bugFields : null,
          phaseId: ticket.type === "task" ? (phaseId || null) : null,
          priority,
          severity: ticket.type === "bug" ? (severity || null) : null,
          status,
          assigneeId: assigneeId || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.form?.[0] ?? j?.error ?? "Gagal menyimpan perubahan");
      }

      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!ticket) return;
    if (!confirm(`Hapus ${ticket.type === "bug" ? "bug" : "task"} "${ticket.headline}"?`)) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticket.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal menghapus tiket");
      }

      onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus tiket");
    } finally {
      setDeleting(false);
    }
  }

  if (!ticket) return null;

  const validStatuses = ticket.type === "bug" ? BUG_STATUSES : TASK_STATUSES;

  const statusOptions: ComboboxOption[] = validStatuses.map((s) => {
    const label = s === "ready_for_qa" ? "Ready for QA" : s.replace(/_/g, " ");
    return {
      value: s,
      label,
      badge: (
        <Badge className="capitalize text-[10px]">
          {label}
        </Badge>
      ),
      hideLabel: true,
    };
  });

  const priorityOptions: ComboboxOption[] = PRIORITIES.map((p) => ({
    value: p,
    label: p,
    badge: <PriorityBadge priority={p} />,
    hideLabel: true,
  }));

  const severityOptions: ComboboxOption[] = [
    { value: "", label: "(Pilih Severity)" },
    ...SEVERITIES.map((s) => ({
      value: s,
      label: s,
      badge: <SeverityBadge severity={s} />,
      hideLabel: true,
    })),
  ];

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

  const fieldClass =
    "h-9 rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  const textareaClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary resize-none overflow-hidden leading-relaxed";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-background p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={ticket.type} />
                <PriorityBadge priority={ticket.priority} />
                {ticket.type === "bug" && ticket.severity && (
                  <SeverityBadge severity={ticket.severity} />
                )}
                {ticket.environment && (
                  <Badge variant="neutral" className="text-[10px]">
                    Env: {ticket.environment}
                  </Badge>
                )}
              </div>
              <Dialog.Title className="text-lg font-semibold">{ticket.headline}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Content */}
          <form
            id="ticket-detail-form"
            onSubmit={handleSave}
            className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-4 pr-1.5"
          >
            {/* Read-only Identity & Timeline Metadata Bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70">Dibuat oleh:</span>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Avatar
                    name={
                      ticket.creatorName ||
                      members.find((m) => m.userId === ticket.creatorId)?.name ||
                      "Unknown"
                    }
                    size="sm"
                  />
                  <span>
                    {ticket.creatorName ||
                      members.find((m) => m.userId === ticket.creatorId)?.name ||
                      "Unknown"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70">Dibuat:</span>
                <span className="font-medium text-foreground">{formatDateTime(ticket.createdAt)}</span>
              </div>

              {ticket.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground/70">Diperbarui:</span>
                  <span className="font-medium text-foreground">{formatDateTime(ticket.updatedAt)}</span>
                </div>
              )}

              {ticket.resolvedAt && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="text-[11px] text-muted-foreground/70">Selesai:</span>
                  <span>{formatDateTime(ticket.resolvedAt)}</span>
                </div>
              )}
            </div>

            {/* Linked Bug or Task banner */}
            {ticket.type === "task" && ticket.parentId && ticket.parentHeadline && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                <Bug className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">Terkait dengan Bug: </span>
                  <span className="font-semibold text-foreground truncate">{ticket.parentHeadline}</span>
                </div>
              </div>
            )}

            {ticket.type === "bug" && ticket.linkedTaskId && ticket.linkedTaskHeadline && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">Task Perbaikan: </span>
                  <span className="font-semibold text-foreground truncate">{ticket.linkedTaskHeadline}</span>
                </div>
              </div>
            )}

            {/* Headline */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Judul</label>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className={`w-full ${fieldClass}`}
              />
            </div>

            {/* Grid properties with Combobox */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                <Combobox
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                  placeholder="Pilih Status..."
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                <Combobox
                  options={priorityOptions}
                  value={priority}
                  onChange={setPriority}
                  placeholder="Pilih Priority..."
                />
              </div>

              {/* Severity for bug */}
              {ticket.type === "bug" && (
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

              {/* Phase only shown for Task */}
              {ticket.type === "task" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Fase</label>
                  <Combobox
                    options={phaseOptions}
                    value={phaseId}
                    onChange={setPhaseId}
                    placeholder="Tanpa Fase"
                  />
                </div>
              )}

              {/* Assignee */}
              <div className={ticket.type === "bug" ? "col-span-1 sm:col-span-2 lg:col-span-1" : "col-span-1 sm:col-span-2 lg:col-span-1"}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Assignee</label>
                <Combobox
                  options={assigneeOptions}
                  value={assigneeId}
                  onChange={setAssigneeId}
                  placeholder="Belum Ditugaskan"
                  searchPlaceholder="Cari member..."
                />
              </div>
            </div>

            {/* Description: Structured for Bug (always), or Plain Textarea for Task */}
            {ticket.type === "bug" ? (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
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
                      placeholder="e.g. Login Authentication"
                      value={bugFields.feature}
                      onChange={(e) => setBugFields((prev) => ({ ...prev, feature: e.target.value }))}
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Devices</label>
                    <input
                      required
                      placeholder="e.g. Chrome macOS, Safari iOS"
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
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Deskripsi / Detail
                </label>
                <AutoResizeTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Tambahkan penjelasan, detail reproduksi, atau catatan..."
                  className={textareaClass}
                />
              </div>
            )}

            {/* Attachments section */}
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Attachments ({mediaList.length})</span>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={uploadingMedia}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingMedia ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Mengunggah...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1 h-3 w-3" /> Unggah Bukti / Media
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {mediaError && (
                <p className="mb-2 text-xs text-destructive">{mediaError}</p>
              )}

              {loadingMedia ? (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Memuat attachment...
                </div>
              ) : mediaList.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Belum ada attachment screenshot atau video.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mediaList.map((m) => {
                    const isImage = m.mime.startsWith("image/");
                    const isVideo = m.mime.startsWith("video/");

                    return (
                      <div
                        key={m.id}
                        className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow-xs transition-all hover:shadow-md"
                      >
                        <div className="relative flex h-28 w-full items-center justify-center bg-muted/50 overflow-hidden">
                          {isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={m.url}
                              alt={m.originalName}
                              className="h-full w-full object-cover"
                            />
                          ) : isVideo ? (
                            <video
                              src={m.url}
                              controls
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="p-2">
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[11px] font-medium text-foreground hover:underline"
                            title={m.originalName}
                          >
                            {m.originalName}
                          </a>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{formatBytes(m.size)}</span>
                            <span className="uppercase">{m.mime.split("/")[1]}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments & Discussion section */}
            <CommentSection
              projectId={projectId}
              ticketId={ticket.id}
              members={members}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          </form>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting || saving}
              onClick={handleDelete}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Hapus Tiket
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm" disabled={saving}>
                  Batal
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                form="ticket-detail-form"
                size="sm"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
