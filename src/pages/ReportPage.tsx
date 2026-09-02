import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockSessions } from '../data/mockData';

// Logo UPI Resmi dari Google Drive dengan Fallback Vektor
const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#800000" stroke="#F59E0B" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="#FFFFFF" />
        <path d="M50 14 L58 32 L78 34 L64 48 L68 68 L50 58 L32 68 L36 48 L22 34 L42 32 Z" fill="#800000" />
        <circle cx="50" cy="48" r="12" fill="#F59E0B" />
        <circle cx="50" cy="50" r="9" fill="#800000" />
        <text x="50" y="86" fontSize="9" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">UPI</text>
      </svg>
    );
  }

  return (
    <img
      src="https://lh3.googleusercontent.com/d/196_EpzcqTAhpRq7lb-e3dITxelXnpxmR"
      alt="Logo Universitas Pendidikan Indonesia"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0`}
      loading="eager"
    />
  );
};

export const ReportPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8 font-sans text-dark print:p-0 print:m-0">
      {/* Header Bar Aksi */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 md:p-0 rounded-xl md:rounded-none border md:border-none border-dark-border">
        <div>
          <h2 className="text-base md:text-lg font-bold text-dark">Laporan & Rekomendasi Klinis</h2>
          <p className="text-[11px] md:text-xs text-dark-secondary">
            Cetak rekapitulasi data ilmiah untuk arsip tim medis dan pelatih
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={handlePrint}>
            Cetak
          </Button>
          <Button variant="primary" size="sm" icon={<Download size={15} />} onClick={handlePrint}>
            Ekspor PDF
          </Button>
        </div>
      </div>

      {/* Lembar Dokumen Rekomendasi Klinis */}
      <div className="bg-white border border-dark-border rounded-xl shadow-xs p-4 sm:p-6 space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-dark pb-3 flex items-center justify-between gap-3 sm:gap-4">
          <div className="shrink-0">
            <UpiLogo className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-dark-secondary">
              Universitas Pendidikan Indonesia
            </h2>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-dark leading-tight">
              SILAT-KICK
            </h1>
            <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-dark-secondary">
              Divisi Monitoring & Evaluasi Pemulihan Atlet Pasca Cedera
            </p>
          </div>
          <div className="shrink-0 text-right font-mono text-[9px] text-dark-secondary">
            <span className="block font-bold text-dark text-xs">ARSIP KLINIS</span>
            <span>{new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {/* Isi Rekomendasi */}
        <Card title="Ringkasan Evaluasi Kesiapan Atlet">
          <div className="p-3.5 sm:p-4 bg-slate-50 border border-dark-border rounded-lg space-y-2.5 text-xs leading-relaxed text-dark">
            <p>
              Berdasarkan uji coba 5 tendangan depan pada sesi <b>{mockSessions[0].sessionCode}</b>, atlet{' '}
              <b>{mockSessions[0].athleteName}</b> menunjukkan kestabilan biomekanika dengan nilai akurasi rata-rata{' '}
              <b>88.4%</b> dan kecepatan rata-rata <b>14.2 m/s</b>.
            </p>
            <p className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2.5 rounded-md">
              Kesimpulan: Atlet dinyatakan memenuhi kriteria fungsional untuk melanjutkan ke fase simulasi tanding (Return to Sport Ready).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};