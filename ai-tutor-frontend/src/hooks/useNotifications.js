/**
 * useNotifications — WebSocket client hook
 *
 * - Kết nối ws(s)://host/api/v1/ws/notifications?token=JWT
 * - Multi-tab: mỗi tab giữ 1 kết nối riêng, cùng nhận thông báo
 * - Auto-reconnect sau 3s khi mất kết nối
 * - Ping/pong keep-alive mỗi 30s
 * - React 18 StrictMode safe: delay nhỏ hấp thụ double-invoke
 */

import { useEffect, useRef, useCallback } from "react";
const WS_BASE = import.meta.env.VITE_WS_URL || (typeof window !== "undefined" ? window.location.protocol === "https:" ? `wss://${window.location.host}` : `ws://${window.location.hostname}:8081` : "ws://localhost:8081");
export function useNotifications({
  token,
  onNotification
}) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const connectTimerRef = useRef(null); // StrictMode delay timer
  const isUnmountedRef = useRef(false);
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null; // prevent reconnect on intentional close
      // Only close if not already closed/closing
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  }, []);
  const connect = useCallback(() => {
    if (!token || isUnmountedRef.current) return;
    cleanup();
    const url = `${WS_BASE}/api/v1/ws/notifications?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      if (isUnmountedRef.current) {
        ws.close();
        return;
      }
      console.log("[WS] Notifications connected");
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30_000);
    };
    ws.onmessage = event => {
      if (event.data === "pong") return;
      try {
        const notification = JSON.parse(event.data);
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

    // 50ms delay absorbs React 18 StrictMode double-invoke:
    // StrictMode: mount → cleanup (immediately) → remount
    // The timeout ensures we only connect on the stable mount.
    connectTimerRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) connect();
    }, 50);
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [connect, cleanup]);
}