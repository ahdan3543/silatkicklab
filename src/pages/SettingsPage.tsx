import React from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-dark">Pengaturan Sistem & Parameter Biomekanika</h2>
        <p className="text-xs text-dark-secondary">
          Kalibrasi threshold kecepatan dan toleransi akurasi tendangan silat
        </p>
      </div>

      <Card title="Konfigurasi Standar Penilaian">
        <div className="space-y-4">
          <Input label="Target Kecepatan Minimal (m/s)" defaultValue="13.0" type="number" />
          <Input label="Batas Toleransi Deviasi Titik Impak (cm)" defaultValue="3.0" type="number" />
          <Input label="FPS Default Video Analisis" defaultValue="60" type="number" />
          <div className="pt-2">
            <Button>Simpan Parameter</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};