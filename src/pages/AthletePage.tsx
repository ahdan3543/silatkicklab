import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye, Users, UserCheck, Clock3, BarChart3, ArrowUpDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';
import { AthleteFormModal } from '../features/athlete/AthleteFormModal';
import { AthleteDetailModal } from '../features/athlete/AthleteDetailModal';

export const AthletePage: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [deleting, setDeleting] = useState<Athlete | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([athleteService.getAllAthletes(), sessionService.getAllSessions()]);
      setAthletes(a || []);
      setSessions(s || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sessionCount = (id: string) => sessions.filter((s) => s.athleteId === id).length;
  const active = athletes.filter((a) => a.status === 'Aktif').length;
  const inactive = athletes.length - active;
  const totalAnalyses = sessions.length;

  const filtered = useMemo(() => athletes.filter((a) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${a.name} ${a.athleteCode} ${a.category || ''}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'Semua Status' || (a.status || 'Aktif') === statusFilter;
    return matchesSearch && matchesStatus;
  }), [athletes, search, statusFilter]);

  const remove = async () => {
    if (!deleting) return;
    if (sessions.some((s) => s.athleteId === deleting.id)) {
      await athleteService.updateAthlete(deleting.id, { status: 'Tidak Aktif' });
    } else {
      await athleteService.deleteAthlete(deleting.id);
    }
    setDeleting(null);
    load();
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-full space-y-5 sm:space-y-6 mobile-safe-bottom">
      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-content">
          <h1 className="mt-5 text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Data <span className="text-[#a40000]">Atlet</span></h1>
          <p className="mt-3 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Kelola data atlet yang akan dianalisis dalam penelitian. Tambahkan, edit, atau lihat detail data atlet.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="!mt-5 !rounded-full !bg-[#a40000] !px-6 !py-3 !font-bold !text-white shadow-lg shadow-red-900/15 hover:!bg-[#800000]" icon={<Plus size={17} />}>Tambah Atlet</Button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 p-5 sm:p-6 min-h-[118px] flex items-center gap-4 shadow-[0_6px_20px_rgba(15,23,42,.035)]">
          <span className="w-[62px] h-[62px] rounded-[20px] bg-red-200/80 text-red-600 flex items-center justify-center shrink-0"><Users size={31}/></span>
          <div><p className="text-[11px] font-bold text-slate-500">Total Atlet</p><strong className="block mt-1 text-[29px] leading-none font-extrabold text-slate-900">{athletes.length}</strong><small className="block mt-1.5 text-[10px] text-slate-500">Seluruh atlet dalam database</small></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 p-5 sm:p-6 min-h-[118px] flex items-center gap-4 shadow-[0_6px_20px_rgba(15,23,42,.035)]">
          <span className="w-[62px] h-[62px] rounded-[20px] bg-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0"><UserCheck size={31}/></span>
          <div><p className="text-[11px] font-bold text-slate-500">Atlet Aktif</p><strong className="block mt-1 text-[29px] leading-none font-extrabold text-slate-900">{active}</strong><small className="block mt-1.5 text-[10px] text-slate-500">Siap untuk analisis</small></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 p-5 sm:p-6 min-h-[118px] flex items-center gap-4 shadow-[0_6px_20px_rgba(15,23,42,.035)]">
          <span className="w-[62px] h-[62px] rounded-[20px] bg-amber-200/80 text-amber-600 flex items-center justify-center shrink-0"><Clock3 size={31}/></span>
          <div><p className="text-[11px] font-bold text-slate-500">Belum Aktif</p><strong className="block mt-1 text-[29px] leading-none font-extrabold text-slate-900">{inactive}</strong><small className="block mt-1.5 text-[10px] text-slate-500">Menunggu data lengkap</small></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-5 sm:p-6 min-h-[118px] flex items-center gap-4 shadow-[0_6px_20px_rgba(15,23,42,.035)]">
          <span className="w-[62px] h-[62px] rounded-[20px] bg-violet-200/80 text-violet-600 flex items-center justify-center shrink-0"><BarChart3 size={31}/></span>
          <div><p className="text-[11px] font-bold text-slate-500">Total Analisis</p><strong className="block mt-1 text-[29px] leading-none font-extrabold text-slate-900">{totalAnalyses}</strong><small className="block mt-1.5 text-[10px] text-slate-500">Video yang sudah dianalisis</small></div>
        </div>
      </div>

      {/* Table */}
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7 shadow-[0_7px_24px_rgba(15,23,42,.045)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div><h2 className="text-[21px] sm:text-[24px] font-extrabold tracking-tight text-slate-900">Daftar Atlet</h2><p className="mt-1 text-[11px] sm:text-[13px] text-slate-400">Kelola dan lihat seluruh data atlet penelitian.</p></div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-[250px] lg:w-[280px]"><Search size={16} className="absolute left-3.5 top-3 text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama atlet..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"/></div>
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-red-300"><option>Semua Status</option><option>Aktif</option><option>Tidak Aktif</option></select>
            <button className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"><span>Urutkan</span><ArrowUpDown size={14}/></button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 hidden sm:block">
          <table className="w-full min-w-[940px] text-left">
            <thead className="bg-slate-50/90 border-b border-slate-100">
              <tr className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-4"><input type="checkbox" className="accent-red-700" /></th><th className="px-3 py-4">No.</th><th className="px-3 py-4">Foto</th><th className="px-3 py-4">Nama Atlet</th><th className="px-3 py-4">NIM / ID</th><th className="px-3 py-4">Jenis Kelamin</th><th className="px-3 py-4">Kelas</th><th className="px-3 py-4">Status</th><th className="px-3 py-4">Jumlah Analisis</th><th className="px-3 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="py-14 text-center text-xs text-slate-400">Memuat data atlet...</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="py-14 text-center text-xs text-slate-400">Tidak ada atlet yang sesuai.</td></tr> : filtered.map((a, index) => (
                <tr key={a.id} className="hover:bg-red-50/25 transition-colors">
                  <td className="px-4 py-4"><input type="checkbox" className="accent-red-700" /></td>
                  <td className="px-3 py-4 text-xs font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-3 py-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-50 to-rose-100 text-[#a40000] flex items-center justify-center font-extrabold text-[11px]">{initials(a.name)}</div></td>
                  <td className="px-3 py-4"><div className="font-extrabold text-[13px] text-slate-800 whitespace-nowrap">{a.name}</div></td>
                  <td className="px-3 py-4 text-[12px] text-slate-500 whitespace-nowrap">{a.athleteCode || '-'}</td>
                  <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600">♂ {a.gender || '-'}</span></td>
                  <td className="px-3 py-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">{a.category || '-'}</td>
                  <td className="px-3 py-4"><Badge variant={a.status === 'Aktif' ? 'success' : 'neutral'}>{a.status || 'Aktif'}</Badge></td>
                  <td className="px-3 py-4 text-[12px] font-semibold text-slate-600">{sessionCount(a.id)}</td>
                  <td className="px-3 py-4"><div className="flex justify-end gap-2">
                    <button title="Lihat detail" onClick={()=>{setSelected(a);setDetailOpen(true)}} className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-[#a40000] flex items-center justify-center"><Eye size={15}/></button>
                    <button title="Edit" onClick={()=>{setEditing(a);setFormOpen(true)}} className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-[#a40000] flex items-center justify-center"><Pencil size={15}/></button>
                    <button title="Hapus" onClick={()=>setDeleting(a)} className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile athlete cards: no horizontal table scrolling on phones. */}
        <div className="mt-5 space-y-3 sm:hidden">
          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-xs text-slate-400">Memuat data atlet...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-xs text-slate-400">Tidak ada atlet yang sesuai.</div>
          ) : filtered.map((a, index) => (
            <article key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.035)]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 text-[#a40000] flex items-center justify-center font-extrabold text-xs shrink-0">{initials(a.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-extrabold text-sm text-slate-900 truncate">{a.name}</p><p className="text-[10px] text-slate-400 mt-1">Atlet #{index + 1} · {a.athleteCode || 'Tanpa ID'}</p></div>
                    <Badge variant={a.status === 'Aktif' ? 'success' : 'neutral'}>{a.status || 'Aktif'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Jenis Kelamin</span><b className="block mt-0.5 text-[10px] text-slate-700">{a.gender || '-'}</b></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Kelas</span><b className="block mt-0.5 text-[10px] text-slate-700 truncate">{a.category || '-'}</b></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Analisis</span><b className="block mt-0.5 text-[10px] text-slate-700">{sessionCount(a.id)} sesi</b></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">ID</span><b className="block mt-0.5 text-[10px] text-slate-700 truncate">{a.athleteCode || '-'}</b></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button onClick={()=>{setSelected(a);setDetailOpen(true)}} className="h-10 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center gap-1.5 text-[10px] font-bold"><Eye size={14}/> Detail</button>
                    <button onClick={()=>{setEditing(a);setFormOpen(true)}} className="h-10 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center gap-1.5 text-[10px] font-bold"><Pencil size={14}/> Edit</button>
                    <button onClick={()=>setDeleting(a)} className="h-10 rounded-xl border border-red-100 bg-red-50 text-red-500 flex items-center justify-center gap-1.5 text-[10px] font-bold"><Trash2 size={14}/> Hapus</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400"><span>Menampilkan 1 - {filtered.length} dari {athletes.length} atlet</span><div className="flex gap-2"><button className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400">‹</button><button className="w-9 h-9 rounded-xl bg-[#a40000] text-white font-bold">1</button><button className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400">›</button></div></div>
      </section>

      <AthleteFormModal isOpen={formOpen} initialData={editing} onClose={()=>setFormOpen(false)} onSuccess={()=>{setFormOpen(false);load()}} />
      <AthleteDetailModal isOpen={detailOpen} athlete={selected} onClose={()=>setDetailOpen(false)} />
      {deleting && <div className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"><h3 className="font-extrabold text-slate-900">Hapus atlet?</h3><p className="text-xs leading-relaxed text-slate-500 mt-2">Data <b>{deleting.name}</b> akan dihapus jika belum memiliki sesi analisis.</p><div className="flex justify-end gap-2 mt-5"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="primary" onClick={remove}>Hapus</Button></div></div></div>}
    </div>
  );
};
