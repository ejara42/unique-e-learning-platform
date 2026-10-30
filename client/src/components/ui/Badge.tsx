import React from 'react';

export interface BadgeProps {
  variant?: 'primary' | 'teal' | 'verified' | 'pending' | 'danger' | 'neutral';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  icon,
  className = '',
  style,
}) => {
  const variantClass =
    variant === 'teal' ? 'badge-teal' :
    variant === 'verified' ? 'badge-verified' :
    variant === 'pending' ? 'badge-pending' :
    variant === 'danger' ? 'badge-danger' :
    variant === 'neutral' ? 'badge-neutral' :
    'badge-primary';

  return (
    <span className={`badge ${variantClass} ${className}`.trim()} style={style}>
      {icon}
      <span>{children}</span>
    </span>
  );
};

