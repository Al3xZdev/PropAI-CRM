import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Always dark mode - theme toggle removed
  const theme = 'dark';
  
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
  }, []);

  // toggleTheme is a no-op now
  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: true, isLight: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get color classes based on theme - always returns dark colors
export function useThemeColors() {
  // Always dark colors
  return {
    background: '#000000',
    card: '#17181c',
    popover: '#000000',
    muted: '#181818',
    border: '#242628',
    input: '#22303c',
    foreground: '#e7e9ea',
    cardForeground: '#d9d9d9',
    mutedForeground: '#72767a',
  };
}