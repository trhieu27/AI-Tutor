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
const WS_BASE = typeof window !== "undefined"
  ? window.location.protocol === "https:"
    ? `wss://${window.location.host}`
    : `ws://${window.location.host}`
  : "ws://localhost:3000";

// Module-level ref — allows sendWsLogout() to send before close
let _activeWs = null;

/**
 * Send 'logout' message through the active WS connection.
 * Called from AuthService.logout() to signal intentional logout
 * so the server can skip the 30s offline grace period.
 */
export function sendWsLogout() {
  if (_activeWs && _activeWs.readyState === WebSocket.OPEN) {
    _activeWs.send("logout");
  }
}

export function useNotifications({
  token,
  onNotification,
}) {
  const wsRef = useRef(null); // Giữ kết nối WebSocket hiện tại
  const reconnectTimerRef = useRef(null); // Lưu ID bộ hẹn giờ phục vụ tự động kết nối lại (reconnect)
  const pingIntervalRef = useRef(null); // Lưu ID chu kỳ gửi gói tin ping giữ mạng (Keep-Alive)
  const connectTimerRef = useRef(null); // Lưu ID bộ hẹn giờ trì hoãn kết nối ban đầu (StrictMode safe)
  const isUnmountedRef = useRef(false); // Đánh dấu trạng thái component đã unmount hay chưa
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      _activeWs = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
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
    _activeWs = ws;
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
    connectTimerRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) connect();
    }, 50);
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [connect, cleanup]);
}