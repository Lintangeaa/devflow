"use client";

import { useParams } from "next/navigation";
import { useProject } from "../layout";
import { BugKanban } from "@/components/tickets/bug-kanban";

export default function ProjectBugsPage() {
  const { id } = useParams<{ id: string }>();
  const { phases, members } = useProject();

  return (
    <BugKanban
      projectId={id}
      environmentFilter="non_production"
      title="Bugs (Pre-Production)"
      description="Pelaporan dan penanganan bug pra-rilis / QA sebelum masuk ke lingkungan produksi."
      createButtonLabel="Buat Bug"
      phases={phases}
      members={members}
    />
  );
}
