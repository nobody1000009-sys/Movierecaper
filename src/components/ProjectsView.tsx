import React from 'react';
import {
  FolderOpen,
  Film,
  Play,
  Scissors,
  Sparkles,
  Download,
  Trash2,
  Clock,
  HardDrive,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import type { MovieProject } from '../types/moviecut';
import { formatDuration, formatBytes } from '../utils/formatters';

interface ProjectsViewProps {
  projects: MovieProject[];
  currentProject: MovieProject | null;
  onSelectProject: (project: MovieProject, tab?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
}

function getProjectDownloadUrl(recap: any, title: string): string {
  if (!recap) return '';
  if (recap.downloadUrl?.startsWith('/api/download')) return recap.downloadUrl;
  const filename = recap.videoUrl?.split('/').pop() || 'recap.mp4';
  const safeTitle = (title || 'MovieCut').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/api/download?file=renders/${filename}&name=${encodeURIComponent(safeTitle)}_Recap.mp4`;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onDeleteProject,
  onNewProject,
  onLoadSample,
  isLoadingSample,
}) => {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-cyan-400" />
            My Movie Projects & Recaps
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse, re-edit, or download all generated movie recaps and source video libraries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadSample}
            disabled={isLoadingSample}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoadingSample ? 'Generating sample...' : 'Add Sample Movie'}
          </button>

          <button
            onClick={onNewProject}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Upload New Movie
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-16 text-center">
          <Film className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white">No saved projects found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Upload your first full-length movie or launch the instant demo sample to see the AI recap generator in action.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onNewProject}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors cursor-pointer"
            >
              Upload Movie Video
            </button>
            <button
              onClick={onLoadSample}
              disabled={isLoadingSample}
              className="rounded-xl border border-cyan-500/40 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
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
            const isCurrent = currentProject?.id === proj.id;

            return (
              <div
                key={proj.id}
                className={`flex flex-col overflow-hidden rounded-2xl border transition-all shadow-lg ${
                  isCurrent
                    ? 'border-cyan-400/80 bg-slate-900 shadow-cyan-500/10'
                    : 'border-white/10 bg-slate-900/70 hover:border-violet-500/40'
                }`}
              >
                {/* Poster */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden group">
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

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Badges */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-200 backdrop-blur-sm">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    {formatDuration(meta?.duration || 0)}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    {hasRecap ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Recap: {formatDuration(proj.lastRenderedRecap?.duration || 0)}
                      </span>
                    ) : hasAnalysis ? (
                      <span className="flex items-center gap-1 rounded-md bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-300 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        {proj.analysis?.scenes.length} Scenes
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-800/80 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white truncate">{proj.title}</h3>
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      title="Delete project"
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>{meta?.width}x{meta?.height}</span>
                    <span>•</span>
                    <span>{formatBytes(meta?.size || 0)}</span>
                    <span>•</span>
                    <span className="uppercase">{meta?.format}</span>
                  </div>

                  {proj.analysis && (
                    <p className="mt-2.5 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {proj.analysis.logline}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                    {hasRecap ? (
                      <>
                        <button
                          onClick={() => onSelectProject(proj, 'render')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Watch Recap
                        </button>
                        <a
                          href={getProjectDownloadUrl(proj.lastRenderedRecap, proj.title)}
                          download={`MovieCut_${proj.title.replace(/\s+/g, '_')}_Recap.mp4`}
                          title="Download MP4 to Phone Storage"
                          className="rounded-lg border border-white/10 bg-slate-800 p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </>
                    ) : hasAnalysis ? (
                      <button
                        onClick={() => onSelectProject(proj, 'timeline')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition-colors cursor-pointer"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        Timeline Editor
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectProject(proj, 'analysis')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Analyze Movie
                      </button>
                    )}

                    <button
                      onClick={() => onSelectProject(proj, 'upload')}
                      title="Inspect Source"
                      className="rounded-lg border border-white/10 bg-slate-800 p-2 text-xs text-slate-400 hover:text-white"
                    >
                      <Film className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
