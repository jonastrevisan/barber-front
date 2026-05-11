'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

function applyToDOM(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem('theme', t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initial = saved ?? preferred;
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    applyToDOM(t);
  }

  function toggle() {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyToDOM(next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
