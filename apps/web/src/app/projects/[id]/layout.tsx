"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Header } from "@/components/layout/header";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { Button } from "@/components/ui/button";
import { MembersModal, type ProjectMember } from "@/components/projects/members-modal";
import type { Phase } from "@/components/tickets/ticket-detail-modal";

export type ProjectInfo = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  status?: string;
  phases: Phase[];
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

interface ProjectContextType {
  project: ProjectInfo | null;
  phases: Phase[];
  members: ProjectMember[];
  sessionUser: SessionUser | null;
  currentUserRole: string | null;
  isOwner: boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectLayout");
  }
  return ctx;
}

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
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Memuat project...
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
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <ProjectSidebar projectId={id} />

          <div className="flex-1 overflow-y-auto">
            {/* Top Project Header Chrome */}
            <div className="border-b bg-background/95 backdrop-blur-xs px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">
                    ← Kembali ke Dashboard
                  </Link>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>Export Excel</span>
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Page content */}
            <main className="p-6">{children}</main>
          </div>
        </div>

        {/* Members Modal */}
        <MembersModal
          projectId={id}
          currentUserRole={currentUserRole}
          open={showMembersModal}
          onOpenChange={setShowMembersModal}
          onMembersUpdated={loadProjectData}
        />
      </div>
    </ProjectContext.Provider>
  );
}
