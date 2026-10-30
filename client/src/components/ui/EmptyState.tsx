import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  const effectiveActionText = actionText || actionLabel;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <Inbox size={32} color="var(--primary)" />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {effectiveActionText && onAction && (
        <Button onClick={onAction} leftIcon={actionIcon}>
          {effectiveActionText}
        </Button>
      )}
    </div>
  );
};
