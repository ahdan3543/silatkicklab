import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Video as VideoIcon, RefreshCw, Trash2, FileVideo, Clock, HardDrive, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Attempt, Video, MAX_VIDEO_SIZE_MB, ALLOWED_VIDEO_TYPES } from '../../types';
import { videoStorageService } from '../../services/videoStorageService';
import { formatFileSize, formatDuration } from '../../utils/formatters';

interface VideoCardProps {
  attempt: Attempt;
  onUploadSuccess: (attemptId: string, metadata: Omit<Video, 'id'>, blob: Blob) => Promise<void>;
  onDeleteVideo: (attemptId: string) => Promise<void>;
  onAskReplace: (attemptId: string, file: File) => void;
  onAskDelete: (attemptId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  attempt,
  onUploadSuccess,
  onAskReplace,
  onAskDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasVideo = Boolean(attempt.video);

  // Memuat file video biner dari IndexedDB
  useEffect(() => {
    let currentObjectUrl: string | null = null;

    const loadBlob = async () => {
      if (hasVideo) {
        try {
          setIsLoadingBlob(true);
          const blob = await videoStorageService.getVideoBlob(attempt.id);
          if (blob) {
            currentObjectUrl = URL.createObjectURL(blob);
            setVideoUrl(currentObjectUrl);
          } else if (attempt.video?.fileUrl) {
            setVideoUrl(attempt.video.fileUrl);
          }
        } catch {
          setErrorMessage('Gagal memuat preview video.');
        } finally {
          setIsLoadingBlob(false);
        }
      } else {
        setVideoUrl(null);
      }
    };

    loadBlob();

    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [hasVideo, attempt.id, attempt.video?.fileUrl]);

  // Ekstraksi durasi metadata menggunakan temporary element
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

    // 1. Validasi MIME Type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      setErrorMessage('Format video tidak didukung. Gunakan MP4, WebM, atau MOV.');
      return;
    }

    // 2. Validasi Ukuran File
    const maxSizeBytes = MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`Ukuran video terlalu besar. Maksimal ${MAX_VIDEO_SIZE_MB} MB.`);
      return;
    }

    // 3. Konfirmasi jika sudah ada video
    if (hasVideo) {
      onAskReplace(attempt.id, file);
      return;
    }

    // 4. Proses Upload Baru
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
      setErrorMessage('Gagal menyimpan file video.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileProcess(files[0]);
    }
    // Reset file input value agar dapat memilih file yang sama jika diperlukan
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card className="flex flex-col justify-between p-4 space-y-3 bg-white">
      {/* Header Card */}
      <div className="flex items-center justify-between pb-2 border-b border-dark-border">
        <span className="text-xs font-bold text-dark tracking-wide">
          PERCOBAAN #{attempt.attemptNumber}
        </span>
        <Badge variant={hasVideo ? 'success' : 'neutral'}>
          {hasVideo ? '● Video Tersedia' : 'Belum Diunggah'}
        </Badge>
      </div>

      {/* Video Preview / Upload Dropzone */}
      <div className="space-y-2">
        {hasVideo ? (
          <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
            {isLoadingBlob ? (
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <Loader2 size={22} className="animate-spin text-accent" />
                <span className="text-[11px]">Memuat file video...</span>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-500">
                <VideoIcon size={24} />
                <span className="text-[10px]">Preview tidak tersedia</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-dark-border bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {isProcessingFile ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-medium">Menyimpan video...</span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-white shadow-subtle border border-dark-border flex items-center justify-center text-dark-secondary mb-1.5">
                  <UploadCloud size={18} />
                </div>
                <p className="text-xs font-semibold text-dark">Drag & drop video di sini</p>
                <p className="text-[10px] text-dark-secondary mt-0.5">atau klik untuk memilih file (MP4, WebM)</p>
              </>
            )}
          </div>
        )}

        {/* Video Metadata Information */}
        {hasVideo && attempt.video && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-dark-border/80 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-dark truncate">
              <FileVideo size={13} className="text-primary shrink-0" />
              <span className="truncate font-mono" title={attempt.video.fileName}>
                {attempt.video.fileName}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-dark-secondary pt-0.5">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span>{formatDuration(attempt.video.durationSeconds)}</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive size={11} />
                <span>{formatFileSize(attempt.video.fileSize)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Pesan Error */}
        {errorMessage && (
          <p className="text-[11px] text-red-600 font-medium leading-tight">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Input File Tersembunyi */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
      />

      {/* Tombol Aksi */}
      <div className="pt-1">
        {hasVideo ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              icon={<RefreshCw size={13} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Ganti
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-700 hover:bg-red-50 hover:border-red-200"
              icon={<Trash2 size={13} />}
              onClick={() => onAskDelete(attempt.id)}
            >
              Hapus
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full text-xs"
            icon={<UploadCloud size={14} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
          >
            {isProcessingFile ? 'Menyimpan...' : 'Upload Video'}
          </Button>
        )}
      </div>
    </Card>
  );
};