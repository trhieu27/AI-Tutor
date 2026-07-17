import { useCallback } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useNotifications } from "@/shared/hooks/useNotifications";

const ADMIN_REALTIME_TYPE = "admin_realtime";

export function useAdminRealtime(onEvent) {
  const { accessToken } = useAuth();

  const handleRealtimeMessage = useCallback((message) => {
    if (message?.type !== ADMIN_REALTIME_TYPE) return;
    onEvent?.(message);
  }, [onEvent]);

  useNotifications({
    token: accessToken,
    onNotification: handleRealtimeMessage,
  });
}
