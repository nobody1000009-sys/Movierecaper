import React, { useState, useRef } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  Film,
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MovieProject, SceneData } from '../types/moviecut';
import { formatDuration, getRoleBadgeColor } from '../utils/formatters';

interface TimelineEditorViewProps {
  currentProject: MovieProject;
  onUpdateScenes: (scenes: SceneData[]) => void;
  onRestoreOriginal: () => void;
  onProceedToRender: () => void;
  targetDuration: number;
}

export const TimelineEditorView: React.FC<TimelineEditorViewProps> = ({
  currentProject,
  onUpdateScenes,
  onRestoreOriginal,
  onProceedToRender,
  targetDuration,
}) => {
  const analysis = currentProject.analysis;
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAddCandidates, setShowAddCandidates] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const scenes = currentProject.selectedScenes || [];
  const allScenes = analysis?.scenes || [];
  const unselectedScenes = allScenes.filter((s) => !scenes.some((sel) => sel.id === s.id));

  // Compute total duration of currently selected clips (taking into account custom trims)
  const currentTotalDuration = scenes.reduce((acc, s) => {
    const sStart = s.customTrimStart !== undefined ? s.customTrimStart : s.start;
    const sEnd = s.customTrimEnd !== undefined ? s.customTrimEnd : s.end;
    return acc + Math.max(0.5, sEnd - sStart);
  }, 0);

  const activeScene = scenes[selectedSceneIndex] || scenes[0];

  const handlePlayScene = (scene: SceneData, index: number) => {
    setSelectedSceneIndex(index);
    if (videoRef.current) {
      const sStart = scene.customTrimStart !== undefined ? scene.customTrimStart : scene.start;
      videoRef.current.currentTime = sStart;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeScene) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    const sEnd = activeScene.customTrimEnd !== undefined ? activeScene.customTrimEnd : activeScene.end;
    if (cur >= sEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (activeScene) {
        const sStart = activeScene.customTrimStart !== undefined ? activeScene.customTrimStart : activeScene.start;
        const sEnd = activeScene.customTrimEnd !== undefined ? activeScene.customTrimEnd : activeScene.end;
        if (videoRef.current.currentTime < sStart || videoRef.current.currentTime >= sEnd) {
          videoRef.current.currentTime = sStart;
        }
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const newScenes = [...scenes];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newScenes.length) return;

    const tmp = newScenes[index];
    newScenes[index] = newScenes[targetIdx];
    newScenes[targetIdx] = tmp;

    onUpdateScenes(newScenes);
    setSelectedSceneIndex(targetIdx);
  };

  const handleRemoveScene = (id: string) => {
    const newScenes = scenes.filter((s) => s.id !== id);
    onUpdateScenes(newScenes);
    if (selectedSceneIndex >= newScenes.length) {
      setSelectedSceneIndex(Math.max(0, newScenes.length - 1));
    }
  };

  const handleAddScene = (scene: SceneData) => {
    const newScenes = [...scenes, { ...scene, isSelected: true }];
    // Sort chronologically by original start time
    newScenes.sort((a, b) => a.start - b.start);
    onUpdateScenes(newScenes);
  };

  const handleTrimChange = (
    sceneId: string,
    field: 'customTrimStart' | 'customTrimEnd',
    value: number
  ) => {
    const newScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const curStart = s.customTrimStart !== undefined ? s.customTrimStart : s.start;
      const curEnd = s.customTrimEnd !== undefined ? s.customTrimEnd : s.end;

      if (field === 'customTrimStart') {
        const validatedStart = Math.min(value, curEnd - 1);
        return { ...s, customTrimStart: Math.max(s.start, Math.round(validatedStart * 10) / 10) };
      } else {
        const validatedEnd = Math.max(value, curStart + 1);
        return { ...s, customTrimEnd: Math.min(s.end, Math.round(validatedEnd * 10) / 10) };
      }
    });

    onUpdateScenes(newScenes);
  };

  const durationDiff = Math.abs(currentTotalDuration - targetDuration);
  const isWithinBudget = durationDiff <= 15;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header bar with Duration Budget & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scissors className="h-5 w-5 text-cyan-400" />
            Scene-by-Scene Timeline Editor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fine-tune trim points, reorder clips, or swap candidate scenes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Duration Meter */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Recap Duration</div>
              <div className="flex items-center gap-1.5 text-sm font-mono font-bold">
                <span className={isWithinBudget ? 'text-cyan-400' : 'text-amber-400'}>
                  {formatDuration(currentTotalDuration)}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{formatDuration(targetDuration)}</span>
              </div>
            </div>
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isWithinBudget ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>

          <button
            onClick={onRestoreOriginal}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore AI Selection
          </button>

          <button
            onClick={onProceedToRender}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer"
          >
            <Film className="h-4 w-4" />
            Proceed to Render ({scenes.length} Scenes)
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Work Area: Video Player & Active Scene Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-white/10 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="relative aspect-video w-full bg-black flex items-center justify-center">
            {currentProject.movieMetadata?.videoUrl ? (
              <video
                ref={videoRef}
                src={currentProject.movieMetadata.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                muted={isMuted}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-xs text-slate-500">Video preview not loaded</div>
            )}

            {/* Custom Overlay Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <span className="font-mono text-slate-300">
                  {formatDuration(currentTime)} / {formatDuration(currentProject.movieMetadata.duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-slate-300 hover:text-white"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active scene meta bar */}
          {activeScene && (
            <div className="p-4 bg-slate-900/90 border-t border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    Scene #{activeScene.sceneNumber}
                  </span>
                  <span className="text-sm font-bold text-white">{activeScene.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{activeScene.plotSignificance}</p>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Trim Duration</div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  {formatDuration(
                    (activeScene.customTrimEnd ?? activeScene.end) -
                      (activeScene.customTrimStart ?? activeScene.start)
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trim Controls for active scene */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-violet-400" />
                Scene Trim Adjuster
              </h3>
              {activeScene && (
                <span className="text-[10px] font-mono text-slate-400">
                  Original: {formatDuration(activeScene.start)} → {formatDuration(activeScene.end)}
                </span>
              )}
            </div>

            {activeScene ? (
              <div className="mt-4 space-y-4">
                {/* Start Trim */}
                <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">In Point (Start Time)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {formatDuration(activeScene.customTrimStart ?? activeScene.start)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={activeScene.start}
                    max={activeScene.end - 1}
                    step="0.5"
                    value={activeScene.customTrimStart ?? activeScene.start}
                    onChange={(e) =>
                      handleTrimChange(activeScene.id, 'customTrimStart', parseFloat(e.target.value))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatDuration(activeScene.start)}</span>
                    <span>{formatDuration(activeScene.end - 1)}</span>
                  </div>
                </div>

                {/* End Trim */}
                <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Out Point (End Time)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {formatDuration(activeScene.customTrimEnd ?? activeScene.end)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={activeScene.start + 1}
                    max={activeScene.end}
                    step="0.5"
                    value={activeScene.customTrimEnd ?? activeScene.end}
                    onChange={(e) =>
                      handleTrimChange(activeScene.id, 'customTrimEnd', parseFloat(e.target.value))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatDuration(activeScene.start + 1)}</span>
                    <span>{formatDuration(activeScene.end)}</span>
                  </div>
                </div>

                {/* Reason & Dialogue preview */}
                <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3 text-xs space-y-1.5">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Narrative Context</div>
                  <p className="text-slate-300 leading-relaxed">{activeScene.reasonForSelection}</p>
                  {activeScene.dialogueHighlights && (
                    <div className="text-[11px] text-violet-300 italic">
                      "{activeScene.dialogueHighlights}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-8 text-center">No scene selected</div>
            )}
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total clips in recap:</span>
            <span className="font-bold text-white">{scenes.length}</span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Strip */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Film className="h-4 w-4 text-cyan-400" />
            Recap Assembly Strip (Chronological Order)
          </h3>
          <span className="text-xs text-slate-400">{scenes.length} Clips Sequenced</span>
        </div>

        {/* Horizontal scrub strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {scenes.map((scene, idx) => {
            const isSelected = selectedSceneIndex === idx;
            const colors = getRoleBadgeColor(scene.narrativeRole);
            const clipDur =
              (scene.customTrimEnd ?? scene.end) - (scene.customTrimStart ?? scene.start);

            return (
              <div
                key={scene.id}
                onClick={() => handlePlayScene(scene, idx)}
                className={`relative shrink-0 w-36 rounded-xl border p-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                    : 'border-white/10 bg-slate-950/70 hover:border-white/30'
                }`}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-1.5">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt={scene.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                  <div className="absolute top-1 left-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-cyan-300">
                    #{idx + 1}
                  </div>
                  <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-slate-200">
                    {formatDuration(clipDur)}
                  </div>
                </div>

                <div className="text-[11px] font-bold text-white truncate">{scene.title}</div>
                <div className={`mt-0.5 text-[9px] truncate ${colors.text}`}>
                  {scene.narrativeRole}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editable Scene List Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Selected Recap Scenes</h3>
            <p className="text-xs text-slate-400">Order, audition, or remove clips from the render list.</p>
          </div>

          {unselectedScenes.length > 0 && (
            <button
              onClick={() => setShowAddCandidates(!showAddCandidates)}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddCandidates ? 'Close Candidate Drawer' : `Add from Candidates (${unselectedScenes.length})`}
            </button>
          )}
        </div>

        {/* Candidate Drawer if toggled */}
        {showAddCandidates && (
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950 p-4 space-y-3">
            <div className="text-xs font-semibold text-cyan-300">
              Unselected Candidate Scenes ({unselectedScenes.length}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unselectedScenes.map((cand) => (
                <div
                  key={cand.id}
                  className="rounded-lg border border-white/10 bg-slate-900 p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{cand.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatDuration(cand.duration)} • {cand.narrativeRole}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddScene(cand)}
                    className="rounded bg-cyan-500/20 border border-cyan-500/30 p-1.5 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {scenes.map((scene, index) => {
            const isSelected = selectedSceneIndex === index;
            const colors = getRoleBadgeColor(scene.narrativeRole);
            const clipDur =
              (scene.customTrimEnd ?? scene.end) - (scene.customTrimStart ?? scene.start);

            return (
              <div
                key={scene.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-950/20'
                    : 'border-white/5 bg-slate-950/60 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Sequence number */}
                  <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-300 shrink-0">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{scene.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {scene.narrativeRole}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>
                        Trim: {formatDuration(scene.customTrimStart ?? scene.start)} →{' '}
                        {formatDuration(scene.customTrimEnd ?? scene.end)}
                      </span>
                      <span>•</span>
                      <span className="text-cyan-400 font-bold">{formatDuration(clipDur)}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlayScene(scene, index)}
                    title="Audition scene"
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                    Preview
                  </button>

                  <div className="flex items-center rounded-lg border border-white/10 bg-slate-800">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveScene(index, 'up')}
                      title="Move up in recap"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-3 w-px bg-white/10" />
                    <button
                      disabled={index === scenes.length - 1}
                      onClick={() => handleMoveScene(index, 'down')}
                      title="Move down in recap"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemoveScene(scene.id)}
                    title="Remove from recap"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
