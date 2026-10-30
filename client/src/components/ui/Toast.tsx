import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id?: number;
  title: string;
  description?: string;
  tone?: ToastTone;
}

export const useToast = (duration = 4200) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: ToastMessage | string, maybeTone?: ToastTone) => {
    if (typeof message === 'string') {
      setToast({ title: message, tone: maybeTone || 'info' });
      return;
    }

    setToast({ ...message, tone: message.tone || 'info' });
  };

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(timeout);
  }, [toast, duration]);

  return {
    toast,
    showToast,
    dismissToast: () => setToast(null),
  };
};

export const ToastViewport: React.FC<{ toast: ToastMessage | null; onDismiss?: () => void }> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const toneStyles = useMemo(() => ({
    success: {
      bg: '#ECFDF5',
      accent: '#10B981',
      border: '#A7F3D0',
      icon: CheckCircle2,
    },
    error: {
      bg: '#FEF2F2',
      accent: '#EF4444',
      border: '#FECACA',
      icon: XCircle,
    },
    warning: {
      bg: '#FFFBEB',
      accent: '#F59E0B',
      border: '#FDE68A',
      icon: AlertCircle,
    },
    info: {
      bg: '#EFF6FF',
      accent: '#3B82F6',
      border: '#BFDBFE',
      icon: Info,
    },
  }[toast.tone || 'info']), [toast.tone]);

  const Icon = toneStyles.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1100,
        width: 'min(420px, calc(100vw - 24px))',
        backgroundColor: toneStyles.bg,
        border: `1px solid ${toneStyles.border}`,
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={18} color={toneStyles.accent} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: 'var(--navy-950)', fontSize: '0.92rem' }}>{toast.title}</div>
        {toast.description && (
          <div style={{ marginTop: 4, color: 'var(--slate-700)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {toast.description}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--slate-500)',
            cursor: 'pointer',
            padding: 4,
            marginLeft: 8,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
