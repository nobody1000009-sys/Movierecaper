import React from 'react';
import {
  Settings as SettingsIcon,
  X,
  Cpu,
  Sparkles,
  HardDrive,
  Film,
  Sliders,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import type { RecapPreset } from '../types/moviecut';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
  defaultPreset: RecapPreset;
  setDefaultPreset: (preset: RecapPreset) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasApiKey,
  defaultPreset,
  setDefaultPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">MovieCut AI Settings</h2>
              <p className="text-xs text-slate-400">Video encoding & AI engine configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* AI Engine Status */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                AI Multimodal Vision Engine
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  hasApiKey
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {hasApiKey ? 'Gemini 3.8 Flash Online' : 'Heuristic Narrative Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {hasApiKey
                ? 'Server is connected to Google Gemini 3.8 Flash for deep visual frame analysis, character tracking, and 3-act storyline reconstruction.'
                : 'API key not detected in environment. Running with intelligent FFmpeg algorithmic scene detection & dramatic timing heuristics.'}
            </p>
          </div>

          {/* Video Processor Engine */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-violet-400" />
                FFmpeg 4.4 Hardware Encoders
              </span>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                Native Linux CLI
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-950 p-2 border border-white/5">
                <div className="text-[10px] text-slate-500">Video Codec</div>
                <div className="font-mono font-bold text-slate-200">libx264 (H.264)</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-2 border border-white/5">
                <div className="text-[10px] text-slate-500">Audio Codec</div>
                <div className="font-mono font-bold text-slate-200">AAC 48kHz Stereo</div>
              </div>
            </div>
          </div>

          {/* Default Target Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Default Target Recap Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1-min', '3-min', '5-min', '10-min', '15-min'] as RecapPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDefaultPreset(p)}
                  className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all cursor-pointer ${
                    defaultPreset === p
                      ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20'
                      : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
