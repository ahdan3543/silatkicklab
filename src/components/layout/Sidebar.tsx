import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  Award,
  FileBarChart,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Data Atlet', path: '/atlet', icon: Users },
    { label: 'Sesi Analisis', path: '/analisis', icon: Activity },
    { label: 'Hasil Evaluasi', path: '/hasil', icon: Award },
    { label: 'Laporan', path: '/laporan', icon: FileBarChart },
    { label: 'Pengaturan', path: '/pengaturan', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-dark-border flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-dark-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-accent-light shadow-sm">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-dark tracking-tight leading-tight">
            SILAT-KICK
          </h1>
          <p className="text-[10px] text-dark-secondary font-medium tracking-wide uppercase">
            Analisis Biomekanika
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-dark-secondary hover:text-dark hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={isActive ? 'text-accent-light' : 'text-dark-secondary'}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-dark-border m-3 rounded-lg bg-slate-50 text-[11px] text-dark-secondary">
        <p className="font-semibold text-dark">Riset Pasca-Cedera</p>
        <p className="mt-0.5 leading-relaxed">Pencak Silat UPI Sport Science Edition</p>
      </div>
    </aside>
  );
};