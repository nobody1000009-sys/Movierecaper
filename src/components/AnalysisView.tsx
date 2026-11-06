import React from 'react';
import {
  Sparkles,
  Layers,
  Users,
  Flame,
  Activity,
  Award,
  ChevronRight,
  Scissors,
  CheckCircle2,
  Clock,
  Sliders,
  Eye,
  Info,
} from 'lucide-react';
import type { MovieProject, SceneData, NarrativeRole } from '../types/moviecut';
import { formatDuration, getRoleBadgeColor } from '../utils/formatters';

interface AnalysisViewProps {
  currentProject: MovieProject;
  onOpenTimeline: () => void;
  onRecalculateSelection: (targetDuration: number) => void;
  onPreviewScene: (scene: SceneData) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  currentProject,
  onOpenTimeline,
  onRecalculateSelection,
  onPreviewScene,
}) => {
  const analysis = currentProject.analysis;
  if (!analysis) return null;

  const selectedScenes = analysis.scenes.filter((s) => s.isSelected);
  const totalSelectedDuration = selectedScenes.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            AI Movie Narrative Intelligence Complete
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Story Analysis: {analysis.movieTitle}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            {analysis.logline}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTimeline}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer"
          >
            <Scissors className="h-4 w-4" />
            Open Timeline Editor
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Narrative Arc 3-Act Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
            Act 1: Setup & Hook
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Introduction & Inciting Incident</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.narrativeArcSummary?.act1 || 'Initial world building, character introductions, and the anomaly that sets the journey in motion.'}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-slate-900/60 p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="text-[11px] font-mono font-bold text-violet-400 uppercase tracking-wider mb-1">
            Act 2: Confrontation
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Rising Stakes & Major Twists</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.narrativeArcSummary?.act2 || 'Intensifying conflicts, crucial conversations, covert operations, and unexpected alliances.'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            Act 3: Resolution
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Climactic Showdown & Conclusion</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.narrativeArcSummary?.act3 || 'Decisive confrontation, core conflict resolution, and the transformation of character arcs.'}
          </p>
        </div>
      </div>

      {/* Character Introductions & Emotional Tension Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Characters */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Detected Key Characters ({analysis.detectedCharacters?.length || 0})
            </h3>
            <span className="text-[10px] text-slate-400">Story Importance</span>
          </div>

          <div className="space-y-2.5">
            {analysis.detectedCharacters?.map((char, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/5 bg-slate-950/70 p-3 flex items-start gap-3 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-300 border border-violet-500/30">
                  {char.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{char.name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-medium">
                      {char.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {char.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emotional Graph */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                Dramatic Tension & Emotional Intensity Curve
              </h3>
              <span className="text-[10px] text-slate-400">0% to 100% Pacing Scale</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tracks the narrative momentum to guarantee the recap captures the highest emotional peaks without lull points.
            </p>
          </div>

          {/* SVG Tension Curve */}
          <div className="relative h-44 w-full rounded-xl bg-slate-950/80 border border-white/5 p-4 flex flex-col justify-end">
            <div className="absolute inset-x-4 top-4 flex justify-between text-[10px] text-slate-500 font-mono">
              <span>00:00 (Setup)</span>
              <span>Midpoint Twist</span>
              <span>Climax</span>
              <span>Ending</span>
            </div>

            <div className="flex items-end justify-between gap-2 h-28 pt-4">
              {analysis.emotionalGraph?.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-white/10 text-white rounded px-2 py-1 text-[10px] whitespace-nowrap z-20 pointer-events-none shadow-xl">
                    <span className="font-bold">{point.label}</span>: {point.intensity}% Intensity
                  </div>

                  <div className="w-full bg-slate-800 rounded-t-sm h-full flex items-end">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-violet-600 via-indigo-500 to-cyan-400 group-hover:brightness-125 transition-all"
                      style={{ height: `${point.intensity}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {formatDuration(point.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analyzed Scenes Table / Grid */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-400" />
              Analyzed Movie Scenes ({analysis.scenes.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked and evaluated by story importance, emotional impact, and cinematic quality.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">
              <strong className="text-cyan-400">{selectedScenes.length}</strong> selected for recap (
              <span className="font-mono text-cyan-300">{formatDuration(totalSelectedDuration)}</span>)
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {analysis.scenes.map((scene) => {
            const colors = getRoleBadgeColor(scene.narrativeRole);
            return (
              <div
                key={scene.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                  scene.isSelected
                    ? 'border-violet-500/40 bg-violet-950/20 shadow-md shadow-violet-950/30'
                    : 'border-white/5 bg-slate-950/50 hover:border-white/15'
                }`}
              >
                {/* Left: Thumbnail & info */}
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <div
                    onClick={() => onPreviewScene(scene)}
                    className="relative h-18 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group"
                  >
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-600">
                        <Eye className="h-5 w-5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-slate-200">
                      {formatDuration(scene.duration)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{scene.sceneNumber}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{scene.title}</h4>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {scene.narrativeRole}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDuration(scene.start)} → {formatDuration(scene.end)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-300 line-clamp-1 leading-relaxed">
                      {scene.plotSignificance}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Reason: <span className="text-slate-300">{scene.reasonForSelection}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right: Scores & Status */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">Score</div>
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        {scene.scores.overallScore} / 100
                      </div>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                      {scene.scores.storyImportance}
                    </div>
                  </div>

                  {scene.isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="h-3 w-3" /> Selected in Recap
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Unselected candidate</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
