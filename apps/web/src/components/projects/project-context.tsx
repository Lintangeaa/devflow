"use client";

import { createContext, useContext } from "react";
import type { Phase } from "@/components/tickets/ticket-detail-modal";
import type { ProjectMember } from "@/components/projects/members-modal";

export type ProjectInfo = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  status?: string;
  phases: Phase[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export interface ProjectContextType {
  project: ProjectInfo | null;
  phases: Phase[];
  members: ProjectMember[];
  sessionUser: SessionUser | null;
  currentUserRole: string | null;
  isOwner: boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectLayout");
  }
  return ctx;
}
