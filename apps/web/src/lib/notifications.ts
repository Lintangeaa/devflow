import { db, schema } from "@devflow/db";
import { broadcastToUser } from "./ws-hub";

export interface CreateNotificationParams {
  userId: string;
  type: "assigned" | "status_changed";
  ticketId: string;
  projectId: string;
  message: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const [record] = await db
      .insert(schema.notifications)
      .values({
        userId: params.userId,
        type: params.type,
        ticketId: params.ticketId,
        projectId: params.projectId,
        message: params.message,
        read: false,
      })
      .returning();

    if (record) {
      broadcastToUser(params.userId, {
        type: "notification",
        data: record,
      });
    }

    return record;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

export function formatStatusLabel(status: string): string {
  if (status === "ready_for_qa") return "Ready for QA";
  if (status === "in_progress") return "In Progress";
  return status.replace(/_/g, " ");
}
