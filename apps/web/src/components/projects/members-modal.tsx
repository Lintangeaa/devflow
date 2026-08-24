"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Search, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  name: string;
  email: string;
  image?: string | null;
};

type UserSearchResult = {
  id: string;
  name: string;
  email: string;
};

interface MembersModalProps {
  projectId: string;
  currentUserRole: "owner" | "member" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMembersUpdated?: () => void;
}

export function MembersModal({
  projectId,
  currentUserRole,
  open,
  onOpenChange,
  onMembersUpdated,
}: MembersModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & add user state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addRole, setAddRole] = useState<"member" | "owner">("member");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal memuat daftar member");
      }
      const data = (await res.json()) as ProjectMember[];
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar member");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadMembers();
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
    }
  }, [open, loadMembers]);

  // Search users effect with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !isOwner) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = (await res.json()) as UserSearchResult[];
          setSearchResults(data);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOwner]);

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const memberUserIds = new Set(members.map((m) => m.userId));
  const filteredSearchResults = searchResults.filter((u) => !memberUserIds.has(u.id));

  async function handleAddMember(user: UserSearchResult) {
    setActionLoadingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: addRole }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.form?.[0] ?? j?.error ?? "Gagal menambahkan member");
      }
      await loadMembers();
      setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
      onMembersUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan member");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleChangeRole(userId: string, newRole: "owner" | "member") {
    setActionLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal mengubah role");
      }
      await loadMembers();
      onMembersUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah role");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Hapus member ini dari project?")) return;
    setActionLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal menghapus member");
      }
      await loadMembers();
      onMembersUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus member");
    } finally {
      setActionLoadingId(null);
    }
  }

  const selectClass =
    "h-8 rounded-lg border bg-background px-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Project Members</Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                Kelola anggota yang memiliki akses ke project ini.
              </Dialog.Description>
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
            <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Add member section (owner only) */}
          {isOwner && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Tambah Member Baru (Cari berdasarkan Email)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ketik email user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-lg border bg-background pl-8 pr-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "member" | "owner")}
                  className="h-9 rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {/* Search results dropdown */}
              {searchQuery.trim() && (
                <div className="mt-2 space-y-1">
                  {isSearching && (
                    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Mencari user...
                    </div>
                  )}
                  {!isSearching && filteredSearchResults.length === 0 && (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Tidak ada user baru ditemukan dengan email tersebut.
                    </p>
                  )}
                  {!isSearching &&
                    filteredSearchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-lg border bg-background p-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Avatar name={u.name} size="sm" />
                          <div className="truncate">
                            <p className="truncate text-xs font-medium">{u.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleAddMember(u)}
                        >
                          {actionLoadingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-3 w-3" /> Tambah
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Member list section */}
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daftar Anggota ({members.length})
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat daftar anggota...
              </div>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Belum ada anggota.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const isSoleOwner = m.role === "owner" && ownerCount <= 1;

                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between rounded-xl border bg-background p-3 transition-colors hover:border-border/80"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar name={m.name} size="md" />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <Badge
                              variant={m.role === "owner" ? "priorityHigh" : "neutral"}
                              className="text-[10px]"
                            >
                              {m.role}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-2">
                          <select
                            value={m.role}
                            disabled={actionLoadingId === m.userId || isSoleOwner}
                            title={
                              isSoleOwner
                                ? "Project harus memiliki minimal satu owner"
                                : "Ubah role member"
                            }
                            onChange={(e) =>
                              handleChangeRole(m.userId, e.target.value as "owner" | "member")
                            }
                            className={selectClass}
                          >
                            <option value="member">Member</option>
                            <option value="owner">Owner</option>
                          </select>

                          <button
                            type="button"
                            disabled={actionLoadingId === m.userId || isSoleOwner}
                            title={
                              isSoleOwner
                                ? "Tidak dapat menghapus owner terakhir"
                                : "Hapus member dari project"
                            }
                            onClick={() => handleRemoveMember(m.userId)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end border-t pt-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                Tutup
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
