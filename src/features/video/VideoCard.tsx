import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Video as VideoIcon, RefreshCw, Trash2, Loader2, Play } from 'lucide-react';
import { Attempt, Video, MAX_VIDEO_SIZE_MB, ALLOWED_VIDEO_TYPES } from '../../types';
import { videoStorageService } from '../../services/videoStorageService';

interface VideoCardProps {
  attempt: Attempt;
  onUploadSuccess: (attemptId: string, metadata: Omit<Video, 'id'>, blob: Blob) => Promise<void>;
  onDeleteVideo: (attemptId: string) => Promise<void>;
  onAskReplace: (attemptId: string, file: File) => void;
  onAskDelete: (attemptId: string) => void;
  onOpenAnalysis?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  attempt,
  onUploadSuccess,
  onAskReplace,
  onAskDelete,
  onOpenAnalysis,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video dianggap ada HANYA jika objek video ada DAN memiliki fileName atau fileUrl valid
  const hasVideoMetadata = Boolean(
    attempt.video && (attempt.video.fileUrl || attempt.video.fileName || attempt.video.id)
  );

  useEffect(() => {
    let currentObjectUrl: string | null = null;
    let isMounted = true;

    const loadBlob = async () => {
      if (hasVideoMetadata) {
        try {
          setIsLoadingBlob(true);
          const blob = await videoStorageService.getVideoBlob(attempt.id);
          if (!isMounted) return;

          if (blob) {
            currentObjectUrl = URL.createObjectURL(blob);
            setVideoUrl(currentObjectUrl);
          } else if (attempt.video?.fileUrl) {
            setVideoUrl(attempt.video.fileUrl);
          } else {
            setVideoUrl(null);
          }
        } catch {
          if (isMounted) setVideoUrl(null);
        } finally {
          if (isMounted) setIsLoadingBlob(false);
        }
      } else {
        setVideoUrl(null);
      }
    };

    loadBlob();

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [hasVideoMetadata, attempt.id, attempt.video?.fileUrl]);

  // Status final: benar-benar ada url video atau sedang loading file yang valid
  const isVideoAvailable = Boolean(hasVideoMetadata && (videoUrl || isLoadingBlob));

  const extractVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const tempUrl = URL.createObjectURL(file);
      tempVideo.src = tempUrl;
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        resolve(tempVideo.duration || 0);
      };
      tempVideo.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve(0);
      };
    });
  };

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      setErrorMessage('Gunakan format MP4 atau WebM.');
      return;
    }

    const maxSizeBytes = MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`Ukuran maksimal ${MAX_VIDEO_SIZE_MB} MB.`);
      return;
    }

    if (isVideoAvailable) {
      onAskReplace(attempt.id, file);
      return;
    }

    try {
      setIsProcessingFile(true);
      const duration = await extractVideoDuration(file);
      await onUploadSuccess(
        attempt.id,
        {
          attemptId: attempt.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'video/mp4',
          durationSeconds: duration,
          uploadedAt: new Date().toISOString(),
          status: 'ready',
        },
        file
      );
    } catch {
      setErrorMessage('Gagal memproses file video.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileProcess(files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:border-slate-300">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
      />

      {/* Header Kecil Percobaan */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <span className="text-[11px] font-bold text-slate-800">
          Percobaan #{attempt.attemptNumber}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            isVideoAvailable ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
          }`}
          title={isVideoAvailable ? 'Video Tersedia' : 'Belum Ada Video'}
        />
      </div>

      {/* Thumbnail Video ATAU Dropzone Upload */}
      <div className="p-2">
        {isVideoAvailable ? (
          <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center group/thumb">
            {isLoadingBlob ? (
              <Loader2 size={18} className="animate-spin text-slate-400" />
            ) : videoUrl ? (
              <>
                <video
                  src={videoUrl}
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
                {onOpenAnalysis && (
                  <button
                    type="button"
                    onClick={onOpenAnalysis}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                    title="Buka Analisis"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#800000] text-white flex items-center justify-center shadow-md">
                      <Play size={14} className="ml-0.5" fill="white" />
                    </div>
                  </button>
                )}
              </>
            ) : (
              <VideoIcon size={20} className="text-slate-600" />
            )}

            {/* Aksi Cepat (Ganti & Hapus) */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-xs p-0.5 rounded-md opacity-0 group-hover/thumb:opacity-100 sm:group-hover/thumb:opacity-100 max-sm:opacity-100 transition-opacity z-10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Ganti Video"
              >
                <RefreshCw size={11} />
              </button>
              <button
                type="button"
                onClick={() => onAskDelete(attempt.id)}
                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                title="Hapus Video"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ) : (
          /* Tampilan Kosong Jika Belum Ada Video */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-lg border border-dashed flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#800000] bg-[#800000]/5'
                : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70'
            }`}
          >
            {isProcessingFile ? (
              <Loader2 size={18} className="animate-spin text-[#800000]" />
            ) : (
              <>
                <UploadCloud size={18} className="text-slate-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700">Unggah Video</span>
                <span className="text-[9px] text-slate-400">MP4 / WebM</span>
              </>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="text-[10px] text-rose-600 mt-1 leading-tight text-center font-medium">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};