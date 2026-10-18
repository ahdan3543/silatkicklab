import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Activity, FileText, Menu, X, Settings, Home, FlaskConical } from 'lucide-react';

const navItems = [
  { path:'/atlet', label:'Data Atlet', icon:Users },
  { path:'/analisis', label:'Analisis', icon:Activity },
  { path:'/laporan', label:'Laporan', icon:FileText },
];

const Brand = ({ mobile=false }: { mobile?: boolean }) => (
  <div className={`flex items-center ${mobile ? 'gap-2.5' : 'gap-3'}`}>
    <div className={`${mobile ? 'w-10 h-10' : 'w-[58px] h-[58px]'} rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-1 ring-white/20`}>
      <img src="/upi-logo.png" alt="Logo UPI" className="w-[90%] h-[90%] object-contain" />
    </div>
    <div>
      <p className={`${mobile ? 'text-[13px]' : 'text-[16px]'} font-black tracking-tight text-white`}>SILAT MOTION</p>
      <p className="text-[9.5px] text-red-100/70">Analisis Tendangan Pencak Silat</p>
    </div>
  </div>
);

export const Sidebar: React.FC = () => {
  const [isOpen,setIsOpen]=useState(false);
  const navigate=useNavigate();
  return <>
    <header className="md:hidden sticky top-0 z-40 h-14 px-4 bg-[#8b0000] flex items-center justify-between shadow-lg">
      <Brand mobile />
      <button onClick={()=>setIsOpen(!isOpen)} className="p-2 rounded-xl text-white hover:bg-white/10" aria-label="Buka menu">{isOpen?<X size={19}/>:<Menu size={19}/>}</button>
    </header>
    {isOpen && <div onClick={()=>setIsOpen(false)} className="fixed inset-0 bg-slate-950/45 z-40 md:hidden"/>}
    <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-[250px] bg-[#8b0000] text-white flex flex-col transition-transform duration-200 md:translate-x-0 overflow-hidden ${isOpen?'translate-x-0':'-translate-x-full'}`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img src="/silhouettes/high-kick.png" alt="" className="absolute -left-28 bottom-20 w-[390px] opacity-[.055] rotate-[-7deg]" />
      </div>
      <div className="relative p-5 flex-1">
        <div className="pb-6 border-b border-white/15"><Brand /></div>
        <div className="mt-7 mb-3 px-2"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-red-100/55">Research workflow</p></div>
        <nav className="space-y-1.5">
          <NavLink to="/beranda" onClick={()=>setIsOpen(false)} className={({isActive})=>`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all ${isActive?'bg-white/15 text-white ring-1 ring-white/10':'text-red-50/85 hover:bg-white/10 hover:text-white'}`}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[.08]"><Home size={17}/></span><span>Beranda</span>
          </NavLink>
          {navItems.map(item=>{const Icon=item.icon; return <NavLink key={item.path} to={item.path} onClick={()=>setIsOpen(false)} className={({isActive})=>`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all ${isActive?'bg-white/15 text-white ring-1 ring-white/10':'text-red-50/85 hover:bg-white/10 hover:text-white'}`}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[.08]"><Icon size={17}/></span><span>{item.label}</span>
          </NavLink>})}
        </nav>
        <div className="mt-7 pt-5 border-t border-white/15">
          <NavLink to="/pengaturan" onClick={()=>setIsOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all ${isActive?'bg-white/15 text-white ring-1 ring-white/10':'text-red-50/85 hover:bg-white/10 hover:text-white'}`}><span className="w-8 h-8 rounded-lg bg-white/[.08] flex items-center justify-center"><Settings size={17}/></span>Pengaturan</NavLink>
        </div>
        <div className="mt-6 rounded-2xl border border-white/15 bg-black/10 p-4">
          <div className="flex items-center gap-2"><FlaskConical size={14}/><p className="text-[10px] font-bold uppercase tracking-wider">Mode Penelitian</p></div>
          <p className="mt-2 text-[11px] leading-relaxed text-red-100/65">Kelola subjek, analisis video, dan hasil penelitian dalam satu tempat.</p>
        </div>
      </div>
      <div className="relative px-5 py-4 border-t border-white/15 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#8b0000] font-black text-[11px]">AH</div>
        <div><p className="text-[11px] font-bold">Ahdan Haqqin</p><p className="text-[9px] text-red-100/60">Peneliti</p></div>
      </div>
    </aside>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#8b0000]/[.98] backdrop-blur border-t border-white/10 px-1.5 py-1.5 flex justify-around safe-area-bottom shadow-[0_-8px_24px_rgba(15,23,42,.12)]">
      {[{path:'/beranda',label:'Beranda',icon:Home}, ...navItems].map(item=>{const Icon=item.icon; return <NavLink key={item.path} to={item.path} className={({isActive})=>`flex min-w-0 flex-1 max-w-[92px] flex-col items-center py-1.5 px-1 rounded-xl text-[8px] font-semibold ${isActive?'text-white bg-white/10':'text-red-100/65'}`}><Icon size={17}/><span className="mt-0.5 truncate max-w-full">{item.label}</span></NavLink>})}
    </nav>
  </>;
};
