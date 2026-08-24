"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  FileIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, SeverityBadge, TypeBadge } from "@/components/ui/badge";
import {
  BUG_STATUSES,
  PRIORITIES,
  SEVERITIES,
  TASK_STATUSES,
  type Ticket,
} from "@devflow/shared";
import type { ProjectMember } from "@/components/projects/members-modal";

export type Phase = { id: string; name: string; order: number; color: string };
export type TicketWithMeta = Ticket & {
  id: string;
  phaseName?: string;
  assigneeName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
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

  const loadMedia = useCallback(async (ticketId: string) => {
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
  }, [projectId]);

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

    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          description: description || null,
          phaseId: phaseId || null,
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
  const fieldClass =
    "h-9 rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-background p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TypeBadge type={ticket.type} />
                <PriorityBadge priority={ticket.priority} />
                {ticket.type === "bug" && ticket.severity && (
                  <SeverityBadge severity={ticket.severity} />
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
          <form id="ticket-detail-form" onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
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

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full capitalize ${fieldClass}`}
                >
                  {validStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full capitalize ${fieldClass}`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity for bug */}
              {ticket.type === "bug" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className={`w-full capitalize ${fieldClass}`}
                  >
                    <option value="">(Pilih)</option>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Phase */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Fase</label>
                <select
                  value={phaseId}
                  onChange={(e) => setPhaseId(e.target.value)}
                  className={`w-full ${fieldClass}`}
                >
                  <option value="">Tanpa Fase</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className={ticket.type === "bug" ? "col-span-2 sm:col-span-4" : "col-span-2 sm:col-span-1"}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={`w-full ${fieldClass}`}
                >
                  <option value="">Belum Ditugaskan</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Deskripsi / Detail
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tambahkan penjelasan, detail reproduksi, atau catatan..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

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
