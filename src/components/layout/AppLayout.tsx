import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-bg text-dark flex flex-col md:flex-row w-full overflow-x-hidden">
      {/* Sidebar (Di HP otomatis jadi Top Bar + Drawer + Bottom Nav, di Desktop jadi Sidebar kiri) */}
      <Sidebar />

      {/* Kontainer Halaman Utama */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Navbar desktop hanya ditampilkan di layar tablet/PC (md ke atas) */}
        <div className="hidden md:block">
          <Navbar />
        </div>

        {/* Padding responsif: di HP p-3 sm:p-4, di desktop p-6 lg:p-8 */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};