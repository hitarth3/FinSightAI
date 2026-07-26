import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { GlassButton } from './ui/GlassButton';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="absolute top-5 right-5 z-40 select-none">
      <GlassButton
        variant="secondary"
        onClick={toggleTheme}
        className="p-3 w-11 h-11 rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
        aria-label={`Switch to ${theme === 'dark-fintech' ? 'Light Professional' : 'Dark FinTech'} Theme`}
        title={`Switch to ${theme === 'dark-fintech' ? 'Light' : 'Dark'} mode`}
      >
        {theme === 'dark-fintech' ? (
          <Sun className="w-5 h-5 text-[var(--primary-color)] animate-pulse" />
        ) : (
          <Moon className="w-5 h-5 text-[var(--primary-color)]" />
        )}
      </GlassButton>
    </div>
  );
};
