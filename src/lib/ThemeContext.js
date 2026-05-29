'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  // Vždy začíname s 'light' — SSR bezpečné.
  // Anti-flash skript v layout.js sa postará o vizuálny stav ešte pred hydratáciou.
  // useEffect potom zosynchronizuje React state s tým čo je reálne v DOM/localStorage.
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Čítame z DOM — anti-flash skript ho už nastavil správne
    // (vrátane systémového prefers-color-scheme pri prvej návšteve)
    const active = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(active);

    // Sledujeme systémovú zmenu témy (napr. OS prepne svetlý/tmavý)
    // — iba ak používateľ nemá vlastnú uloženú voľbu
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (e) => {
      const saved = localStorage.getItem('theme');
      if (!saved) {
        const next = e.matches ? 'dark' : 'light';
        applyTheme(next);
        setTheme(next);
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  function applyTheme(t) {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
