import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Memuat data sistem...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
      <p className="text-sm font-medium text-dark-secondary">{message}</p>
    </div>
  );
};