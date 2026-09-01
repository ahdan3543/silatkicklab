import React from 'react';
import { Play, Video as VideoIcon } from 'lucide-react';

interface VideoPlaceholderProps {
  fileName?: string;
  attemptNumber: number;
}

export const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({
  fileName,
  attemptNumber,
}) => {
  return (
    <div className="relative aspect-video bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden border border-slate-800">
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] tracking-wider uppercase font-semibold text-accent">
        Percobaan {attemptNumber}
      </div>
      {fileName ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform">
            <Play size={18} className="ml-0.5" />
          </div>
          <p className="text-xs text-slate-300 font-mono">{fileName}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-slate-500 gap-1.5">
          <VideoIcon size={24} />
          <p className="text-xs">Video Belum Diunggah</p>
        </div>
      )}
    </div>
  );
};