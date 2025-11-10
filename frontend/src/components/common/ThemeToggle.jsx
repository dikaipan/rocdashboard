/**
 * Theme Toggle Component
 * Button to switch between dark and light themes
 */
import React from 'react';
import { Sun, Moon } from 'react-feather';
import { useTheme } from '../../contexts/ThemeContext';
import { BUTTON_STYLES, cn } from '../../constants/styles';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      role="button"
      tabIndex="0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
    >
      {isDark ? (
        <Sun size={16} className="text-yellow-400" />
      ) : (
        <Moon size={16} className="text-gray-600" />
      )}
    </div>
  );
}

