/**
 * useNotifications — WebSocket client hook
 *
 * - Kết nối ws(s)://host/api/v1/ws/notifications?token=JWT
 * - Multi-tab: mỗi tab giữ 1 kết nối riêng, cùng nhận thông báo
 * - Auto-reconnect sau 3s khi mất kết nối
 * - Ping/pong keep-alive mỗi 30s
 */

import { useEffect, useRef, useCallback } from "react";

export interface WsNotification {
  type:
    | "document_ready"
    | "document_failed"
    | "system"
    | "connected";
  title?: string;
  message?: string;
  document_id?: string;
  [key: string]: unknown;
}

interface UseNotificationsOptions {
  token: string | null;
  onNotification: (n: WsNotification) => void;
}

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? window.location.protocol === "https:"
      ? `wss://${window.location.host}`
      : `ws://${window.location.hostname}:8081`
    : "ws://localhost:8081");

export function useNotifications({ token, onNotification }: UseNotificationsOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUnmountedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || isUnmountedRef.current) return;
    cleanup();

    const url = `${WS_BASE}/api/v1/ws/notifications?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Notifications connected");
      // Keep-alive ping every 30s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30_000);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        const notification = JSON.parse(event.data) as WsNotification;
        if (notification.type !== "connected") {
          onNotification(notification);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (!isUnmountedRef.current) {
        console.log("[WS] Disconnected — reconnecting in 3s...");
        reconnectTimerRef.current = setTimeout(connect, 3_000);
      }
    };
  }, [token, onNotification, cleanup]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [connect, cleanup]);
}
