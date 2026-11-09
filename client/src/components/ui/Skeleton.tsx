import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  shimmer = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-md bg-slate-200/80 dark:bg-slate-800/80 relative overflow-hidden",
        shimmer && "shimmer-mask",
        className
      )}
      {...props}
    />
  );
};

export const CourseCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-0 overflow-hidden shadow-soft flex flex-col">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-6 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
};
