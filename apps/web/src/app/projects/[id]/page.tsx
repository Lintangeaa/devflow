"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Badge, PriorityBadge, TypeBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITIES, type Ticket } from "@devflow/shared";

type Phase = { id: string; name: string; order: number; color: string };
type ProjectInfo = { id: string; name: string; slug: string; description?: string | null };
type TicketRow = Ticket & { id: string; phaseName?: string; assigneeName?: string | null };

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [project, setProject] = useState<ProjectInfo & { phases: Phase[] } | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<"task" | "bug" | null>(null);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  async function load() {
    const [pRes, tRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/tickets`),
    ]);
    setProject((await pRes.json()) as typeof project);
    setTickets((await tRes.json()) as TicketRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (session) load();
  }, [session]);

  if (isPending || loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">Memuat...</main>
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

  return (
    <>
      <Header />
      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
            {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            <a href={`/api/projects/${id}/export`} target="_blank">
              <Button variant="outline">Export Excel</Button>
            </a>
            <Button onClick={() => setShowForm("bug")}>+ Bug</Button>
            <Button variant="secondary" onClick={() => setShowForm("task")}>+ Task</Button>
          </div>
        </div>

        {showForm && (
          <CreateTicketForm
            projectId={id}
            type={showForm}
            phases={project.phases}
            onClose={() => setShowForm(null)}
            onCreated={() => {
              setShowForm(null);
              load();
            }}
          />
        )}

        <div className="flex gap-4 overflow-x-auto pb-4">
          {project.phases.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Project belum punya fase. Buat fase (Planning, Development, QA, ...) lewat tombol kelola fase.
            </div>
          )}
          {project.phases.map((phase) => (
            <div key={phase.id} className="w-72 shrink-0 rounded-xl border bg-muted/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color }} />
                <h3 className="font-medium">{phase.name}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {tickets.filter((t) => t.phaseId === phase.id).length}
                </span>
              </div>
              <div className="space-y-2">
                {tickets
                  .filter((t) => t.phaseId === phase.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border bg-background p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={t.priority} />
                        <TypeBadge type={t.type} />
                        {t.status !== "new" && t.status !== "todo" && (
                          <Badge className="capitalize">{(t.status ?? "").replace("_", " ")}</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium">{t.headline}</p>
                      {t.assigneeName && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Avatar name={t.assigneeName} size="sm" />
                          <p className="text-xs text-muted-foreground">{t.assigneeName}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function CreateTicketForm(props: {
  projectId: string;
  type: "task" | "bug";
  phases: Phase[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState(props.phases[0]?.id ?? "");
  const [priority, setPriority] = useState<string>("medium");
  const [severity, setSeverity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.form?.[0] ?? "Gagal menyimpan");
      setSaving(false);
      return;
    }
    props.onCreated();
  }

  const fieldClass =
    "h-9 rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="mb-6 rounded-xl border bg-background p-4 shadow-soft">
      <h2 className="mb-3 font-medium">Buat {props.type === "bug" ? "Bug" : "Task"} baru</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Judul"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className={fieldClass}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={fieldClass}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {props.phases.length > 0 && (
          <select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Tanpa fase</option>
            {props.phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {props.type === "bug" && (
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={fieldClass}
          >
            <option value="">Severity...</option>
            {["minor", "major", "blocker", "crash"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <textarea
          placeholder="Deskripsi / langkah reproduksi (opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary sm:col-span-2"
        />
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={props.onClose}>Batal</Button>
          <Button type="submit" disabled={saving}>{saving ? "Menunggu..." : "Simpan"}</Button>
        </div>
      </form>
    </div>
  );
}