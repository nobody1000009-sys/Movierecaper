import React from 'react';
import {
  Sparkles,
  Scissors,
  Film,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Layers,
} from 'lucide-react';
import type { ProcessingJob } from '../types/moviecut';
import { formatDuration } from '../utils/formatters';

interface LiveProcessingModalProps {
  job: ProcessingJob | null;
  onCancel: () => void;
  isOpen: boolean;
}

export const LiveProcessingModal: React.FC<LiveProcessingModalProps> = ({
  job,
  onCancel,
  isOpen,
}) => {
  if (!isOpen || !job) return null;

  const steps = [
    { step: 1, name: 'STEP 1: Uploading Video / Initializing' },
    { step: 2, name: 'STEP 2: Extracting Video Frames' },
    { step: 3, name: 'STEP 3: Analyzing Movie Scenes' },
    { step: 4, name: 'STEP 4: Understanding Storyline' },
    { step: 5, name: 'STEP 5: Detecting Important Highlights' },
    { step: 6, name: 'STEP 6: Selecting Best Scenes' },
    { step: 7, name: 'STEP 7: Preparing Video Timeline' },
    { step: 8, name: 'STEP 8: Cutting Individual Clips' },
    { step: 9, name: 'STEP 9: Combining Selected Clips' },
    { step: 10, name: 'STEP 10: Rendering Final Movie Recap' },
  ];

  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';
  const isDone = job.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950 p-6 sm:p-8 shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              {job.type === 'analysis' ? 'AI Storyline Analysis Pipeline' : 'FFmpeg Video Cutting & Render Engine'}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
              {job.stepName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {job.stageDescription}
            </p>
          </div>

          {!isDone && !isFailed && !isCancelled && (
            <button
              onClick={onCancel}
              title="Cancel processing"
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Big Animated Progress Meter */}
        <div className="relative z-10 mt-8 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Total Pipeline Progress</span>
            <span className="text-lg font-bold text-cyan-400">{job.progress}%</span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-white/5 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-300 shadow-md shadow-cyan-500/30"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {job.type === 'analysis' ? (
            <>
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Analyzed Scenes</div>
                <div className="mt-1 text-base font-bold text-white font-mono">
                  {job.scenesAnalyzed || 0} / {job.totalScenesToAnalyze || 12}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Story Context</div>
                <div className="mt-1 text-sm font-bold text-violet-300">Preserved</div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">AI Model</div>
                <div className="mt-1 text-sm font-bold text-cyan-400">Gemini 3.8 Flash</div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Current Step</div>
                <div className="mt-1 text-sm font-bold text-white font-mono">
                  {job.currentStep} of 10
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Completed Clips</div>
                <div className="mt-1 text-base font-bold text-white font-mono">
                  {job.clipsCompleted || 0} / {job.totalClipsToRender || 0}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Clips</div>
                <div className="mt-1 text-base font-bold text-cyan-400 font-mono">
                  {Math.max(0, (job.totalClipsToRender || 0) - (job.clipsCompleted || 0))}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Est. Remaining</div>
                <div className="mt-1 text-base font-bold text-amber-300 font-mono">
                  {job.estimatedSecondsRemaining !== undefined
                    ? `${job.estimatedSecondsRemaining}s`
                    : 'Calculating...'}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Render Step</div>
                <div className="mt-1 text-sm font-bold text-white font-mono">
                  {job.currentStep} of 10
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current Task Detail Pill */}
        {job.currentClipName && (
          <div className="relative z-10 mt-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 flex items-center justify-between text-xs text-cyan-300 font-mono">
            <span>Current Task: {job.currentClipName}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Frame-accurate cutting
            </span>
          </div>
        )}

        {/* Stage Timeline Checklist */}
        <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            10-Stage Autonomous Pipeline
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
            {steps.map((s) => {
              const isPast = s.step < job.currentStep;
              const isCurrent = s.step === job.currentStep;

              return (
                <div
                  key={s.step}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-violet-600/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : isPast
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className="truncate">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error or Cancel status */}
        {isFailed && (
          <div className="relative z-10 mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{job.error || 'Job encountered an unexpected failure.'}</span>
          </div>
        )}

        {/* Footer cancel action */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Background worker guarantees tasks finish safely without browser timeout.
          </span>
          {!isDone && (
            <button
              onClick={onCancel}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 transition-colors cursor-pointer"
            >
              Cancel Processing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
