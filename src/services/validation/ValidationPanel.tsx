import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { SessionQualityReport, ValidationStatus } from '../../types/validation';

interface ValidationPanelProps {
  qualityReport: SessionQualityReport | null;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ qualityReport }) => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  if (!qualityReport) return null;

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'VALID':
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
      case 'INCOMPLETE':
        return <Clock size={16} className="text-sky-500 shrink-0" />;
      case 'ERROR':
        return <XCircle size={16} className="text-red-500 shrink-0" />;
    }
  };

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'VALID':
        return <Badge variant="success">VALID</Badge>;
      case 'WARNING':
        return <Badge variant="warning">WARNING</Badge>;
      case 'INCOMPLETE':
        return <Badge variant="info">INCOMPLETE</Badge>;
      case 'ERROR':
        return <Badge variant="primary">ERROR</Badge>;
    }
  };

  const currentStatus = qualityReport.overallStatus;

  return (
    <Card className="border-t-4 border-t-primary">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dark-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-dark flex items-center gap-2">
              <FileCheck size={18} className="text-primary" /> Status Validasi & Quality Control
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border font-mono ${
                currentStatus === 'READY'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : currentStatus === 'WARNING'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : currentStatus === 'INCOMPLETE'
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              STATUS: {currentStatus}
            </span>
          </div>
          <p className="text-xs text-dark-secondary mt-0.5">
            Verifikasi integritas dataset 5 percobaan tendangan sebelum diekspor ke laporan skripsi
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(true)}>
          Buka Audit Detail ({qualityReport.items.length} Item)
        </Button>
      </div>

      {/* Grid Status Kategori Sistem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 my-4">
        {qualityReport.categories.map((cat) => (
          <div
            key={cat.category}
            className="p-2.5 bg-slate-50 border border-dark-border rounded-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider">
                  {cat.title}
                </span>
                {getStatusIcon(cat.status)}
              </div>
              <p className="text-xs font-semibold text-dark truncate" title={cat.message}>
                {cat.message}
              </p>
            </div>
            <div className="mt-2 pt-1 border-t border-dark-border/50 text-[10px] font-mono text-dark-secondary flex justify-between">
              <span>Status:</span>
              <span className="font-bold">{cat.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Indikator Kelengkapan & Status Spesifik */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-dark-border text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono shrink-0">
            {qualityReport.completenessPercentage}%
          </div>
          <div>
            <span className="font-semibold text-dark block">
              Kelengkapan Dataset Analisis ({qualityReport.completenessPercentage}%)
            </span>
            <span className="text-dark-secondary text-[11px]">
              Video: {qualityReport.counts.videoCount}/5 • Pose: {qualityReport.counts.poseCount}/5 • Kecepatan: {qualityReport.counts.speedCount}/5 • Akurasi: {qualityReport.counts.accuracyCount}/5
            </span>
          </div>
        </div>

        <div className="text-right w-full sm:w-auto">
          {currentStatus === 'READY' && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <CheckCircle2 size={14} /> Analisis siap dibuat menjadi laporan
            </span>
          )}
          {currentStatus === 'WARNING' && (
            <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-3 py-1.5 rounded-md border border-amber-300">
              <AlertTriangle size={14} /> Perlu kalibrasi skala fisik untuk satuan m/s
            </span>
          )}
          {currentStatus === 'INCOMPLETE' && (
            <span className="inline-flex items-center gap-1.5 text-sky-700 font-semibold bg-sky-50 px-3 py-1.5 rounded-md border border-sky-200">
              <Clock size={14} /> Analisis belum lengkap ({qualityReport.completenessPercentage}%)
            </span>
          )}
          {currentStatus === 'ERROR' && (
            <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
              <XCircle size={14} /> Terdapat error data yang perlu diperbaiki
            </span>
          )}
        </div>
      </div>

      {/* Modal Audit Validasi */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Audit Validasi & Integritas Data Sesi"
        footer={
          <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
            Tutup Audit
          </Button>
        }
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-dark leading-relaxed">
            <span className="font-bold text-primary block mb-0.5">Prinsip Audit Quality Control:</span>
            Pemeriksaan memverifikasi bahwa setiap metrik kecepatan, durasi, dan simpangan akurasi memiliki data frame dan koordinat landmark pendukung yang valid secara relasional.
          </div>

          <div className="divide-y divide-dark-border/60 border border-dark-border rounded-lg overflow-hidden bg-white">
            {qualityReport.items.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-dark font-mono text-[11px]">
                        [{item.category}]
                      </span>
                      {item.attemptNumber && (
                        <span className="font-semibold text-primary">
                          Percobaan #{item.attemptNumber}
                        </span>
                      )}
                      {item.code && (
                        <span className="text-[10px] font-mono text-dark-secondary bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                      )}
                    </div>
                    <p className="text-dark-secondary mt-0.5">{item.message}</p>
                  </div>
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Card>
  );
};