import React from 'react';
import { Bell, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-dark-border px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-sm font-semibold text-dark">
          Sistem Monitoring & Evaluasi Tendangan Depan
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full text-dark-secondary hover:bg-slate-100 hover:text-dark transition-colors relative">
          <Bell size={18} />
          <span className="w-2 h-2 rounded-full bg-accent absolute top-1.5 right-1.5" />
        </button>

        <div className="h-6 w-px bg-dark-border" />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
            <User size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-dark">Tim Penilai Riset</p>
            <p className="text-[10px] text-dark-secondary">Evaluator / Peneliti</p>
          </div>
        </div>
      </div>
    </header>
  );
};