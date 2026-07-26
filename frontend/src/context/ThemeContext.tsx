import React, { createContext, useContext, useEffect, useState } from 'react';
import { securityLogger } from '../utils/securityLogger';

export type ThemeMode = 'dark-fintech' | 'light-professional';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('finsight_theme');
    return (saved as ThemeMode) || 'dark-fintech';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both potential theme class overrides
    root.classList.remove('dark-fintech', 'light-professional');
    
    // Set active theme as class on documentElement for styling overrides
    if (theme === 'light-professional') {
      root.classList.add('light-professional');
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('dark-fintech');
      root.style.colorScheme = 'dark';
    }
    
    localStorage.setItem('finsight_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    securityLogger.log('THEME_CHANGE', `Theme mode changed to ${newTheme}`);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark-fintech' ? 'light-professional' : 'dark-fintech';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
