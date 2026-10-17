import React from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => <header className="h-[62px] bg-white/85 backdrop-blur border-b border-slate-200/80 px-5 lg:px-7 flex items-center justify-between sticky top-0 z-30">
  <div className="min-w-0"><p className="text-[12px] sm:text-[13px] font-bold text-slate-800 truncate">Analisis Akurasi & Kecepatan Tendangan Depan</p><p className="text-[9px] text-slate-400 mt-0.5">Sistem penelitian berbasis web · Pencak Silat UPI</p></div>
  <div className="flex items-center gap-2.5 shrink-0"><div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[9px] font-semibold text-emerald-700"><ShieldCheck size={12}/> Research mode</div><div className="w-8 h-8 rounded-full bg-[#800000]/[.07] border border-[#800000]/10 flex items-center justify-center text-[#800000]"><UserRound size={15}/></div><div className="hidden sm:block"><p className="text-[11px] font-bold text-slate-800">Peneliti</p><p className="text-[9px] text-slate-400">Evaluator</p></div></div>
</header>;
