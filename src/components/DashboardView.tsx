import React from 'react';
import {
  Sparkles,
  Upload,
  Play,
  Film,
  Clock,
  Layers,
  Scissors,
  CheckCircle2,
  TrendingUp,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Video,
  FileVideo,
} from 'lucide-react';
import type { MovieProject } from '../types/moviecut';
import { formatDuration, formatBytes } from '../utils/formatters';

interface DashboardViewProps {
  onStartUpload: () => void;
  onLoadSample: () => void;
  onOpenProject: (project: MovieProject, tab?: string) => void;
  projects: MovieProject[];
  currentProject: MovieProject | null;
  isLoadingSample: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartUpload,
  onLoadSample,
  onOpenProject,
  projects,
  currentProject,
  isLoadingSample,
}) => {
  const totalRecaps = projects.filter((p) => p.lastRenderedRecap).length;
  const totalDuration = projects.reduce((acc, p) => acc + (p.movieMetadata?.duration || 0), 0);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-8 sm:p-12 shadow-2xl">
        {/* Glow ambient effects */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 mb-6 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Next-Generation Multimodal AI Video Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Turn Long Movies Into{' '}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Perfect Short Recaps
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Let AI find the best moments, understand the story, and create professional movie recap videos automatically.
            Frame-accurate FFmpeg cutting, narrative context preservation, and custom recap durations from 1 to 15 minutes.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={onStartUpload}
              className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer active:scale-95"
            >
              <Upload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Upload Movie Video
            </button>

            <button
              onClick={onLoadSample}
              disabled={isLoadingSample}
              className="flex items-center gap-2.5 rounded-xl border border-cyan-500/40 bg-slate-900/90 px-5 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all cursor-pointer disabled:opacity-50"
            >
              <Film className="h-4 w-4 text-cyan-400" />
              {isLoadingSample ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  Generating Sci-Fi Movie...
                </span>
              ) : (
                'Try Instant Sample Movie'
              )}
            </button>

            {currentProject && (
              <button
                onClick={() => onOpenProject(currentProject, currentProject.lastRenderedRecap ? 'render' : 'timeline')}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-all"
              >
                <Scissors className="h-4 w-4 text-violet-400" />
                Resume Active: <span className="font-semibold text-violet-300 max-w-[120px] truncate">{currentProject.title}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Row */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">1 - 15 Mins</div>
              <div className="text-xs text-slate-400">Smart Duration Engine</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Frame-Accurate</div>
              <div className="text-xs text-slate-400">Native FFmpeg Encoding</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Narrative Flow</div>
              <div className="text-xs text-slate-400">Chronological 3-Act Arc</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Multi-Format</div>
              <div className="text-xs text-slate-400">16:9, 9:16 Shorts & 1:1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Steps Guide */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">How MovieCut AI Creates Recaps</h2>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous 10-step AI video pipeline preserving story continuity without random jumps.
            </p>
          </div>
          <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs text-violet-300">
            Real Backend Processing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 relative group hover:border-violet-500/30 transition-all">
            <div className="text-xs font-mono font-bold text-violet-400 mb-2">STAGE 01 - 03</div>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-3">
              <Upload className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Ingest & Frame Extraction</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Uploads long-form movies (1-3 hrs) and extracts high-fidelity scene keyframes across the timeline with FFprobe.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 relative group hover:border-cyan-500/30 transition-all">
            <div className="text-xs font-mono font-bold text-cyan-400 mb-2">STAGE 04 - 05</div>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Story Arc Understanding</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Gemini 3.8 Flash identifies character arcs, inciting incidents, emotional spikes, and plot twists.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 relative group hover:border-indigo-500/30 transition-all">
            <div className="text-xs font-mono font-bold text-indigo-400 mb-2">STAGE 06 - 07</div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
              <Scissors className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Smart Selection & Timeline</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Knapsack optimizer matches requested target duration while keeping chronological order and dialogue boundaries.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 relative group hover:border-emerald-500/30 transition-all">
            <div className="text-xs font-mono font-bold text-emerald-400 mb-2">STAGE 08 - 10</div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
              <Film className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Server-Side FFmpeg Render</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Cuts individual clips, synchronizes 48kHz audio, concatenates clips seamlessly, and exports web-optimized MP4.
            </p>
          </div>
        </div>
      </div>

      {/* Projects Library / Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Movie Projects</h2>
            <p className="text-xs text-slate-400">Continue editing or download finalized movie recaps</p>
          </div>
          <button
            onClick={onStartUpload}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            + New Movie
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-white/10 text-slate-400 mb-4">
              <FileVideo className="h-7 w-7 text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-white">No movie recap projects yet</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              Upload a long movie or test drive immediately with our pre-built cinematic sci-fi movie.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={onStartUpload}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Upload Video
              </button>
              <button
                onClick={onLoadSample}
                disabled={isLoadingSample}
                className="rounded-lg border border-cyan-500/40 bg-slate-900 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
              >
                Load Sample Movie
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const meta = proj.movieMetadata;
              const hasRecap = !!proj.lastRenderedRecap;
              const hasAnalysis = !!proj.analysis;

              return (
                <div
                  key={proj.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 hover:border-violet-500/40 hover:bg-slate-900 transition-all shadow-lg"
                >
                  {/* Poster / Thumbnail header */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    {meta?.posterUrl ? (
                      <img
                        src={meta.posterUrl}
                        alt={proj.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-600">
                        <Film className="h-10 w-10 opacity-30" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    {/* Duration badge */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-200 backdrop-blur-sm">
                      <Clock className="h-3 w-3 text-cyan-400" />
                      {formatDuration(meta?.duration || 0)}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {hasRecap ? (
                        <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Recap Ready ({formatDuration(proj.lastRenderedRecap?.duration || 0)})
                        </span>
                      ) : hasAnalysis ? (
                        <span className="flex items-center gap-1 rounded-md bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-300 backdrop-blur-sm">
                          <Sparkles className="h-3 w-3 text-violet-400" />
                          {proj.analysis?.scenes.length} Scenes Analyzed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-md bg-slate-800/80 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm">
                          Ready for Analysis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {proj.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span>{meta?.width}x{meta?.height}</span>
                      <span>•</span>
                      <span>{formatBytes(meta?.size || 0)}</span>
                      <span>•</span>
                      <span className="uppercase">{meta?.format}</span>
                    </div>

                    {proj.analysis && (
                      <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {proj.analysis.logline}
                      </p>
                    )}

                    {/* Card Actions Footer */}
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                      {hasRecap ? (
                        <button
                          onClick={() => onOpenProject(proj, 'render')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Watch Recap
                        </button>
                      ) : hasAnalysis ? (
                        <button
                          onClick={() => onOpenProject(proj, 'timeline')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition-colors"
                        >
                          <Scissors className="h-3.5 w-3.5" />
                          Open Timeline
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenProject(proj, 'analysis')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/20"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Analyze Movie
                        </button>
                      )}

                      <button
                        onClick={() => onOpenProject(proj, 'upload')}
                        title="View details"
                        className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
