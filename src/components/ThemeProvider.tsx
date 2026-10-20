"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  ThemeId,
} from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId, opts?: { persist?: boolean }) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: async () => {},
});

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    let initial: ThemeId = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeId(stored)) initial = stored;
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    applyTheme(initial);

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const remote = data?.user?.theme;
        if (isThemeId(remote)) {
          setThemeState(remote);
          applyTheme(remote);
        }
      })
      .catch(() => {
        /* not signed in */
      });
  }, []);

  const setTheme = useCallback(async (next: ThemeId, opts?: { persist?: boolean }) => {
    setThemeState(next);
    applyTheme(next);
    if (opts?.persist === false) return;
    try {
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
    } catch {
      /* offline / unlock screen */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
