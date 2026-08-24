"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Badge, PriorityBadge, SeverityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITIES } from "@devflow/shared";
import { MembersModal, type ProjectMember } from "@/components/projects/members-modal";
import { TicketDetailModal, type Phase, type TicketWithMeta } from "@/components/tickets/ticket-detail-modal";

type ProjectInfo = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [project, setProject] = useState<(ProjectInfo & { phases: Phase[] }) | null>(null);
  const [tickets, setTickets] = useState<TicketWithMeta[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<"task" | "bug" | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);
  const [creatingDefaultPhases, setCreatingDefaultPhases] = useState(false);

  // Safe client-side session resolution
  useEffect(() => {
    let mounted = true;
    authClient
      .getSession()
      .then((res) => {
        if (!mounted) return;
        if (!res?.data?.user) {
          router.replace("/login");
        } else {
          setSessionUser(res.data.user as SessionUser);
          setAuthChecking(false);
        }
      })
      .catch(() => {
        if (mounted) router.replace("/login");
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  const load = useCallback(async () => {
    try {
      const [pRes, tRes, mRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/tickets`),
        fetch(`/api/projects/${id}/members`),
      ]);
      if (pRes.ok) setProject((await pRes.json()) as typeof project);
      if (tRes.ok) setTickets((await tRes.json()) as TicketWithMeta[]);
      if (mRes.ok) setMembers((await mRes.json()) as ProjectMember[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (sessionUser) load();
  }, [sessionUser, load]);

  const currentUserRole =
    members.find((m) => m.userId === sessionUser?.id)?.role ??
    (project?.ownerId === sessionUser?.id ? "owner" : null);

  const isOwner = currentUserRole === "owner";

  async function createDefaultPhases() {
    if (!project) return;
    setCreatingDefaultPhases(true);
    const defaults = [
      { name: "Planning", color: "#6366f1", order: 0 },
      { name: "In Progress", color: "#f59e0b", order: 1 },
      { name: "Testing / QA", color: "#8b5cf6", order: 2 },
      { name: "Done", color: "#10b981", order: 3 },
    ];

    try {
      for (const phase of defaults) {
        await fetch(`/api/projects/${project.id}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(phase),
        });
      }
      await load();
    } finally {
      setCreatingDefaultPhases(false);
    }
  }

  if (authChecking || loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Memuat project board...
        </main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Header />
        <main className="p-6">Project tidak ditemukan.</main>
      </>
    );
  }

  const unphasedTickets = tickets.filter((t) => !t.phaseId);

  return (
    <>
      <Header />
      <main className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMembersModal(true)}
              className="gap-1.5"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Members</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {members.length}
              </span>
            </Button>
            <a href={`/api/projects/${id}/export`} target="_blank" rel="noreferrer">
              <Button variant="outline">Export Excel</Button>
            </a>
            <Button onClick={() => setShowForm("bug")}>+ Bug</Button>
            <Button variant="secondary" onClick={() => setShowForm("task")}>
              + Task
            </Button>
          </div>
        </div>

        {showForm && (
          <CreateTicketForm
            projectId={id}
            type={showForm}
            phases={project.phases}
            members={members}
            onClose={() => setShowForm(null)}
            onCreated={() => {
              setShowForm(null);
              load();
            }}
          />
        )}

        {/* If no phases yet, offer standard phase creation */}
        {project.phases.length === 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <div>
              <p className="text-sm font-medium">Project belum memiliki fase alur kerja</p>
              <p className="text-xs text-muted-foreground">
                Buat 4 fase standar (Planning, In Progress, Testing, Done) untuk mengelompokkan task & bug.
              </p>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                disabled={creatingDefaultPhases}
                onClick={createDefaultPhases}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{creatingDefaultPhases ? "Membuat fase..." : "Buat Fase Standar"}</span>
              </Button>
            )}
          </div>
        )}

        {/* Board columns view */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Phase Columns */}
          {project.phases.map((phase) => {
            const phaseTickets = tickets.filter((t) => t.phaseId === phase.id);

            return (
              <div
                key={phase.id}
                className="w-72 shrink-0 rounded-xl border bg-muted/40 p-3 flex flex-col max-h-[calc(100vh-14rem)]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color }} />
                  <h3 className="font-medium text-sm">{phase.name}</h3>
                  <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {phaseTickets.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                  {phaseTickets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                      Belum ada tiket
                    </div>
                  ) : (
                    phaseTickets.map((t) => (
                      <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Unphased / General Column (always visible if no phases, or when unphased tickets exist) */}
          {(project.phases.length === 0 || unphasedTickets.length > 0) && (
            <div className="w-72 shrink-0 rounded-xl border border-dashed bg-muted/20 p-3 flex flex-col max-h-[calc(100vh-14rem)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                <h3 className="font-medium text-sm">Tanpa Fase / General</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {unphasedTickets.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {unphasedTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                    Semua tiket sudah memiliki fase
                  </div>
                ) : (
                  unphasedTickets.map((t) => (
                    <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Members Modal */}
      <MembersModal
        projectId={id}
        currentUserRole={currentUserRole}
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        onMembersUpdated={load}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        projectId={id}
        ticket={selectedTicket}
        phases={project.phases}
        members={members}
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        onUpdated={load}
        onDeleted={load}
      />
    </>
  );
}

function TicketCard({ ticket, onClick }: { ticket: TicketWithMeta; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-background p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <TypeBadge type={ticket.type} />
        <PriorityBadge priority={ticket.priority} />
        {ticket.type === "bug" && ticket.severity && <SeverityBadge severity={ticket.severity} />}
        {ticket.status !== "new" && ticket.status !== "todo" && (
          <Badge className="capitalize text-[10px]">{(ticket.status ?? "").replace("_", " ")}</Badge>
        )}
      </div>

      <p className="mt-2 text-xs font-medium text-foreground line-clamp-2">{ticket.headline}</p>

      {ticket.assigneeName && (
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar name={ticket.assigneeName} size="sm" />
          <p className="text-[11px] text-muted-foreground truncate">{ticket.assigneeName}</p>
        </div>
      )}
    </div>
  );
}

function CreateTicketForm(props: {
  projectId: string;
  type: "task" | "bug";
  phases: Phase[];
  members: ProjectMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState(props.phases[0]?.id ?? "");
  const [priority, setPriority] = useState<string>("medium");
  const [severity, setSeverity] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Keep phaseId synced when phases are loaded
  useEffect(() => {
    if (!phaseId && props.phases.length > 0) {
      setPhaseId(props.phases[0].id);
    }
  }, [props.phases, phaseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${props.projectId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: props.type,
        headline,
        description: description || null,
        phaseId: phaseId || null,
        priority,
        severity: props.type === "bug" ? (severity || undefined) : undefined,
        assigneeId: assigneeId || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.form?.[0] ?? j?.error ?? "Gagal menyimpan tiket");
      setSaving(false);
      return;
    }
    props.onCreated();
  }

  const fieldClass =
    "h-9 rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="mb-6 rounded-xl border bg-background p-4 shadow-soft">
      <h2 className="mb-3 font-medium text-sm">Buat {props.type === "bug" ? "Bug" : "Task"} baru</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Judul tiket..."
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className={fieldClass}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={`capitalize ${fieldClass}`}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              Priority: {p}
            </option>
          ))}
        </select>
        {props.phases.length > 0 ? (
          <select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Tanpa Fase</option>
            {props.phases.map((p) => (
              <option key={p.id} value={p.id}>
                Fase: {p.name}
              </option>
            ))}
          </select>
        ) : (
          <select disabled className={fieldClass}>
            <option value="">Tanpa Fase (Belum ada fase)</option>
          </select>
        )}
        {props.type === "bug" && (
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={`capitalize ${fieldClass}`}
          >
            <option value="">Pilih Severity...</option>
            {["minor", "major", "blocker", "crash"].map((s) => (
              <option key={s} value={s}>
                Severity: {s}
              </option>
            ))}
          </select>
        )}
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className={`${fieldClass} ${props.type === "bug" ? "" : "sm:col-span-2"}`}
        >
          <option value="">Belum Ditugaskan (Tanpa Assignee)</option>
          {props.members.map((m) => (
            <option key={m.userId} value={m.userId}>
              Assignee: {m.name} ({m.email})
            </option>
          ))}
        </select>
        <textarea
          placeholder="Deskripsi / langkah reproduksi (opsional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary sm:col-span-2"
        />
        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" size="sm" onClick={props.onClose}>
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
