import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-bg text-dark flex flex-col md:flex-row w-full overflow-x-hidden">
      {/* Sidebar (Di HP otomatis jadi Top Bar + Drawer + Bottom Nav, di Desktop jadi Sidebar kiri) */}
      <Sidebar />

      {/* Kontainer Halaman Utama */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header atas dihilangkan agar area dashboard lebih luas dan fokus ke konten. */}
        {/* Padding responsif: di HP p-3 sm:p-4, di desktop p-4 md:p-6 w-full penuh tanpa max-w-7xl */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full overflow-y-auto">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};