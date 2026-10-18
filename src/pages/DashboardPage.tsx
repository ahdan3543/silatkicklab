import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, FileText, Settings2, ArrowRight, PlayCircle, Upload, MousePointer2, BarChart3, CheckCircle2, Ruler, Timer, Target, Gauge, GitCompare, ChevronDown } from 'lucide-react';
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
          <h1 className="text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Selamat datang,<br/><span className="text-[#a40000]">Ahdan!</span> 👋</h1>
          <p className="mt-4 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Lanjutkan penelitian dan analisis tendangan depan atlet pencak silat.</p>
          <button onClick={() => navigate('/analisis')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a40000] px-6 py-3 text-[12px] font-extrabold text-white shadow-lg shadow-red-900/15 hover:bg-[#800000]"><PlayCircle size={16}/> Mulai Analisis <ArrowRight size={15}/></button>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="dashboard-stat bg-gradient-to-br from-rose-50 to-pink-100/80 border-rose-100"><span className="stat-icon bg-red-100 text-[#c00000]"><Users size={25}/></span><div><p>Total Subjek</p><strong>{athletes.length}</strong><small>Atlet dalam penelitian</small></div></div>
        <div className="dashboard-stat bg-gradient-to-br from-emerald-50 to-green-100/80 border-emerald-100"><span className="stat-icon bg-emerald-100 text-emerald-600"><Activity size={25}/></span><div><p>Subjek Aktif</p><strong>{active}</strong><small>Siap untuk dianalisis</small></div></div>
        <div className="dashboard-stat col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-50 to-yellow-100/80 border-amber-100"><span className="stat-icon bg-amber-100 text-amber-600"><FileText size={25}/></span><div><p>Total Sesi</p><strong>{sessions.length}</strong><small>Video yang dianalisis</small></div></div>
      </div>

      <div className="space-y-5">
        <div className="space-y-5">
          <section className="dashboard-section">
            <div className="mb-5"><h2 className="section-title-mark">Menu Utama</h2><p>Pilih alur kerja penelitian yang ingin dilanjutkan.</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Quick title="Data Atlet" desc="Kelola data subjek penelitian" icon={<Users size={25}/>} tone="pink" onClick={() => navigate('/atlet')} />
              <Quick title="Analisis" desc="Proses video dan pengukuran" icon={<Activity size={25}/>} tone="red" onClick={() => navigate('/analisis')} />
              <Quick title="Laporan" desc="Lihat dan cetak hasil analisis" icon={<FileText size={25}/>} tone="green" onClick={() => navigate('/pengaturan')} />
              <Quick title="Pengaturan" desc="Atur sistem dan preferensi" icon={<Settings2 size={25}/>} tone="purple" onClick={() => navigate('/pengaturan')} />
            </div>
          </section>

          <section className="dashboard-section">
            <div className="flex items-center justify-between mb-5"><div><h2 className="section-title-mark">Subjek Penelitian</h2><p>Kelola atlet dan masuk ke sesi analisis.</p></div><button onClick={() => navigate('/atlet')} className="text-[10px] font-bold text-[#a40000]">Lihat Semua →</button></div>
            <div className="grid gap-3 md:grid-cols-2">
              {athletes.slice(0,4).map(a => <button key={a.id} onClick={() => navigate('/atlet')} className="athlete-row text-left"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-2xl bg-red-50 text-[#a40000] flex items-center justify-center font-extrabold text-xs shrink-0">{a.name.slice(0,2).toUpperCase()}</div><div className="min-w-0"><p className="font-extrabold text-[13px] truncate">{a.name}</p><p className="text-[10px] text-slate-400 mt-1">{a.status || 'Aktif'} · {a.category || 'Belum ada kelas'}</p></div></div><ArrowRight size={15} className="text-slate-300"/></button>)}
            </div>
          </section>

          <section className="dashboard-section system-explainer overflow-hidden">
            <div className="system-head mb-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[9px] font-black tracking-[.14em] text-[#a40000]">
                  <Activity size={12}/> CARA KERJA SISTEM
                </div>
                <h2 className="section-title-mark">Bagaimana Sistem Menghasilkan Hasil?</h2>
                <p>Setiap angka berasal dari proses pengukuran yang jelas—mulai dari video, waktu gerak, jarak, hingga titik sasaran.</p>
              </div>
              <div className="system-flow-badge"><span>VIDEO</span><ArrowRight size={13}/><span>DATA</span><ArrowRight size={13}/><span>HASIL</span></div>
            </div>

            <div className="system-steps">
              <SystemStep number="01" title="Video Samping" icon={<Upload size={20}/>} desc="5 percobaan direkam dari sisi samping dengan posisi kamera, jarak, dan bidang gerak yang dibuat konsisten." tag="INPUT VIDEO" tone="red" detail="Video adalah bahan mentah penelitian. Bayangkan seperti merekam pertandingan dari satu titik kamera: posisi kamera harus tetap supaya gerakan pada percobaan pertama dan kelima bisa dibandingkan secara adil. Dari video inilah sistem mengambil frame, posisi kaki, titik sasaran, dan data gerak yang diperlukan." analogy="Analogi: seperti mengukur lari dengan kamera di garis start—kalau posisi kameranya berubah-ubah, hasil pengukuran ikut berubah." />
              <SystemStep number="02" title="Kalibrasi Jarak" icon={<Ruler size={20}/>} desc="Marker dengan ukuran nyata menjadi patokan agar jarak pada video dapat dikonversi dari piksel menjadi meter." tag="PIXEL → METER" tone="amber" detail="Sistem terlebih dahulu mengetahui ukuran nyata sebuah marker. Perbandingan ukuran marker di dunia nyata dengan ukurannya di video digunakan untuk membuat skala piksel ke meter. Setelah skala terbentuk, perpindahan kaki yang terlihat di video dapat dihitung dalam satuan jarak nyata." analogy="Analogi: seperti melihat penggaris di foto. Walaupun foto hanya berisi piksel, penggaris memberi tahu bahwa sekian piksel sebenarnya mewakili, misalnya, 1 meter." />
              <SystemStep number="03" title="Tentukan Waktu" icon={<Timer size={20}/>} desc="Tandai frame saat kaki mulai bergerak dan frame saat kontak dengan sasaran untuk mendapatkan waktu tempuh." tag="Δ FRAME ÷ FPS" tone="purple" detail="Waktu tempuh dihitung dari selisih frame antara awal gerakan dan saat kaki mengenai sasaran, kemudian dibagi dengan FPS video. Rumusnya: (frame kontak − frame awal) ÷ FPS. Semakin kecil waktunya untuk jarak yang sama, semakin cepat gerakannya." analogy="Analogi: seperti stopwatch digital, hanya saja sistem menggunakan nomor frame sebagai 'detak waktu' yang sangat presisi." />
              <SystemStep number="04" title="Hitung Kecepatan" icon={<Gauge size={20}/>} desc="Jarak gerak kaki dibagi waktu tempuh menghasilkan kecepatan tendangan dalam satuan meter per detik." tag="JARAK ÷ WAKTU = m/s" tone="green" detail="Setelah jarak sudah dikonversi ke meter dan waktu tempuh sudah diketahui, kecepatan dihitung dengan rumus v = jarak ÷ waktu. Contohnya, jika kaki berpindah 1,2 meter dalam 0,12 detik, kecepatannya 10 m/s. Nilai ini membantu membandingkan performa antarpercobaan secara kuantitatif." analogy="Analogi: dua atlet menempuh jarak yang sama; atlet yang menyelesaikannya dalam waktu lebih singkat memiliki kecepatan lebih tinggi." />
              <SystemStep number="05" title="Ukur Akurasi" icon={<Target size={20}/>} desc="Posisi titik impak dibandingkan dengan area target untuk menentukan HIT atau MISS pada setiap percobaan." tag="HIT ÷ VALID × 100%" tone="rose" detail="Setiap titik impak diperiksa terhadap area target. Percobaan yang titik impaknya berada di area yang ditentukan dihitung sebagai HIT, sedangkan yang berada di luar area dihitung sebagai MISS. Akurasi kemudian diringkas dengan rumus HIT ÷ percobaan valid × 100%." analogy="Analogi: seperti papan target panahan—bukan hanya seberapa cepat anak panah melaju, tetapi apakah anak panah benar-benar mengenai area yang dituju." />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Quick = ({title, desc, icon, tone, onClick}:{title:string;desc:string;icon:React.ReactNode;tone:string;onClick:()=>void}) => {
  const tones:any = {pink:'bg-rose-50 text-[#c00000] border-rose-100', red:'bg-red-100 text-[#c00000] border-red-100', green:'bg-emerald-50 text-emerald-600 border-emerald-100', purple:'bg-violet-50 text-violet-600 border-violet-100'};
  return <button onClick={onClick} className={`quick-card bg-gradient-to-br ${tone==='pink'?'from-rose-50 to-pink-100/70':tone==='red'?'from-red-50 to-rose-100/80':tone==='green'?'from-emerald-50 to-green-100/70':'from-violet-50 to-indigo-100/70'} border ${tones[tone].split(' ').pop()} text-left`}><span className={`quick-icon ${tones[tone]}`}>{icon}</span><span className="min-w-0"><b>{title}</b><small>{desc}</small></span><ArrowRight size={15} className="ml-auto text-slate-300 shrink-0"/></button>
}
const SystemStep = ({number,title,desc,icon,tag,tone,detail,analogy}:{number:string;title:string;desc:string;icon:React.ReactNode;tag:string;tone:string;detail:string;analogy:string}) => {
  const tones:any = {
    red:'bg-red-50 text-[#a40000] border-red-100',
    amber:'bg-amber-50 text-amber-600 border-amber-100',
    purple:'bg-violet-50 text-violet-600 border-violet-100',
    green:'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose:'bg-rose-50 text-rose-600 border-rose-100'
  };
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      className={`system-step group text-left w-full cursor-pointer transition-all duration-200 ${open ? 'ring-1 ring-[#a40000]/15 shadow-md' : 'hover:shadow-sm'}`}
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`system-step-icon ${tones[tone]}`}>{icon}</span>
        <div className="flex items-center gap-2">
          <span className="system-step-number">{number}</span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={15}/>
          </span>
        </div>
      </div>
      <div className="mt-4">
        <b className="system-step-title">{title}</b>
        <p className="system-step-desc">{desc}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="system-step-tag">{tag}</span>
        <span className="text-[9px] font-bold text-slate-400">{open ? 'Tutup penjelasan' : 'Klik untuk penjelasan'}</span>
      </div>
      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[.12em] text-[#a40000]">Penjelasan</span>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{detail}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Gambaran sederhana</span>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{analogy}</p>
          </div>
        </div>
      )}
    </button>
  );
};

