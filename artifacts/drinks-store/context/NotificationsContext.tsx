import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "./AuthContext";

export type NotificationKind = "order" | "points" | "tier" | "offer" | "info";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (
    n: Pick<AppNotification, "kind" | "title" | "body">,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const MAX_KEPT = 100;
const keyFor = (userId: string | null) =>
  `drinks_store_notifications_v1_${userId ?? "guest"}`;

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Only persist once the active key has finished hydrating, so switching users
  // never clobbers the incoming account's inbox with the previous one's state.
  const hydratedKey = useRef<string | null>(null);
  // Notifications added during the (async) hydration window are buffered here so
  // they survive the `setNotifications(parsed)` that completes hydration.
  const pendingAdds = useRef<AppNotification[]>([]);

  useEffect(() => {
    const key = keyFor(userId);
    let active = true;
    hydratedKey.current = null;
    pendingAdds.current = [];
    AsyncStorage.getItem(key).then((data) => {
      if (!active) return;
      let parsed: AppNotification[] = [];
      if (data) {
        try {
          parsed = JSON.parse(data) as AppNotification[];
        } catch {
          parsed = [];
        }
      }
      const merged = [...pendingAdds.current, ...parsed].slice(0, MAX_KEPT);
      pendingAdds.current = [];
      setNotifications(merged);
      hydratedKey.current = key;
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const key = keyFor(userId);
    if (hydratedKey.current !== key) return;
    AsyncStorage.setItem(key, JSON.stringify(notifications));
  }, [notifications, userId]);

  const addNotification = useCallback<
    NotificationsContextType["addNotification"]
  >((n) => {
    const item: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      read: false,
    };
    // If hydration for the active key is still in flight, also buffer the item so
    // the resolving load merges it in rather than overwriting it.
    if (hydratedKey.current === null) {
      pendingAdds.current = [item, ...pendingAdds.current];
    }
    setNotifications((prev) => [item, ...prev].slice(0, MAX_KEPT));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.reduce((c, n) => (n.read ? c : c + 1), 0);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  return ctx;
}
