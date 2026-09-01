import React from 'react';
import { Printer, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockSessions } from '../data/mockData';

export const ReportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Laporan & Rekomendasi Klinis</h2>
          <p className="text-xs text-dark-secondary">
            Cetak rekapitulasi data ilmiah untuk arsip tim medis dan pelatih
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Printer size={16} />}>Cetak</Button>
          <Button icon={<Download size={16} />}>Ekspor PDF</Button>
        </div>
      </div>

      <Card title="Ringkasan Evaluasi Kesiapan Atlet">
        <div className="p-4 bg-slate-50 border border-dark-border rounded-lg space-y-2 text-xs leading-relaxed text-dark">
          <p>
            Berdasarkan uji coba 5 tendangan depan pada sesi <b>{mockSessions[0].sessionCode}</b>, atlet <b>{mockSessions[0].athleteName}</b> menunjukkan kestabilan biomekanika dengan nilai akurasi rata-rata <b>88.4%</b> dan kecepatan rata-rata <b>14.2 m/s</b>.
          </p>
          <p className="text-emerald-700 font-semibold">
            Kesimpulan: Atlet dinyatakan memenuhi kriteria fungsional untuk melanjutkan ke fase simulasi tanding (Return to Sport Ready).
          </p>
        </div>
      </Card>
    </div>
  );
};