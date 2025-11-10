/**
 * Custom Confirm Dialog Component
 * Beautiful confirmation dialog to replace native confirm()
 * Supports dark and light themes
 */
import React from 'react';
import { AlertTriangle, X, Check, XCircle } from 'react-feather';
import { useTheme } from '../../contexts/ThemeContext';

const CustomConfirm = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  type = 'warning', // 'warning', 'danger', 'info'
  confirmButtonColor = 'bg-blue-600 hover:bg-blue-700'
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  // Theme-aware styling with improved contrast
  const themeStyles = {
    dark: {
      overlay: 'bg-black/70',
      cardBg: 'bg-slate-800',
      text: 'text-slate-100',
      textMuted: 'text-slate-200',
      closeButton: 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/70',
      cancelButton: 'bg-slate-700 hover:bg-slate-600 text-slate-100'
    },
    light: {
      overlay: 'bg-black/50',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      textMuted: 'text-gray-800',
      closeButton: 'text-gray-500 hover:text-gray-800 hover:bg-gray-200',
      cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-900'
    }
  };

  const theme = isDark ? themeStyles.dark : themeStyles.light;

  const config = {
    warning: {
      icon: AlertTriangle,
      iconColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
      iconBg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
      borderColor: isDark ? 'border-yellow-500/50' : 'border-yellow-300',
      bgGradient: isDark ? 'from-yellow-500/10 to-amber-500/5' : 'from-yellow-50 to-amber-50',
      confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      icon: XCircle,
      iconColor: isDark ? 'text-red-400' : 'text-red-600',
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      borderColor: isDark ? 'border-red-500/50' : 'border-red-300',
      bgGradient: isDark ? 'from-red-500/10 to-rose-500/5' : 'from-red-50 to-rose-50',
      confirmButtonColor: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      icon: AlertTriangle,
      iconColor: isDark ? 'text-blue-400' : 'text-blue-600',
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      borderColor: isDark ? 'border-blue-500/50' : 'border-blue-300',
      bgGradient: isDark ? 'from-blue-500/10 to-cyan-500/5' : 'from-blue-50 to-cyan-50',
      confirmButtonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const style = config[type] || config.warning;
  const Icon = style.icon;
  const finalConfirmColor = type === 'danger' ? style.confirmButtonColor : (type === 'warning' ? style.confirmButtonColor : confirmButtonColor);

  const handleConfirm = async () => {
    if (onConfirm) {
      // Close dialog first, then execute callback
      // This prevents double loading spinner (one in button, one inline)
      onClose();
      await onConfirm();
    }
  };

  return (
    <div className={`fixed inset-0 ${theme.overlay} backdrop-blur-sm flex items-center justify-center z-[9999] p-4`}>
      <div className={`${theme.cardBg} bg-gradient-to-br ${style.bgGradient} rounded-2xl border ${style.borderColor} shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in duration-200`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={style.iconColor} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold ${theme.text} mb-2`}>
                {title}
              </h3>
              <p className={`text-sm ${theme.textMuted} whitespace-pre-line`}>
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
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium ${theme.cancelButton} transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2`}
          >
            <X size={18} />
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 ${finalConfirmColor}`}
          >
            <Check size={18} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirm;

