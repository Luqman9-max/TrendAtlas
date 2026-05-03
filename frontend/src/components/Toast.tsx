'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/15 border-red-500/30 text-red-400',
    info: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  };

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 right-4 z-[60] px-4 py-3 rounded-lg border backdrop-blur-md text-sm font-medium flex items-center gap-2 transition-all duration-300 ${colors[type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span>{icons[type]}</span>
      {message}
    </div>
  );
}

// Simple toast manager hook
let toastCallback: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const ToastElement = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  ) : null;

  return { showToast, ToastElement };
}
