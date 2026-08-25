"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProjectMember } from "@/components/projects/members-modal";

export interface CommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface CommentItem {
  id: string;
  ticketId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: CommentUser | null;
}

interface CommentSectionProps {
  projectId: string;
  ticketId: string;
  members: ProjectMember[];
  currentUserId?: string | null;
  isOwner?: boolean;
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}h lalu`;
  return new Date(dateString).toLocaleDateString("id-ID", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderFormattedBody(body: string) {
  // Matches @[User Name](userId)
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    const name = match[1];
    parts.push(
      <span
        key={`${match.index}-${name}`}
        className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        @{name}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return <span className="whitespace-pre-wrap leading-relaxed">{parts}</span>;
}

export function CommentSection({
  projectId,
  ticketId,
  members,
  currentUserId,
  isOwner,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticketId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId, ticketId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setBody(val);

    // Look backward from cursor to see if we are in an @mention
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_ -]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionIndex(atMatch.index!);
      setActiveSuggestion(0);
    } else {
      setMentionQuery(null);
      setMentionIndex(-1);
    }
  }

  const filteredMembers = mentionQuery !== null
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(mentionQuery) ||
          m.email.toLowerCase().includes(mentionQuery),
      )
    : [];

  function selectMention(member: ProjectMember) {
    if (mentionIndex === -1 || !textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart;
    const beforeAt = body.slice(0, mentionIndex);
    const afterCursor = body.slice(cursor);
    const mentionTag = `@[${member.name}](${member.userId}) `;

    const newText = beforeAt + mentionTag + afterCursor;
    setBody(newText);
    setMentionQuery(null);
    setMentionIndex(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const nextCursor = beforeAt.length + mentionTag.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredMembers[activeSuggestion];
        if (selected) {
          selectMention(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setBody("");
        setMentionQuery(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Hapus komentar ini?")) return;
    setDeletingId(commentId);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { method: "DELETE" },
      );

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Diskusi & Komentar ({comments.length})
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Ketik @ untuk me-mention member</span>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Memuat komentar...
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Belum ada komentar. Mulai diskusi atau sebut @member tim Anda.
          </p>
        ) : (
          comments.map((c) => {
            const authorName = c.user?.name || "Unknown";
            const canDelete = currentUserId === c.userId || isOwner;

            return (
              <div
                key={c.id}
                className="group relative flex items-start gap-3 rounded-xl border bg-background p-3 text-xs shadow-2xs transition-all hover:shadow-xs"
              >
                <Avatar name={authorName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded-md"
                        title="Hapus komentar"
                      >
                        {deletingId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="text-foreground/90">{renderFormattedBody(c.body)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input box with @mention autocomplete */}
      <div className="relative">
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-50 w-64 max-h-48 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in zoom-in-95">
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground border-b mb-1">
              Pilih member untuk di-mention
            </div>
            {filteredMembers.map((m, idx) => (
              <div
                key={m.userId}
                onClick={() => selectMention(m)}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                  idx === activeSuggestion ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                }`}
              >
                <Avatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs">{m.name}</div>
                  <div
                    className={`truncate text-[10px] ${
                      idx === activeSuggestion ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {m.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-primary transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={body}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Tulis komentar... Gunakan @ untuk mention member"
            className="flex-1 resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={!body.trim() || submitting}
            className="h-8 gap-1.5 px-3 text-xs"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Kirim</span>
              </>
            )}
          </Button>
        </div>
        <span className="mt-1 block text-[10px] text-muted-foreground/70">
          Tekan <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">Cmd</kbd> +{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">Enter</kbd> untuk mengirim
        </span>
      </div>
    </div>
  );
}
