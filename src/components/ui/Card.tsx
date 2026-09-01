import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  headerAction,
  className = '',
}) => {
  return (
    <div className={`bg-surface-card rounded-xl border border-dark-border p-6 shadow-subtle ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-border/60">
          <div>
            {title && <h3 className="text-base font-semibold text-dark">{title}</h3>}
            {subtitle && <p className="text-xs text-dark-secondary mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};