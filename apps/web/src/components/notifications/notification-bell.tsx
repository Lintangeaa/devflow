"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  ticketId: string;
  projectId: string;
  message: string;
  read: boolean;
  createdAt: string;
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
  });
}

export function NotificationBell() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {
      // ignore network errors
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !isAuthenticated) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const defaultWsHost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? `${window.location.hostname}:4000`
        : host;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${defaultWsHost}/ws/notifications`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        fetchNotifications();
      };

      ws.onmessage = () => {
        fetchNotifications();
      };

      ws.onerror = () => {
        // Handled silently
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        // Don't auto-reconnect if server rejected with 401 or user logged out
        if (isMountedRef.current && isAuthenticated && event.code !== 1008) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
    } catch {
      if (isMountedRef.current && isAuthenticated) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    }
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    isMountedRef.current = true;
    if (isAuthenticated) {
      fetchNotifications();
      connectWebSocket();
    }

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, fetchNotifications, connectWebSocket]);

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("Semua notifikasi ditandai telah dibaca");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClickNotification(n: NotificationItem) {
    if (!n.read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => null);
    }

    setOpen(false);
    // Navigate to the project page
    router.push(`/projects/${n.projectId}`);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground animate-in fade-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 sm:w-96 rounded-2xl border bg-popover p-0 text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Tandai dibaca</span>
              </Button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 stroke-1 text-muted-foreground/50 mb-2" />
                <p className="text-xs font-medium">Belum ada notifikasi</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Aktivitas tiket baru akan muncul di sini
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`group relative flex cursor-pointer items-start gap-3 p-3.5 text-xs transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    {!n.read ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`leading-relaxed ${
                        !n.read ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {n.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
