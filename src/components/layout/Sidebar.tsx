import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Activity, FileText, Menu, X, ChevronRight } from 'lucide-react';

const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <img src="/upi-logo.png" alt="Logo Universitas Pendidikan Indonesia" className={`${className} object-contain shrink-0`} loading="eager" />
);

const navItems = [
  { path:'/atlet', label:'Data Atlet', short:'Atlet', icon:Users, step:'01' },
  { path:'/analisis', label:'Analisis', short:'Analisis', icon:Activity, step:'02' },
  { path:'/laporan', label:'Laporan', short:'Laporan', icon:FileText, step:'03' },
];

export const Sidebar: React.FC = () => {
  const [isOpen,setIsOpen]=useState(false);
  return <>
    <header className="md:hidden sticky top-0 z-40 h-14 px-4 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2.5"><UpiLogo className="w-8 h-8"/><div><p className="text-[13px] font-extrabold tracking-tight">SILAT MOTION</p><p className="text-[9px] text-slate-500">Performance analysis</p></div></div>
      <button onClick={()=>setIsOpen(!isOpen)} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Buka menu">{isOpen?<X size={19}/>:<Menu size={19}/>}</button>
    </header>
    {isOpen && <div onClick={()=>setIsOpen(false)} className="fixed inset-0 bg-slate-950/35 z-40 md:hidden"/>}
    <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-[238px] bg-[#fbfbfc] border-r border-slate-200/80 flex flex-col transition-transform duration-200 md:translate-x-0 ${isOpen?'translate-x-0':'-translate-x-full'}`}>
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-3 px-1 pb-5 border-b border-slate-200/70">
          <UpiLogo className="w-10 h-10"/>
          <div><p className="text-[14px] font-extrabold tracking-tight text-slate-950">SILAT MOTION</p><p className="text-[9px] text-slate-500">Universitas Pendidikan Indonesia</p></div>
        </div>
        <div className="mt-5 mb-2 px-2"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">Research workflow</p></div>
        <nav className="space-y-1">
          {navItems.map(item=>{const Icon=item.icon; return <NavLink key={item.path} to={item.path} onClick={()=>setIsOpen(false)} className={({isActive})=>`group flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all ${isActive?'bg-[#800000] text-white shadow-[0_6px_16px_rgba(128,0,0,.16)]':'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold ${'bg-white/0'}`}><Icon size={17} strokeWidth={1.9}/></span>
            <span className="flex-1">{item.step}. {item.label}</span><ChevronRight size={14} className="opacity-40"/>
          </NavLink>})}
        </nav>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_14px_rgba(15,23,42,.035)]">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Mode penelitian</p></div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Subjek → video → pengukuran → hasil → laporan.</p>
        </div>
      </div>
      <div className="mt-auto px-4 py-4 border-t border-slate-200/70 text-[9px] text-slate-400">Riset Pencak Silat UPI · 2026</div>
    </aside>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex justify-around safe-area-bottom">
      {navItems.map(item=>{const Icon=item.icon; return <NavLink key={item.path} to={item.path} className={({isActive})=>`flex flex-col items-center py-1 px-5 rounded-xl text-[9px] font-semibold ${isActive?'text-[#800000]':'text-slate-500'}`}><Icon size={17}/><span className="mt-0.5">{item.short}</span></NavLink>})}
    </nav>
  </>;
};
