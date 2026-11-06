import React from 'react';
import {
  Film,
  Sparkles,
  Layers,
  Scissors,
  Sliders,
  FolderOpen,
  Settings as SettingsIcon,
  Plus,
  Activity,
  ChevronDown,
} from 'lucide-react';
import type { MovieProject } from '../types/moviecut';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentProject: MovieProject | null;
  projects: MovieProject[];
  onSelectProject: (project: MovieProject) => void;
  onNewProject: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  onOpenSettings,
  hasApiKey,
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'upload', label: 'Upload Movie', icon: Plus },
    { id: 'analysis', label: 'AI Story Analysis', icon: Sparkles, disabled: !currentProject },
    { id: 'timeline', label: 'Timeline Editor', icon: Scissors, disabled: !currentProject?.analysis },
    { id: 'render', label: 'Export & Preview', icon: Sliders, disabled: !currentProject },
    { id: 'projects', label: 'My Projects', icon: FolderOpen },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 group text-left cursor-pointer transition-transform active:scale-95"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/80">
                <Film className="h-5 w-5 text-cyan-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white font-mono">MovieCut</span>
                <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                  AI STUDIO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">Recap & Highlight Engine</span>
            </div>
          </button>

          {/* Project Switcher Dropdown */}
          {currentProject && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="flex items-center gap-2 rounded-lg bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:border-violet-500/50 hover:bg-slate-800 transition-all"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[140px] truncate font-medium">{currentProject.title}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showProjectDropdown && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Switch Project ({projects.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          p.id === currentProject.id
                            ? 'bg-violet-600/20 text-violet-300 font-medium border border-violet-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="truncate pr-2">{p.title}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {p.lastRenderedRecap ? 'Recap Ready' : p.analysis ? 'Analyzed' : 'Draft'}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 border-t border-white/10 pt-1">
                    <button
                      onClick={() => {
                        setShowProjectDropdown(false);
                        onNewProject();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create New Recap Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center Nav tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full bg-slate-900/90 border border-white/10 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                    : item.disabled
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Status indicators */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-900/80 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              FFmpeg 4.4
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${hasApiKey ? 'bg-violet-400' : 'bg-amber-400'}`} />
              {hasApiKey ? 'Gemini 3.8 Flash' : 'Narrative Engine'}
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            title="Studio Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 hover:border-violet-500/40 hover:text-white transition-all cursor-pointer"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>

          <button
            onClick={onNewProject}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Movie Recap</span>
          </button>
        </div>
      </div>
    </header>
  );
};
