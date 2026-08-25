"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MembersModal, type ProjectMember } from "@/components/projects/members-modal";
import {
  ProjectContext,
  type ProjectInfo,
  type SessionUser,
} from "@/components/projects/project-context";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);

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

  const loadProjectData = useCallback(async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/members`),
      ]);
      if (pRes.ok) setProject((await pRes.json()) as ProjectInfo);
      if (mRes.ok) setMembers((await mRes.json()) as ProjectMember[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (sessionUser) loadProjectData();
  }, [sessionUser, loadProjectData]);

  const currentUserRole =
    members.find((m) => m.userId === sessionUser?.id)?.role ??
    (project?.ownerId === sessionUser?.id ? "owner" : null);

  const isOwner = currentUserRole === "owner";

  if (authChecking || (loading && !project)) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Memuat project...
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="p-6 text-sm text-muted-foreground">Project tidak ditemukan.</div>
      </AppShell>
    );
  }

  const projectActions = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMembersModal(true)}
        className="h-8 gap-1.5 text-xs font-medium"
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Members</span>
        <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
          {members.length}
        </span>
      </Button>
      <a
        href={`/api/projects/${id}/export`}
        target="_blank"
        rel="noreferrer"
        onClick={() => toast.info("Laporan Excel sedang diunduh...")}
      >
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </a>
    </div>
  );

  return (
    <ProjectContext.Provider
      value={{
        project,
        phases: project.phases ?? [],
        members,
        sessionUser,
        currentUserRole,
        isOwner,
        loading,
        reload: loadProjectData,
      }}
    >
      <AppShell projectName={project.name} actions={projectActions}>
        {/* Project Context Header */}
        <div className="mb-6 flex flex-col gap-1 border-b border-border/40 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-muted-foreground">{project.description}</p>
          )}
        </div>

        {/* Child Pages (Overview, Board, Bugs, Ticket) */}
        <div>{children}</div>

        {/* Members Modal */}
        <MembersModal
          projectId={id}
          currentUserRole={currentUserRole}
          open={showMembersModal}
          onOpenChange={setShowMembersModal}
          onMembersUpdated={loadProjectData}
        />
      </AppShell>
    </ProjectContext.Provider>
  );
}
