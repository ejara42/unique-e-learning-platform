import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'elevated' | 'interactive' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  as: Component = 'div',
  className = '',
  onClick,
  onKeyDown,
  tabIndex,
  ...props
}) => {
  const isInteractive = variant === 'interactive' || !!onClick;

  const variantStyles = {
    default: 'bg-white border border-slate-200 shadow-xs',
    flat: 'bg-slate-50 border border-slate-200',
    elevated: 'bg-white border border-slate-200 shadow-md',
    interactive: 'bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 cursor-pointer',
    bordered: 'bg-transparent border border-slate-300',
  }[variant];

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    } else if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      (onClick as any)(e);
    }
  };

  return (
    <Component
      className={`rounded-lg transition-colors ${variantStyles} ${paddingStyles} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
      tabIndex={isInteractive && tabIndex === undefined ? 0 : tabIndex}
      role={isInteractive && !props.role ? 'button' : props.role}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex flex-col gap-1.5 pb-4 mb-4 border-b border-slate-100 ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-bold text-slate-900 tracking-tight ${className}`.trim()} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-500 leading-relaxed ${className}`.trim()} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`text-sm text-slate-700 ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between pt-4 mt-4 border-t border-slate-100 gap-3 ${className}`.trim()} {...props}>
    {children}
  </div>
);
