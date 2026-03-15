import { createContext, useContext, useState, useCallback } from 'react';

// ==========================================
// ThemeContext — dark / light mode
//
// Stored in localStorage under 'amirnet_theme'.
// Defaults to dark (the original app style).
// ==========================================

const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('amirnet_theme') !== 'light'
  );

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('amirnet_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
