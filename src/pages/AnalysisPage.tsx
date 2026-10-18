import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Activity, ArrowRight, Trash2, FileText, Play, ClipboardCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AnalysisSession, Athlete } from '../types';
import { sessionService } from '../services/sessionService';
import { athleteService } from '../services/athleteService';
import { SessionFormModal } from '../features/analysis/SessionFormModal';

export const AnalysisPage: React.FC = () => {
 const navigate=useNavigate(); const location=useLocation(); const [sessions,setSessions]=useState<AnalysisSession[]>([]); const [athletes,setAthletes]=useState<Athlete[]>([]); const [loading,setLoading]=useState(true); const [formOpen,setFormOpen]=useState(false); const [deleteId,setDeleteId]=useState<string|null>(null); const initialAthleteId=new URLSearchParams(location.search).get('athlete')||undefined;
 const load=async()=>{setLoading(true);try{const [s,a]=await Promise.all([sessionService.getAllSessions(),athleteService.getAllAthletes()]);setSessions(s||[]);setAthletes(a||[])}finally{setLoading(false)}}; useEffect(()=>{load()},[]); useEffect(()=>{if(initialAthleteId)setFormOpen(true)},[initialAthleteId]);
 const athlete=(id:string)=>athletes.find(a=>a.id===id); const remove=async()=>{if(deleteId)await sessionService.deleteSession(deleteId);setDeleteId(null);load()};
 return <div className="w-full mx-0 mobile-safe-bottom space-y-5 sm:space-y-6">
  <section className="page-hero">
   <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.98)_0%,rgba(255,255,255,.86)_48%,rgba(255,226,229,.28)_100%)]" />
   <div className="absolute right-0 top-0 h-full w-[58%] bg-[url('/assets/hero-silat.png')] bg-right center bg-no-repeat bg-contain opacity-95" />
   <div className="page-hero-content">
    <div className="flex items-center gap-2 text-[10px] font-bold">
     <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 tracking-[.16em] text-[#a40000]">SILAT MOTION</span>
     <span className="text-slate-400">›</span>
     <span className="text-slate-500">Analisis</span>
    </div>
    <h1 className="mt-5 text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Analisis <span className="text-[#a40000]">Tendangan</span></h1>
    <p className="mt-3 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Ukur waktu, jarak, dan kecepatan tendangan dari video sisi samping.</p>
    <Button onClick={()=>setFormOpen(true)} className="!mt-5 !rounded-full !bg-[#a40000] !px-6 !py-3 !font-bold !text-white shadow-lg shadow-red-900/15 hover:!bg-[#800000]" icon={<Plus size={17} />}>Sesi Baru</Button>
   </div>
  </section>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
   <div className="analysis-stat analysis-stat-red"><div className="analysis-stat-icon"><ClipboardCheck size={28}/></div><div><p>Sesi</p><strong>{sessions.length}</strong><small>Total sesi analisis dilakukan</small></div><div className="analysis-stat-watermark">▦</div></div>
   <div className="analysis-stat analysis-stat-green"><div className="analysis-stat-icon"><Activity size={29}/></div><div><p>Percobaan</p><strong>{sessions.reduce((n,s)=>n+s.attempts.length,0)}</strong><small>Total percobaan yang dianalisis</small></div><div className="analysis-stat-watermark">▥</div></div>
   <div className="analysis-stat analysis-stat-yellow"><div className="analysis-stat-icon"><FileText size={28}/></div><div><p>Protokol</p><strong>5×</strong><small>Percobaan per atlet</small></div><div className="analysis-stat-watermark">▶</div></div>
  </div>

  <section className="analysis-protocol rounded-2xl border p-5 sm:p-6 flex items-center gap-4">
   <div className="analysis-protocol-icon"><ClipboardCheck size={24}/></div><div className="min-w-0"><p className="text-[14px] font-extrabold text-slate-900">Protokol pengukuran</p><p className="text-[10px] sm:text-[11px] leading-relaxed text-slate-500 mt-1">Kalibrasi marker → frame awal → frame kontak → waktu → jarak → kecepatan. Setiap atlet dianalisis sebanyak 5 percobaan.</p></div><ArrowRight className="ml-auto text-violet-500 shrink-0" size={22}/>
  </section>

  <section className="analysis-surface overflow-hidden">
   <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-[18px] font-extrabold tracking-tight text-slate-900">Sesi analisis</p><p className="text-[10px] text-slate-400 mt-1">Pilih sesi untuk melanjutkan pengukuran.</p></div><div className="flex items-center gap-2"><div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">⌕&nbsp; Cari sesi, atlet, atau tanggal...</div><span className="text-[10px] font-bold text-slate-400">{sessions.length} sesi</span></div></div>
   {loading?<p className="py-12 text-center text-xs text-slate-500">Memuat sesi...</p>:sessions.length===0?<div className="py-12 text-center"><Activity className="mx-auto text-slate-300" size={30}/><p className="mt-3 text-xs font-bold text-slate-700">Belum ada sesi analisis</p><p className="text-[10px] text-slate-400 mt-1">Mulai dari halaman Data Atlet.</p><button onClick={()=>navigate('/atlet')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#800000]">Kembali ke atlet <ArrowRight size={13}/></button></div>:<div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2">
    {sessions.map((s,i)=>{const a=athlete(s.athleteId);const done=s.attempts.filter(x=>x.video||x.status==='Dianalisis').length;const complete=s.status==='Selesai'||s.status==='Completed';const tone=complete?'green':i%3===1?'blue':'red';return <article key={s.id} className={`analysis-session-card tone-${tone}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><div className="analysis-avatar">{(s.athleteName||a?.name||'-').slice(0,2).toUpperCase()}</div><p className="font-extrabold text-[13px] truncate">{s.athleteName||a?.name||'-'}</p><Badge variant={complete?'success':'info'}>{s.status||'Draft'}</Badge></div><p className="text-[10px] text-slate-400 mt-2 ml-[52px]">{s.sessionCode} · {s.date} · {s.kickingLeg}</p></div><div className="text-right shrink-0"><p className="text-[9px] text-slate-400">Progress</p><p className="text-[13px] font-extrabold text-slate-800">{done}/5</p></div></div>
      <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden border border-white/80"><div className="h-full rounded-full bg-[#d00000]" style={{width:`${Math.min(100,(done/5)*100)}%`}}/></div>
      <div className="mt-4 flex items-center justify-between gap-2"><button onClick={()=>setDeleteId(s.id)} className="analysis-delete"><Trash2 size={15}/></button><div className="flex gap-2"><button onClick={()=>navigate(`/analisis/${s.id}`)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#b00000] text-white text-[10px] font-extrabold shadow-sm"><Play size={12}/>{complete?'Lihat hasil':'Lanjut analisis'}<ArrowRight size={12}/></button>{complete&&<button onClick={()=>navigate(`/analisis/${s.id}/laporan`)} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-[10px] font-bold text-slate-700"><FileText size={13}/> Laporan</button>}</div></div>
    </article>})}
   </div>}
  </section>
  <SessionFormModal isOpen={formOpen} initialAthleteId={initialAthleteId} onClose={()=>{setFormOpen(false);if(initialAthleteId)navigate('/analisis',{replace:true})}} onSuccess={id=>{setFormOpen(false);if(id)navigate(`/analisis/${id}`);else load()}}/>
  {deleteId&&<div className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"><h3 className="font-extrabold">Hapus sesi analisis?</h3><p className="text-xs text-slate-500 mt-2">Data sesi dan hubungan pengujiannya akan dihapus.</p><div className="flex justify-end gap-2 mt-5"><Button variant="outline" onClick={()=>setDeleteId(null)}>Batal</Button><Button variant="primary" onClick={remove}>Hapus</Button></div></div></div>}
 </div>
}
