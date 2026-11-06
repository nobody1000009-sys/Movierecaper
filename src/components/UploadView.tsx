import React, { useState, useRef } from 'react';
import {
  Upload,
  Film,
  FileVideo,
  Clock,
  HardDrive,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Play,
  Sliders,
  AlertCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import type { MovieProject, RecapPreset } from '../types/moviecut';
import { formatDuration, formatBytes } from '../utils/formatters';

interface UploadViewProps {
  currentProject: MovieProject | null;
  onProjectCreated: (project: MovieProject) => void;
  onStartAnalysis: (projectId: string, targetDuration: number) => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
}


function postJsonXhr(url: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || `Request failed (status ${xhr.status})`));
        } catch {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during request (XHR).'));
    xhr.ontimeout = () => reject(new Error('Request timed out.'));
    xhr.send(JSON.stringify(data));
  });
}

function uploadChunkRawXhr(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunkBlob: Blob
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/upload-chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}`;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ success: true, chunkIndex });
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Chunk upload rejected with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error on chunk ${chunkIndex + 1}/${totalChunks} (Status: ${xhr.status || 'aborted'})`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Chunk ${chunkIndex + 1}/${totalChunks} timed out.`));
    };

    xhr.timeout = 120000;
    xhr.send(chunkBlob);
  });
}

export const UploadView: React.FC<UploadViewProps> = ({
  currentProject,
  onProjectCreated,
  onStartAnalysis,
  onLoadSample,
  isLoadingSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [targetPreset, setTargetPreset] = useState<RecapPreset>('3-min');
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [activeTabMode, setActiveTabMode] = useState<'upload' | 'current'>('upload');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localFileInfo, setLocalFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationPresets: { id: RecapPreset; label: string; seconds: number; desc: string }[] = [
    { id: '1-min', label: '1 Minute', seconds: 60, desc: 'Ultra-fast summary for Shorts & TikTok' },
    { id: '3-min', label: '3 Minutes', seconds: 180, desc: 'Recommended: balanced story recap' },
    { id: '5-min', label: '5 Minutes', seconds: 300, desc: 'Deep-dive narrative breakdown' },
    { id: '10-min', label: '10 Minutes', seconds: 600, desc: 'Extended featurette with key dialogue' },
    { id: '15-min', label: '15 Minutes', seconds: 900, desc: 'Full comprehensive mini-movie' },
    { id: 'custom', label: 'Custom', seconds: customMinutes * 60, desc: 'User-defined duration' },
  ];

  const getTargetSeconds = () => {
    if (targetPreset === 'custom') {
      return Math.max(30, customMinutes * 60);
    }
    const found = durationPresets.find((p) => p.id === targetPreset);
    return found ? found.seconds : 180;
  };

  const [uploadEta, setUploadEta] = useState<string>('');
  const [isUploadPaused, setIsUploadPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  // Perform robust XHR upload for any video size up to 1GB+
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadProgress(0);
    setUploadEta('');
    setIsUploadPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setUploadStatusText('Preparing video for processing...');
    setLocalFileInfo({ name: file.name, size: file.size });

    // Create immediate local object URL for instant preview
    try {
      const blobUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(blobUrl);
    } catch (e) {
      console.warn('Could not create local object URL:', e);
    }

    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for optimal 1GB handling
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();

    try {
      // Stream chunks via raw octet-stream (supports all files from 1MB to 1GB+)
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Check for cancellation
        if (isCancelledRef.current) {
          setUploadStatusText('Upload cancelled.');
          setUploadProgress(null);
          return;
        }

        // Wait if paused
        while (isPausedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
          if (isCancelledRef.current) return;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        // Retry chunk up to 5 times on transient network drops
        let chunkSuccess = false;
        let lastChunkError: any = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await uploadChunkRawXhr(uploadId, chunkIndex, totalChunks, chunkBlob);
            chunkSuccess = true;
            break;
          } catch (chunkErr) {
            lastChunkError = chunkErr;
            const backoff = Math.min(4000, 500 * Math.pow(1.5, attempt));
            setUploadStatusText(`Retrying chunk ${chunkIndex + 1} (Attempt ${attempt + 2}/5)...`);
            await new Promise((r) => setTimeout(r, backoff));
          }
        }

        if (!chunkSuccess) {
          throw new Error(
            lastChunkError?.message || `Chunk ${chunkIndex + 1}/${totalChunks} upload failed after 5 retries.`
          );
        }

        const uploadedBytes = end;
        const percent = Math.round((uploadedBytes / file.size) * 100);
        setUploadProgress(percent);

        const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
        const speedBytesPerSec = uploadedBytes / elapsedSec;
        const speedMBs = (speedBytesPerSec / (1024 * 1024)).toFixed(1);
        setUploadSpeed(`${speedMBs} MB/s`);

        const remainingBytes = file.size - uploadedBytes;
        if (speedBytesPerSec > 0 && remainingBytes > 0) {
          const etaSec = Math.round(remainingBytes / speedBytesPerSec);
          const etaMin = Math.floor(etaSec / 60);
          const etaS = etaSec % 60;
          setUploadEta(`${etaMin}m ${etaS < 10 ? '0' : ''}${etaS}s remaining`);
        } else {
          setUploadEta('Finalizing...');
        }

        setUploadStatusText(
          `Uploading: ${formatBytes(uploadedBytes)} of ${formatBytes(file.size)} (Chunk ${chunkIndex + 1}/${totalChunks})`
        );
      }

      // Finalize and assemble on server with streaming pipe
      setUploadStatusText('Assembling 1GB+ movie stream and analyzing with FFprobe...');
      setUploadProgress(99);
      setUploadEta('Assembling master file...');

      const completeData = await postJsonXhr('/api/upload-complete', {
        uploadId,
        fileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        totalChunks,
      });

      setUploadProgress(100);
      setUploadEta('');
      setUploadStatusText('Movie assembled, verified and ready for AI analysis!');

      if (completeData.project) {
        onProjectCreated(completeData.project);
        setActiveTabMode('current');
      }
    } catch (err: any) {
      console.error('Video upload error:', err);
      setUploadError(err.message || 'Failed to upload video from local device.');
      setUploadProgress(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const meta = currentProject?.movieMetadata;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-cyan-400" />
            Upload Local Movie Video
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select or drag any video file from your computer (MP4, MOV, MKV, WEBM, AVI). Supports long 1h, 2h, and 3h movies.
          </p>
        </div>

        {meta && (
          <div className="flex items-center rounded-xl bg-slate-900 border border-white/10 p-1">
            <button
              onClick={() => setActiveTabMode('upload')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTabMode === 'upload'
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + Upload Another Movie
            </button>
            <button
              onClick={() => setActiveTabMode('current')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTabMode === 'current'
                  ? 'bg-slate-800 text-cyan-300 border border-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Current: {currentProject.title}
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Upload Issue Detected</div>
            <p className="text-xs text-rose-300/90 mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Main Upload Zone */}
      {(!meta || activeTabMode === 'upload') && (
        <div className="space-y-6">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-white/15 bg-slate-900/50 hover:border-violet-500/50 hover:bg-slate-900/80 shadow-2xl'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.ts,.3gp,.flv,.wmv"
              className="hidden"
            />

            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 border border-violet-500/30 text-cyan-400 shadow-xl shadow-violet-500/10">
              <Upload className="h-9 w-9 text-cyan-400 animate-bounce duration-1000" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white">
              Choose a video file from your computer
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
              Drag and drop your local movie file here, or{' '}
              <span className="text-cyan-400 font-semibold underline decoration-cyan-400/50">
                browse files on this device
              </span>.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="rounded-md bg-slate-800/80 border border-white/5 px-2.5 py-1 text-slate-300 font-mono">
                MP4
              </span>
              <span className="rounded-md bg-slate-800/80 border border-white/5 px-2.5 py-1 text-slate-300 font-mono">
                MOV
              </span>
              <span className="rounded-md bg-slate-800/80 border border-white/5 px-2.5 py-1 text-slate-300 font-mono">
                MKV
              </span>
              <span className="rounded-md bg-slate-800/80 border border-white/5 px-2.5 py-1 text-slate-300 font-mono">
                WEBM
              </span>
              <span className="rounded-md bg-slate-800/80 border border-white/5 px-2.5 py-1 text-slate-300 font-mono">
                AVI
              </span>
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-300 font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                1 GB+ Video Certified (Resilient 4MB Chunks)
              </span>
            </div>

            {/* Live Upload Progress */}
            {uploadProgress !== null && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-8 w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-5 text-left space-y-3 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2 max-w-[320px] truncate">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    {uploadStatusText}
                  </span>
                  <span className="font-mono font-bold text-cyan-400 text-sm shrink-0">{uploadProgress}%</span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-white/5 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-200 shadow-md shadow-cyan-500/30"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="truncate max-w-[200px]">File: {localFileInfo?.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {uploadSpeed && <span className="text-cyan-400 font-bold">{uploadSpeed}</span>}
                    {uploadEta && <span>• {uploadEta}</span>}
                  </div>
                </div>

                {/* Pause / Resume / Cancel Controls */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500">
                    Chunked upload prevents timeouts & memory crashes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isUploadPaused;
                        setIsUploadPaused(next);
                        isPausedRef.current = next;
                        setUploadStatusText(next ? 'Upload paused by user' : 'Resuming upload...');
                      }}
                      className="rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isUploadPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        isCancelledRef.current = true;
                        setUploadProgress(null);
                        setUploadStatusText('Upload cancelled');
                      }}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instant Sample Movie Quick Trigger */}
            <div className="mt-8 border-t border-white/10 pt-6 w-full max-w-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Want to test right now with demo footage?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSample();
                  }}
                  disabled={isLoadingSample}
                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer disabled:opacity-50"
                >
                  <Film className="h-3.5 w-3.5" />
                  {isLoadingSample ? 'Generating sample...' : 'Load Sample Movie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Active Movie Card */}
      {meta && activeTabMode === 'current' && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
            {/* Video preview / poster */}
            <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-white/10 shadow-lg">
              {meta.videoUrl && !videoPlaybackError ? (
                <video
                  src={meta.videoUrl}
                  poster={meta.posterUrl}
                  controls
                  onError={() => setVideoPlaybackError(true)}
                  className="h-full w-full object-contain"
                />
              ) : localPreviewUrl && !videoPlaybackError ? (
                <video
                  src={localPreviewUrl}
                  controls
                  onError={() => setVideoPlaybackError(true)}
                  className="h-full w-full object-contain"
                />
              ) : meta.posterUrl ? (
                <div className="relative h-full w-full">
                  <img src={meta.posterUrl} alt={meta.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-3 text-center">
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                      Format: {meta.format.toUpperCase()} (FFmpeg Verified)
                    </span>
                    <span className="text-[10px] text-slate-300 mt-1 max-w-[200px]">
                      Ready for AI Analysis & Recap Editing. Final recap will render in universal H.264 MP4.
                    </span>
                  </div>
                </div>
              ) : (
                <FileVideo className="h-12 w-12 text-slate-600" />
              )}
            </div>

            {/* Video Metadata Inspector */}
            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Loaded & Verified on Server
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1.5">{currentProject.title}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{meta.originalName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTabMode('upload');
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      title="Upload new video"
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-white/20 hover:text-white transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Replace Video
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Duration</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white font-mono">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      {formatDuration(meta.duration)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">File Size</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white font-mono">
                      <HardDrive className="h-3.5 w-3.5 text-violet-400" />
                      {formatBytes(meta.size)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Resolution</div>
                    <div className="mt-1 text-sm font-bold text-white font-mono">
                      {meta.width} × {meta.height}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Codec / FPS</div>
                    <div className="mt-1 text-sm font-bold text-white font-mono">
                      {meta.fps} FPS ({meta.format.toUpperCase()})
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis status prompt */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {currentProject.analysis
                    ? `Analysis complete (${currentProject.analysis.scenes.length} scenes identified)`
                    : 'Awaiting AI narrative scene analysis'}
                </span>
                {currentProject.movieMetadata?.isSample && (
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                    Sample Demo Movie
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Recap Duration Selector (visible when a video is loaded) */}
      {meta && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-cyan-400" />
                Select Target Movie Recap Duration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                AI will optimize scene selections from the full {formatDuration(meta.duration)} movie to fit this exact budget.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {durationPresets.map((preset) => {
              const isSelected = targetPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setTargetPreset(preset.id)}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-gradient-to-b from-cyan-500/20 to-violet-600/20 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:bg-slate-950'
                  }`}
                >
                  <span className="text-base font-bold tracking-tight">{preset.label}</span>
                  <span className="text-[11px] font-mono text-cyan-400 mt-0.5">
                    {preset.id === 'custom' ? `${customMinutes}m 00s` : formatDuration(preset.seconds)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {targetPreset === 'custom' && (
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/80 p-4 max-w-md">
              <label className="text-xs text-slate-300">Custom Duration:</label>
              <input
                type="number"
                min="1"
                max={Math.max(1, Math.floor(meta.duration / 60))}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-xs text-slate-400">minutes ({customMinutes * 60} seconds)</span>
            </div>
          )}

          {/* Trigger Analysis Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => onStartAnalysis(currentProject.id, getTargetSeconds())}
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-cyan-200" />
              {currentProject.analysis ? 'Re-Analyze Movie Scenes' : 'Start AI Movie Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
