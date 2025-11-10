/**
 * Custom Alert Component
 * Beautiful alert dialog to replace native alert()
 * Supports dark and light themes
 */
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'react-feather';
import { useTheme } from '../../contexts/ThemeContext';

const CustomAlert = ({ 
  isOpen, 
  onClose, 
  type = 'info', // 'success', 'error', 'warning', 'info'
  title,
  message,
  duration = 3000 // Auto close duration in ms (0 = no auto close)
}) => {
  const { isDark } = useTheme();

  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  // Theme-aware styling with improved contrast
  const themeStyles = {
    dark: {
      overlay: 'bg-black/70',
      cardBg: 'bg-slate-800',
      text: 'text-slate-100',
      textMuted: 'text-slate-300',
      closeButton: 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/70',
      cancelButton: 'bg-slate-700 hover:bg-slate-600 text-slate-100'
    },
    light: {
      overlay: 'bg-black/50',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      textMuted: 'text-gray-700',
      closeButton: 'text-gray-500 hover:text-gray-800 hover:bg-gray-200',
      cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-900'
    }
  };

  const theme = isDark ? themeStyles.dark : themeStyles.light;

  const config = {
    success: {
      icon: CheckCircle,
      iconColor: isDark ? 'text-green-400' : 'text-green-600',
      iconBg: isDark ? 'bg-green-500/20' : 'bg-green-100',
      borderColor: isDark ? 'border-green-500/50' : 'border-green-300',
      bgGradient: isDark ? 'from-green-500/10 to-emerald-500/5' : 'from-green-50 to-emerald-50',
      titleColor: isDark ? 'text-green-300' : 'text-green-700',
      messageColor: isDark ? 'text-slate-200' : 'text-gray-800',
      buttonColor: 'bg-green-600 hover:bg-green-700 text-white'
    },
    error: {
      icon: AlertCircle,
      iconColor: isDark ? 'text-red-400' : 'text-red-600',
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      borderColor: isDark ? 'border-red-500/50' : 'border-red-300',
      bgGradient: isDark ? 'from-red-500/10 to-rose-500/5' : 'from-red-50 to-rose-50',
      titleColor: isDark ? 'text-red-300' : 'text-red-700',
      messageColor: isDark ? 'text-slate-200' : 'text-gray-800',
      buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
      iconBg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
      borderColor: isDark ? 'border-yellow-500/50' : 'border-yellow-300',
      bgGradient: isDark ? 'from-yellow-500/10 to-amber-500/5' : 'from-yellow-50 to-amber-50',
      titleColor: isDark ? 'text-yellow-300' : 'text-yellow-700',
      messageColor: isDark ? 'text-slate-200' : 'text-gray-800',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      icon: Info,
      iconColor: isDark ? 'text-blue-400' : 'text-blue-600',
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      borderColor: isDark ? 'border-blue-500/50' : 'border-blue-300',
      bgGradient: isDark ? 'from-blue-500/10 to-cyan-500/5' : 'from-blue-50 to-cyan-50',
      titleColor: isDark ? 'text-blue-300' : 'text-blue-700',
      messageColor: isDark ? 'text-slate-200' : 'text-gray-800',
      buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const style = config[type] || config.info;
  const Icon = style.icon;

  return (
    <div className={`fixed inset-0 ${theme.overlay} backdrop-blur-sm flex items-center justify-center z-[9999] p-4`}>
      <div className={`${theme.cardBg} bg-gradient-to-br ${style.bgGradient} rounded-2xl border ${style.borderColor} shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in duration-200`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={style.iconColor} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-lg font-bold ${style.titleColor} mb-2`}>
                  {title}
                </h3>
              )}
              <p className={`text-sm ${style.messageColor} whitespace-pre-line`}>
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`${theme.closeButton} p-1 rounded-lg transition-all flex-shrink-0`}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full px-4 py-2.5 rounded-xl font-medium transition-all ${style.buttonColor} shadow-lg hover:shadow-xl hover:scale-[1.02]`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;

