import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'teal' | 'indigo' | 'warning' | 'purple';
  iconBgColor?: string;
  iconColor?: string;
  subtext?: string;
  trendText?: string;
  trendType?: 'positive' | 'warning' | 'neutral';
  borderAccentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  iconBgColor,
  iconColor,
  subtext,
  trendText,
  trendType = 'positive',
  borderAccentColor,
}) => {
  // Map color presets if specified
  const effectiveIconBg = iconBgColor || (
    color === 'teal' ? 'var(--teal-50)' :
      color === 'indigo' ? '#EEF2FF' :
        color === 'warning' ? '#FEF3C7' :
          color === 'purple' ? '#F5F3FF' :
            'var(--primary-light)'
  );

  const effectiveIconColor = iconColor || (
    color === 'teal' ? 'var(--teal-700)' :
      color === 'indigo' ? '#4F46E5' :
        color === 'warning' ? '#D97706' :
          color === 'purple' ? '#7C3AED' :
            'var(--primary)'
  );

  const effectiveBorderAccent = borderAccentColor || (
    color === 'teal' ? 'var(--teal-600)' :
      color === 'indigo' ? '#4F46E5' :
        color === 'warning' ? '#F59E0B' :
          color === 'purple' ? '#8B5CF6' :
            undefined
  );

  const trendColor =
    trendType === 'warning' ? '#D97706' :
      trendType === 'neutral' ? 'var(--text-muted)' :
        'var(--teal-600)';

  return (
    <div
      className="stat-card"
      style={{
        borderLeft: effectiveBorderAccent ? `4px solid ${effectiveBorderAccent}` : undefined,
      }}
    >
      <div
        className="stat-icon-wrapper"
        style={{
          backgroundColor: effectiveIconBg,
          color: effectiveIconColor,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--navy-900)', lineHeight: 1.2, marginTop: 2 }}>
          {value}
        </div>
        {(subtext || trendText) && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {trendText && (
              <span style={{ color: trendColor, fontWeight: 700 }}>{trendText}</span>
            )}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
