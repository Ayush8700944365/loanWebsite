import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        let borderClass = 'border-emerald-200 bg-white text-brand-dark';

        if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-500" />;
          borderClass = 'border-rose-200 bg-white text-brand-dark';
        } else if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-brand-royal" />;
          borderClass = 'border-blue-200 bg-white text-brand-dark';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-premium backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${borderClass}`}
            style={{ minWidth: '280px', maxWidth: '420px' }}
          >
            <div className="flex-shrink-0">{icon}</div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

