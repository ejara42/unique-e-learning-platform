import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingState: React.FC<{ rows?: number; message?: string }> = ({ rows = 3, message = 'Loading content…' }) => (
  <div style={{ display: 'grid', gap: 16 }}>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        style={{
          display: 'grid',
          gap: 12,
          padding: 18,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ width: '42%', height: 14, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: '74%', height: 16, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: '100%', height: 12, borderRadius: 999 }} />
      </div>
    ))}
    {message && (
      <div style={{ textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.82rem', marginTop: 6 }}>
        {message}
      </div>
    )}
  </div>
);

export const ErrorState: React.FC<{ title?: string; message: string; onRetry?: () => void; retryLabel?: string }> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      backgroundColor: '#FFFFFF',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-xs)',
    }}
  >
    <div style={{ maxWidth: 480, textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          border: '1px solid #FECACA',
        }}
      >
        <AlertTriangle size={24} />
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: 18 }}>{message}</p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry} leftIcon={<RefreshCw size={15} />}>
          {retryLabel}
        </Button>
      )}
    </div>
  </div>
);
