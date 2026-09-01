import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Tidak ada data ditemukan',
  description = 'Belum ada data rekaman pada kategori ini.',
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-dark-border rounded-xl bg-slate-50/50">
      <div className="p-3 bg-white rounded-full shadow-subtle border border-dark-border text-dark-secondary mb-3">
        {icon || <FolderOpen size={24} />}
      </div>
      <h4 className="text-sm font-semibold text-dark mb-1">{title}</h4>
      <p className="text-xs text-dark-secondary max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};