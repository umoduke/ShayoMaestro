import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

export interface NotificationPrefs {
  orderUpdates: boolean;
  promotions: boolean;
  newArrivals: boolean;
}

interface SettingsContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  notifications: NotificationPrefs;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  orderUpdates: true,
  promotions: true,
  newArrivals: false,
};

const SettingsContext = createContext<SettingsContextType>({
  themeMode: "system",
  setThemeMode: () => {},
  notifications: DEFAULT_NOTIFICATIONS,
  setNotification: () => {},
});

const STORAGE_KEY = "drinks_store_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [notifications, setNotifications] =
    useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const hydrated = useRef(false);
  // Set once the user changes a setting. If hydration from storage resolves
  // AFTER the user has already made a change (cold-start race), we must not let
  // stale stored values clobber the user's choice.
  const userChanged = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data && !userChanged.current) {
          try {
            const parsed = JSON.parse(data);
            if (
              parsed.themeMode === "system" ||
              parsed.themeMode === "light" ||
              parsed.themeMode === "dark"
            ) {
              setThemeModeState(parsed.themeMode);
            }
            if (parsed.notifications) {
              setNotifications({
                ...DEFAULT_NOTIFICATIONS,
                ...parsed.notifications,
              });
            }
          } catch {
            // ignore corrupt data
          }
        }
      })
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  useEffect(() => {
    // Only persist changes the user actually made; never write the transient
    // defaults rendered before hydration completes.
    if (hydrated.current && userChanged.current) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ themeMode, notifications }),
      );
    }
  }, [themeMode, notifications]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    userChanged.current = true;
    setThemeModeState(mode);
  }, []);

  const setNotification = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      userChanged.current = true;
      setNotifications((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <SettingsContext.Provider
      value={{ themeMode, setThemeMode, notifications, setNotification }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
