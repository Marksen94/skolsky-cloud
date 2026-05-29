'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  // Čítame priamo z DOM-u, ktorý anti-flash skript v layout.js
  // už nastavil PRED hydratáciou → žiadny blik, správna ikona hneď
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'; // SSR fallback
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Záložná synchronizácia pri mountnutí (napr. ak sa localStorage
  // a DOM nejako rozídu — za normálnych okolností nenastane)
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved && saved !== theme) {
      applyTheme(saved);
      setTheme(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
