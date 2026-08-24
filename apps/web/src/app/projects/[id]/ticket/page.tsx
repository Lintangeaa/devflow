"use client";

import { useParams } from "next/navigation";
import { useProject } from "@/components/projects/project-context";
import { BugKanban } from "@/components/tickets/bug-kanban";

export default function ProjectTicketsProductionPage() {
  const { id } = useParams<{ id: string }>();
  const { phases, members } = useProject();

  return (
    <BugKanban
      projectId={id}
      environmentFilter="production"
      title="Ticket (Production Incident)"
      description="Insiden dan bug live yang dilaporkan langsung dari lingkungan produksi."
      createButtonLabel="Buat Ticket"
      phases={phases}
      members={members}
    />
  );
}
