import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
} from 'lucide-react';

// Logo UPI Vektor Ringkas
const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#800000" stroke="#F59E0B" strokeWidth="3" />
    <circle cx="50" cy="50" r="38" fill="#FFFFFF" />
    <path d="M50 16 L58 34 L78 36 L64 50 L68 70 L50 60 L32 70 L36 50 L22 36 L42 34 Z" fill="#800000" />
    <circle cx="50" cy="50" r="13" fill="#F59E0B" />
    <text x="50" y="86" fontSize="9" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">UPI</text>
  </svg>
);

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/atlet', label: 'Data Atlet', icon: Users },
  { path: '/analisis', label: 'Sesi Analisis', icon: Activity },
  { path: '/hasil', label: 'Hasil & Laporan', icon: BarChart3 },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 1. TOP BAR KHUSUS MOBILE (Layar HP) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <UpiLogo className="w-7 h-7" />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-slate-900 leading-tight">SILAT-KICK</span>
            <span className="text-[9px] text-slate-500 font-medium">Monitoring Pasca Cedera</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* 2. BACKDROP OVERLAY UNTUK DRAWER HP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* 3. SIDEBAR DESKTOP + DRAWER MOBILE */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          {/* Header Sidebar */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <UpiLogo className="w-10 h-10 shrink-0" />
            <div>
              <h1 className="text-base font-black tracking-wide text-slate-900">SILAT-KICK</h1>
              <p className="text-[10.5px] font-semibold text-slate-500 leading-tight">Analisis Tendangan Atlet</p>
            </div>
          </div>

          {/* Menu Navigasi Utama */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-rose-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Sederhana */}
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
          <span>Riset Pencak Silat UPI © 2026</span>
        </div>
      </aside>

      {/* 4. BOTTOM BAR KHUSUS MOBILE (Akses Cepat Jempol) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around items-center">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-rose-900 font-bold' : 'text-slate-500'
                }`
              }
            >
              <Icon size={18} />
              <span className="mt-0.5">{item.label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};