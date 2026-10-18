import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Activity, ArrowRight, Trash2, FileText, Play, ClipboardCheck, ArrowDownUp, MoreVertical } from 'lucide-react';
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
 return <div className="w-full min-w-0 mobile-safe-bottom space-y-5 sm:space-y-6">
  <section className="page-hero">
   <div className="page-hero-content">
    <h1 className="mt-5 text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Analisis <span className="text-[#a40000]">Tendangan</span></h1>
    <p className="mt-3 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Ukur waktu, jarak, dan kecepatan tendangan dari video sisi samping.</p>
    <Button onClick={()=>setFormOpen(true)} className="!mt-5 !rounded-full !bg-[#a40000] !px-6 !py-3 !font-bold !text-white shadow-lg shadow-red-900/15 hover:!bg-[#800000]" icon={<Plus size={17} />}>Sesi Baru</Button>
   </div>
  </section>

  <div className="analysis-stats grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
   <div className="dashboard-stat bg-gradient-to-br from-rose-50 to-pink-100/80 border-rose-100"><span className="stat-icon bg-red-100 text-[#c00000]"><ClipboardCheck size={25}/></span><div><p>Sesi</p><strong>{sessions.length}</strong><small>Total sesi analisis dilakukan</small></div></div>
   <div className="dashboard-stat bg-gradient-to-br from-emerald-50 to-green-100/80 border-emerald-100"><span className="stat-icon bg-emerald-100 text-emerald-600"><Activity size={25}/></span><div><p>Percobaan</p><strong>{sessions.reduce((n,s)=>n+s.attempts.length,0)}</strong><small>Total percobaan yang dianalisis</small></div></div>
   <div className="dashboard-stat col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-50 to-yellow-100/80 border-amber-100"><span className="stat-icon bg-amber-100 text-amber-600"><FileText size={25}/></span><div><p>Protokol</p><strong>5×</strong><small>Percobaan per atlet</small></div></div>
  </div>

  <section className="dashboard-section !p-0 overflow-hidden">
   <div className="analysis-list-header px-5 sm:px-7 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div><h2 className="section-title-mark">Sesi Analisis</h2><p>Pilih sesi untuk melanjutkan pengukuran.</p></div>
    <div className="analysis-list-tools flex items-center gap-2 min-w-0">
      <button onClick={()=>setFormOpen(true)} className="analysis-new-session inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[11px] font-extrabold text-[#b00000] hover:bg-red-100 transition"><Plus size={17}/> Sesi Baru</button>
      <button className="analysis-sort inline-flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-700"><ArrowDownUp size={15}/> Terbaru <span className="text-slate-400">⌄</span></button>
      <span className="analysis-count text-[10px] font-bold text-slate-400 whitespace-nowrap">{sessions.length} sesi</span>
    </div>
   </div>
   {loading?<p className="py-12 text-center text-xs text-slate-500">Memuat sesi...</p>:sessions.length===0?<div className="py-12 text-center"><Activity className="mx-auto text-slate-300" size={30}/><p className="mt-3 text-xs font-bold text-slate-700">Belum ada sesi analisis</p><p className="text-[10px] text-slate-400 mt-1">Mulai dari halaman Data Atlet.</p><button onClick={()=>navigate('/atlet')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#800000]">Kembali ke atlet <ArrowRight size={13}/></button></div>:<div className="p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
    {sessions.map((s)=>{
      const a=athlete(s.athleteId); const done=s.attempts.filter(x=>x.video||x.status==='Dianalisis').length; const complete=s.status==='Selesai'||s.status==='Completed'; const displayName=s.athleteName||a?.name||'-';
      return <article key={s.id} className="analysis-session-card min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 hover:border-red-100 hover:bg-white hover:shadow-[0_8px_22px_rgba(164,0,0,.06)] transition-all">
        <div className="analysis-session-top flex items-start justify-between gap-3 min-w-0">
          <div className="analysis-person flex items-start gap-3 min-w-0 flex-1">
            <div className="analysis-avatar">{displayName.slice(0,2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="analysis-athlete-name font-extrabold text-[13px] truncate">{displayName}</p>
              <p className="analysis-code text-[10px] text-slate-400 mt-1 truncate">{s.sessionCode}</p>
              <p className="analysis-meta text-[10px] text-slate-400 mt-0.5 truncate">{s.date} <span className="mx-1">•</span> {s.kickingLeg}</p>
            </div>
          </div>
          <div className="analysis-status-menu flex items-start gap-2 shrink-0">
            <Badge variant={complete?'success':'info'}>{s.status||'Draft'}</Badge>
            <button className="analysis-more text-slate-400 hover:text-slate-700" aria-label="Menu sesi"><MoreVertical size={19}/></button>
          </div>
        </div>

        <div className="analysis-progress-head mt-5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-slate-500">Progress Analisis</span>
          <span className="text-[11px] font-extrabold text-slate-800">{done} / 5 <span className="font-medium text-slate-400">percobaan</span></span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-[#d00000] transition-all" style={{width:`${Math.min(100,(done/5)*100)}%`}}/></div>
        <div className="analysis-steps mt-3 grid grid-cols-5 items-center relative">
          <div className="analysis-step-line" />
          {[1,2,3,4,5].map((n)=><div key={n} className={`analysis-step ${n<=done?'is-done':''}`}><span>{n}</span>{n<=done&&<b>✓</b>}</div>)}
        </div>

        <div className="analysis-actions mt-4 flex items-center justify-between gap-2">
          <button onClick={()=>setDeleteId(s.id)} className="analysis-delete" aria-label="Hapus sesi"><Trash2 size={16}/></button>
          <div className="flex items-center justify-end gap-2 flex-1">
            <button onClick={()=>navigate(`/analisis/${s.id}`)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#b00000] text-white text-[10px] font-extrabold shadow-sm hover:bg-[#900000]"><Play size={13}/>{complete?'Lihat Hasil':'Lanjut Analisis'}<ArrowRight size={13}/></button>
            {complete&&<button onClick={()=>navigate(`/analisis/${s.id}/laporan`)} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-700"><FileText size={14}/> Laporan</button>}
          </div>
        </div>
      </article>
    })}
   </div>}
  </section>
  <SessionFormModal isOpen={formOpen} initialAthleteId={initialAthleteId} onClose={()=>{setFormOpen(false);if(initialAthleteId)navigate('/analisis',{replace:true})}} onSuccess={id=>{setFormOpen(false);if(id)navigate(`/analisis/${id}`);else load()}}/>
  {deleteId&&<div className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"><h3 className="font-extrabold">Hapus sesi analisis?</h3><p className="text-xs text-slate-500 mt-2">Data sesi dan hubungan pengujiannya akan dihapus.</p><div className="flex justify-end gap-2 mt-5"><Button variant="outline" onClick={()=>setDeleteId(null)}>Batal</Button><Button variant="primary" onClick={remove}>Hapus</Button></div></div></div>}
 </div>
}
