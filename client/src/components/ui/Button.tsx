import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'teal' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const effectiveLeftIcon = leftIcon || icon;
  const variantClass = 
    variant === 'primary' ? 'btn-primary' :
    variant === 'secondary' ? 'btn-secondary' :
    variant === 'teal' ? 'btn-teal' :
    variant === 'danger' ? 'btn-danger' :
    'btn-ghost';

  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      style={style}
      {...props}
    >
      {isLoading ? (
        <span 
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderTopColor: '#FFFFFF',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }} 
        />
      ) : effectiveLeftIcon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {effectiveLeftIcon}
        </span>
      ) : null}
      
      {children && <span>{children}</span>}
      
      {!isLoading && rightIcon && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};
