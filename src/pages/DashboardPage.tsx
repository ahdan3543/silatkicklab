import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, FileText, Settings2, ArrowRight, PlayCircle, Flame, Target, CalendarDays } from 'lucide-react';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);

  useEffect(() => {
    Promise.all([athleteService.getAllAthletes(), sessionService.getAllSessions()])
      .then(([a, s]) => { setAthletes(a || []); setSessions(s || []); })
      .catch(console.error);
  }, []);

  const active = athletes.filter(a => a.status === 'Aktif').length;

  return (
    <div className="w-full space-y-5 sm:space-y-6 mobile-safe-bottom">
      <section className="dashboard-hero relative overflow-hidden rounded-[24px] min-h-[230px] sm:min-h-[255px]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.98)_0%,rgba(255,255,255,.9)_36%,rgba(255,239,242,.52)_62%,rgba(255,225,230,.18)_100%)]" />
        <div className="relative z-10 p-7 sm:p-9 lg:p-10 max-w-[650px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold tracking-[.16em] text-[#a40000]">SILAT MOTION</span>
            <span className="text-[10px] text-slate-400">Penelitian UPI</span>
          </div>
          <h1 className="text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Selamat pagi,<br/><span className="text-[#a40000]">Ahdan!</span> 👋</h1>
          <p className="mt-4 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Lanjutkan penelitian dan analisis tendangan depan atlet pencak silat.</p>
          <button onClick={() => navigate('/analisis')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a40000] px-6 py-3 text-[12px] font-extrabold text-white shadow-lg shadow-red-900/15 hover:bg-[#800000]"><PlayCircle size={16}/> Mulai Analisis <ArrowRight size={15}/></button>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="dashboard-stat bg-gradient-to-br from-rose-50 to-pink-100/80 border-rose-100"><span className="stat-icon bg-red-100 text-[#c00000]"><Users size={25}/></span><div><p>Total Subjek</p><strong>{athletes.length}</strong><small>Atlet dalam penelitian</small></div></div>
        <div className="dashboard-stat bg-gradient-to-br from-emerald-50 to-green-100/80 border-emerald-100"><span className="stat-icon bg-emerald-100 text-emerald-600"><Activity size={25}/></span><div><p>Subjek Aktif</p><strong>{active}</strong><small>Siap untuk dianalisis</small></div></div>
        <div className="dashboard-stat bg-gradient-to-br from-amber-50 to-yellow-100/80 border-amber-100"><span className="stat-icon bg-amber-100 text-amber-600"><FileText size={25}/></span><div><p>Total Sesi</p><strong>{sessions.length}</strong><small>Video yang dianalisis</small></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_315px] gap-5">
        <div className="space-y-5">
          <section className="dashboard-section">
            <div className="mb-5"><h2>Menu Utama</h2><p>Pilih alur kerja penelitian yang ingin dilanjutkan.</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Quick title="Data Atlet" desc="Kelola data subjek penelitian" icon={<Users size={25}/>} tone="pink" onClick={() => navigate('/atlet')} />
              <Quick title="Analisis" desc="Proses video dan pengukuran" icon={<Activity size={25}/>} tone="red" onClick={() => navigate('/analisis')} />
              <Quick title="Laporan" desc="Lihat dan cetak hasil analisis" icon={<FileText size={25}/>} tone="green" onClick={() => navigate('/laporan')} />
              <Quick title="Pengaturan" desc="Atur sistem dan preferensi" icon={<Settings2 size={25}/>} tone="purple" onClick={() => navigate('/laporan')} />
            </div>
          </section>

          <section className="dashboard-section">
            <div className="flex items-center justify-between mb-5"><div><h2>Subjek Penelitian</h2><p>Kelola atlet dan masuk ke sesi analisis.</p></div><button onClick={() => navigate('/atlet')} className="text-[10px] font-bold text-[#a40000]">Lihat Semua →</button></div>
            <div className="grid gap-3 md:grid-cols-2">
              {athletes.slice(0,4).map(a => <button key={a.id} onClick={() => navigate('/atlet')} className="athlete-row text-left"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-2xl bg-red-50 text-[#a40000] flex items-center justify-center font-extrabold text-xs shrink-0">{a.name.slice(0,2).toUpperCase()}</div><div className="min-w-0"><p className="font-extrabold text-[13px] truncate">{a.name}</p><p className="text-[10px] text-slate-400 mt-1">{a.status || 'Aktif'} · {a.category || 'Belum ada kelas'}</p></div></div><ArrowRight size={15} className="text-slate-300"/></button>)}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="dashboard-section">
            <div className="flex items-center justify-between"><div><h2>Subjek Terbaru</h2><p>Atlet yang tersedia saat ini.</p></div><button onClick={() => navigate('/atlet')} className="text-[10px] font-bold text-[#a40000]">Lihat Semua →</button></div>
            <div className="mt-5 space-y-3">{athletes.slice(0,3).map(a => <button key={a.id} onClick={() => navigate('/atlet')} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 hover:border-red-100 hover:bg-red-50/30 text-left transition"><div className="w-10 h-10 rounded-xl bg-red-50 text-[#a40000] flex items-center justify-center font-extrabold text-[10px]">{a.name.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold truncate">{a.name}</p><p className="text-[9px] text-slate-400 mt-0.5">{a.status || 'Aktif'} · {a.category || 'Belum ada kelas'}</p></div><ArrowRight size={14} className="text-slate-300"/></button>)}</div>
          </section>
          <section className="promo-card"><div className="relative z-10"><span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-bold text-[#8b0000]">RESEARCH MODE</span><h3 className="mt-3 text-[20px] font-extrabold tracking-tight text-[#8b0000]">Analisis lebih terarah.</h3><p className="mt-2 text-[10px] leading-relaxed text-[#7b3535]">Sistem analisis tendangan depan berbasis video untuk mendukung penelitian Pencak Silat UPI.</p><button onClick={() => navigate('/analisis')} className="mt-4 rounded-full bg-white border border-red-200 px-4 py-2 text-[10px] font-bold text-[#8b0000]">Buka Analisis <ArrowRight size={12} className="inline ml-1"/></button></div><img src="/assets/promo-silat.png" alt=""/></section>
        </aside>
      </div>
    </div>
  );
};

const Quick = ({title, desc, icon, tone, onClick}:{title:string;desc:string;icon:React.ReactNode;tone:string;onClick:()=>void}) => {
  const tones:any = {pink:'bg-rose-50 text-[#c00000] border-rose-100', red:'bg-red-100 text-[#c00000] border-red-100', green:'bg-emerald-50 text-emerald-600 border-emerald-100', purple:'bg-violet-50 text-violet-600 border-violet-100'};
  return <button onClick={onClick} className={`quick-card bg-gradient-to-br ${tone==='pink'?'from-rose-50 to-pink-100/70':tone==='red'?'from-red-50 to-rose-100/80':tone==='green'?'from-emerald-50 to-green-100/70':'from-violet-50 to-indigo-100/70'} border ${tones[tone].split(' ').pop()} text-left`}><span className={`quick-icon ${tones[tone]}`}>{icon}</span><span className="min-w-0"><b>{title}</b><small>{desc}</small></span><ArrowRight size={15} className="ml-auto text-slate-300 shrink-0"/></button>
}
