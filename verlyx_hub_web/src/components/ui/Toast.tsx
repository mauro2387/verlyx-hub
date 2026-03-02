'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { create } from 'zustand';

// ==================== Toast Store ====================
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'pipeline';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  actions?: { label: string; onClick: () => void }[];
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
}));

// ==================== Toast Helper Functions ====================
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message, duration: 4000 }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message, duration: 5000 }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message, duration: 4000 }),
  pipeline: (title: string, message?: string, actions?: ToastItem['actions']) =>
    useToastStore.getState().addToast({ type: 'pipeline', title, message, duration: 8000, actions }),
};

// ==================== Toast Icons ====================
const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  pipeline: '⚡',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'bg-emerald-500 text-white',
    text: 'text-emerald-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'bg-red-500 text-white',
    text: 'text-red-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'bg-blue-500 text-white',
    text: 'text-blue-800',
  },
  pipeline: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'bg-indigo-500 text-white',
    text: 'text-indigo-800',
  },
};

// ==================== Individual Toast Component ====================
function ToastItemComponent({ item }: { item: ToastItem }) {
  const { removeToast } = useToastStore();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (item.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => removeToast(item.id), 300);
      }, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.id, item.duration, removeToast]);

  const color = colors[item.type];

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        ${color.bg} ${color.border}
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      style={{ minWidth: '320px', maxWidth: '420px' }}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${color.icon}`}>
        {icons[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${color.text}`}>{item.title}</p>
        {item.message && (
          <p className={`text-xs mt-0.5 ${color.text} opacity-75`}>{item.message}</p>
        )}
        {item.actions && item.actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {item.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`text-xs font-medium px-2 py-1 rounded-md ${color.text} hover:bg-white/50 transition-colors`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => removeToast(item.id), 300);
        }}
        className={`flex-shrink-0 ${color.text} opacity-50 hover:opacity-100 transition-opacity`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ==================== Toast Container ====================
export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((item) => (
        <ToastItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
