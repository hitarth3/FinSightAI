import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (type: ToastType, title: string, description?: string, duration = 4000) => {
    const id = `toast_${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, title, description, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (title: string, description?: string) => toast('success', title, description);
  const warning = (title: string, description?: string) => toast('warning', title, description);
  const error = (title: string, description?: string) => toast('error', title, description);

  return (
    <ToastContext.Provider value={{ toast, removeToast, success, warning, error }}>
      {children}

      {/* Floating Toast Area */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "glass-panel p-4 rounded-xl shadow-glass flex gap-3 relative overflow-hidden items-start w-full border-l-4",
                
                item.type === 'success' && "border-l-success shadow-[0_4px_20px_rgba(34,197,94,0.15)]",
                
                item.type === 'warning' && "border-l-yellow-500 shadow-[0_4px_20px_rgba(234,179,8,0.15)]",
                
                item.type === 'error' && "border-l-error shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
                
                item.type === 'info' && "border-l-primary shadow-[0_4px_20px_rgba(0,212,255,0.15)]"
              )}
              style={{
                background: 'var(--toast-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {item.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                {item.type === 'error' && <AlertCircle className="w-5 h-5 text-error" />}
                {item.type === 'info' && <Info className="w-5 h-5 text-primary" />}
              </div>

              {/* Text */}
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(item.id)}
                className="shrink-0 text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] p-0.5 rounded transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};
