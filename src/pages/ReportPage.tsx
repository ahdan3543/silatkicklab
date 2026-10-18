import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockSessions } from '../data/mockData';

// Logo UPI lokal untuk UI dan laporan PDF
const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <img
    src="/upi-logo.png"
    alt="Logo Universitas Pendidikan Indonesia"
    className={`${className} object-contain shrink-0`}
    loading="eager"
  />
);

export const ReportPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8 font-sans text-dark print:p-0 print:m-0">
      {/* Header halaman laporan — disamakan dengan Data Atlet dan Analisis */}
      <section className="print:hidden relative overflow-hidden rounded-[24px] border border-red-100 bg-gradient-to-r from-white via-white to-rose-50 min-h-[220px] sm:min-h-[255px] shadow-[0_8px_26px_rgba(15,23,42,.045)]">
        <div className="page-hero-content">
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 tracking-[.16em] text-[#a40000]">SILAT MOTION</span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-500">Laporan</span>
          </div>
          <h1 className="mt-5 text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">Laporan <span className="text-[#a40000]">Hasil Analisis</span></h1>
          <p className="mt-3 max-w-[500px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">Rekapitulasi hasil pengukuran tendangan depan untuk dokumentasi penelitian.</p>
          <div className="mt-5 flex items-center gap-2">
            <Button className="!rounded-full !bg-[#a40000] !px-6 !py-3 !font-bold !text-white shadow-lg shadow-red-900/15 hover:!bg-[#800000]" icon={<Printer size={16} />} onClick={handlePrint}>Cetak</Button>
            <Button className="!rounded-full !bg-white !text-[#a40000] !border !border-red-200 !px-5 !py-3 !font-bold hover:!bg-red-50" icon={<Download size={16} />} onClick={handlePrint}>PDF</Button>
          </div>
        </div>
      </section>

      {/* Lembar Dokumen Rekomendasi Klinis */}
      <div className="bg-white border border-[#800000]/10 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-[#800000] pb-3 flex items-center justify-between gap-3 sm:gap-4">
          <div className="shrink-0">
            <UpiLogo className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Universitas Pendidikan Indonesia
            </h2>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#800000] leading-tight">
              SILAT-KICK
            </h1>
            <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-500">
              Divisi Monitoring & Evaluasi Pemulihan Atlet Pasca Cedera
            </p>
          </div>
          <div className="shrink-0 text-right font-mono text-[9px] text-slate-500">
            <span className="block font-bold text-[#800000] text-xs">ARSIP KLINIS</span>
            <span>{new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {/* Isi Rekomendasi */}
        <Card title="Ringkasan Evaluasi Kesiapan Atlet">
          <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2.5 text-xs leading-relaxed text-slate-900">
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