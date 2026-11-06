import React, { useState, useRef } from 'react';
import {
  Download,
  Film,
  Play,
  Scissors,
  RotateCcw,
  Plus,
  Clock,
  HardDrive,
  CheckCircle2,
  Sliders,
  Sparkles,
  Layers,
  Smartphone,
  Tv,
  Square,
  Share2,
  QrCode,
  Copy,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from 'lucide-react';
import type { MovieProject, RecapSettings } from '../types/moviecut';
import { formatDuration, formatBytes } from '../utils/formatters';

interface RenderPreviewViewProps {
  currentProject: MovieProject;
  onOpenTimeline: () => void;
  onNewProject: () => void;
  onReRender: (settings: RecapSettings) => void;
  isRendering: boolean;
}

export const RenderPreviewView: React.FC<RenderPreviewViewProps> = ({
  currentProject,
  onOpenTimeline,
  onNewProject,
  onReRender,
  isRendering,
}) => {
  const recap = currentProject.lastRenderedRecap;
  const meta = currentProject.movieMetadata;

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(
    (recap?.aspectRatio as any) || '16:9'
  );
  const [resolution, setResolution] = useState<'1080p' | '720p'>(
    (recap?.resolution as any) || '1080p'
  );
  const [transition, setTransition] = useState<'cut' | 'fade'>('cut');

  const [isSavingToPhone, setIsSavingToPhone] = useState(false);
  const [phoneSaveStatus, setPhoneSaveStatus] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showPhoneHelp, setShowPhoneHelp] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  if (!recap) {
    return (
      <div className="mx-auto max-w-4xl text-center py-20 space-y-4">
        <Film className="h-16 w-16 mx-auto text-slate-600" />
        <h2 className="text-xl font-bold text-white">No Final Render Yet</h2>
        <p className="text-xs text-slate-400">
          Prepare your scenes in the timeline editor and hit "Proceed to Render" to generate your first movie recap.
        </p>
        <button
          onClick={onOpenTimeline}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors cursor-pointer"
        >
          Open Timeline Editor
        </button>
      </div>
    );
  }

  // Generate mobile-compatible direct attachment download URL
  const getDirectDownloadUrl = () => {
    if (!recap) return '';
    if (recap.downloadUrl?.startsWith('/api/download')) {
      return recap.downloadUrl;
    }
    const filename = recap.videoUrl.split('/').pop() || 'recap.mp4';
    const safeTitle = (currentProject.title || 'MovieCut').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `/api/download?file=renders/${filename}&name=${encodeURIComponent(safeTitle)}_Recap.mp4`;
  };

  const directDownloadUrl = getDirectDownloadUrl();
  const absoluteDownloadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${directDownloadUrl}`
      : directDownloadUrl;

  // Handle saving video directly to mobile phone storage / Photos app
  const handleSaveToPhone = async () => {
    if (!recap) return;
    setIsSavingToPhone(true);
    setPhoneSaveStatus('Fetching video for phone storage...');

    try {
      const filename = `MovieCut_${currentProject.title.replace(/\s+/g, '_')}_Recap.mp4`;
      const videoSrc = recap.videoUrl;

      // Fetch video as blob
      const response = await fetch(videoSrc);
      if (!response.ok) {
        throw new Error(`Failed to load video stream (status ${response.status})`);
      }
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'video/mp4' });

      // Check if native Web Share is supported with files (iOS Safari, Android Chrome)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        setPhoneSaveStatus('Opening phone menu (Tap "Save Video" to save to Photos)...');
        await navigator.share({
          files: [file],
          title: recap.title,
          text: `MovieCut AI Recap: ${currentProject.title} (${formatDuration(recap.duration)})`,
        });
        setPhoneSaveStatus('Saved! Check your Photos/Gallery or Files.');
      } else {
        // Fallback: Trigger direct download using blob URL
        setPhoneSaveStatus('Downloading directly into phone storage...');
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        setPhoneSaveStatus('Download completed! Check Downloads/Files.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setPhoneSaveStatus('');
      } else {
        console.warn('Share/Save error, falling back to direct download link:', err);
        // Fallback to direct download endpoint
        const a = document.createElement('a');
        a.href = directDownloadUrl;
        a.download = `MovieCut_${currentProject.title.replace(/\s+/g, '_')}_Recap.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setPhoneSaveStatus('Download initiated via browser.');
      }
    } finally {
      setTimeout(() => {
        setIsSavingToPhone(false);
        setPhoneSaveStatus('');
      }, 4000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(absoluteDownloadUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleApplyReRender = () => {
    onReRender({
      ...currentProject.activeSettings,
      aspectRatio,
      resolution,
      transition,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Title & Download Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Recap Render Completed & Ready for Phone Download
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            {recap.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Frame-accurate cut from {formatDuration(meta.duration)} original movie to {formatDuration(recap.duration)} short recap.
          </p>
        </div>

        {/* Action Buttons: Phone Save, Direct Download, Scan QR, Re-edit */}
        <div className="flex flex-wrap items-center gap-3">
          {/* PRIMARY: Save to Phone Storage / Photos */}
          <button
            onClick={handleSaveToPhone}
            disabled={isSavingToPhone}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-cyan-400 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download directly to phone gallery / storage"
          >
            <Smartphone className="h-4 w-4" />
            {isSavingToPhone ? 'Saving to Phone...' : 'Save to Phone (ဖုန်းထဲသိမ်းမည်)'}
          </button>

          {/* SECONDARY: Direct Browser Download */}
          <a
            href={directDownloadUrl}
            download={`MovieCut_${currentProject.title.replace(/\s+/g, '_')}_Recap.mp4`}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            title="Direct MP4 download link"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Download MP4 ({formatBytes(recap.fileSize)})
          </a>

          {/* QR Code trigger for downloading on phone from PC */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            title="Scan QR code with your phone camera"
          >
            <QrCode className="h-4 w-4 text-violet-400" />
            <span className="hidden sm:inline">Scan to Phone</span>
          </button>

          <button
            onClick={onOpenTimeline}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <Scissors className="h-4 w-4" />
            <span className="hidden sm:inline">Re-edit</span>
          </button>
        </div>
      </div>

      {/* Phone Saving Status Toast / Banner */}
      {phoneSaveStatus && (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-xs font-medium text-cyan-200 animate-in fade-in slide-in-from-top-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="flex-1">{phoneSaveStatus}</span>
        </div>
      )}

      {/* Mobile Storage Instructions Guide Card */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-4 sm:p-5 backdrop-blur-sm">
        <div
          onClick={() => setShowPhoneHelp(!showPhoneHelp)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Phone Storage Download Guide (ဖုန်းထဲတွင် သိမ်းဆည်းနည်း)
              </h3>
              <p className="text-[11px] text-slate-400">
                Instructions for saving video directly into iPhone Photos / Camera Roll or Android Gallery
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {showPhoneHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showPhoneHelp && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* iOS Section */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">iOS</span>
                iPhone / iPad (Apple Photos & Files)
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-emerald-400">"Save to Phone"</strong> ကို နှိပ်ပြီး iOS Share Menu ပေါ်လာပါက <strong className="text-white">"Save Video"</strong> ကို ရွေးပါ။ (ဗီဒီယိုသည် <span className="underline decoration-emerald-400">Photos / Camera Roll</span> ထဲသို့ တိုက်ရိုက်ရောက်သွားပါမည်)။
                </li>
                <li>
                  သို့မဟုတ် <strong className="text-white">"Save to Files"</strong> ကို ရွေး၍ iCloud Drive သို့မဟုတ် iPhone Downloads ထဲတွင် သိမ်းနိုင်ပါသည်။
                </li>
              </ul>
            </div>

            {/* Android Section */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px]">Android</span>
                Android Phone (Google Photos & Gallery)
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-emerald-400">"Save to Phone"</strong> သို့မဟုတ် <strong className="text-cyan-400">"Download MP4"</strong> ကို နှိပ်ပါက ဖုန်း၏ <span className="underline decoration-cyan-400">Downloads</span> သို့မဟုတ် <span className="underline decoration-cyan-400">Movies / Gallery</span> ထဲသို့ တိုက်ရိုက်သိမ်းဆည်းပေးမည် ဖြစ်ပါသည်။
                </li>
                <li>
                  ဖုန်း၏ "Files" app သို့မဟုတ် "Gallery" app ထဲတွင် ချက်ချင်း ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Video Player & Metadata Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Final Video Player */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-white/10 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="relative aspect-video w-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={recap.videoUrl}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          </div>

          <div className="p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">Codec:</span>
              <span className="font-mono text-cyan-400">H.264 / AAC (Universal Mobile Format)</span>
              <span>•</span>
              <span className="font-mono text-slate-400">{recap.resolution}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">{recap.aspectRatio}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{recap.compressionRatio}</span>
            </div>
          </div>
        </div>

        {/* Video Statistics & Specs */}
        <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-cyan-400" />
              Recap Statistics
            </h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">Final Recap Duration</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {formatDuration(recap.duration)}
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">Original Movie Duration</span>
                <span className="text-sm font-bold text-slate-300 font-mono">
                  {formatDuration(meta.duration)}
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">Scenes Selected</span>
                <span className="text-sm font-bold text-violet-300 font-mono">
                  {recap.sceneCount} Scenes
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">File Size</span>
                <span className="text-sm font-bold text-white font-mono">
                  {formatBytes(recap.fileSize)}
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">Time Saved by Viewer</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {formatDuration(Math.max(0, meta.duration - recap.duration))}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <button
              onClick={handleSaveToPhone}
              disabled={isSavingToPhone}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
            >
              <Smartphone className="h-4 w-4" />
              Download to Phone Storage
            </button>
            <button
              onClick={onNewProject}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Start New Movie Recap Project
            </button>
          </div>
        </div>
      </div>

      {/* Export Settings Panel: Format & Aspect Ratio Converter */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-violet-400" />
            Re-Render with Different Export Settings
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Need a vertical format for YouTube Shorts, Instagram Reels, or TikTok? Switch aspect ratios and re-render with 1 click.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="h-4 w-4 mb-1" />
                <span className="text-xs font-bold">16:9</span>
                <span className="text-[9px] text-slate-400">Landscape</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-4 w-4 mb-1" />
                <span className="text-xs font-bold">9:16</span>
                <span className="text-[9px] text-slate-400">Shorts / TikTok</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="h-4 w-4 mb-1" />
                <span className="text-xs font-bold">1:1</span>
                <span className="text-[9px] text-slate-400">Square</span>
              </button>
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  resolution === '1080p'
                    ? 'border-violet-500 bg-violet-600/20 text-white'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">1080p Full HD</div>
                <div className="text-[10px] text-slate-400">Crisp Master Quality</div>
              </button>

              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${
                  resolution === '720p'
                    ? 'border-violet-500 bg-violet-600/20 text-white'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">720p HD</div>
                <div className="text-[10px] text-slate-400">Fast Lightweight Render</div>
              </button>
            </div>
          </div>

          {/* Render Action button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleApplyReRender}
              disabled={isRendering}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {isRendering ? 'Rendering in background...' : 'Re-Render with These Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Assembly Breakdown List */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          Final Recap Assembly Breakdown ({recap.scenesSummary?.length || 0} Clips)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recap.scenesSummary?.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 flex items-start gap-3"
            >
              <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-400 shrink-0">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{item.title}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{item.role}</span>
                  <span className="text-cyan-400 font-bold">{formatDuration(item.duration)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal for Phone Download */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-slate-900 p-6 text-center shadow-2xl space-y-4">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <QrCode className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Scan to Download on Phone</h3>
              <p className="text-xs text-slate-400 mt-1">
                Open your iPhone Camera or Android QR scanner to download this recap directly to your phone.
              </p>
            </div>

            {/* QR Code image generated for absolute download URL */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(absoluteDownloadUrl)}`}
                alt="QR Code for phone download"
                className="h-44 w-44 mx-auto"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 p-2 text-xs text-slate-300">
                <input
                  type="text"
                  readOnly
                  value={absoluteDownloadUrl}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-400 focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 shrink-0 cursor-pointer"
                >
                  {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <a
                href={directDownloadUrl}
                download={`MovieCut_${currentProject.title.replace(/\s+/g, '_')}_Recap.mp4`}
                className="block w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                Download on this device now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
