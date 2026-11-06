/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';
import { TimelineEditorView } from './components/TimelineEditorView';
import { RenderPreviewView } from './components/RenderPreviewView';
import { ProjectsView } from './components/ProjectsView';
import { LiveProcessingModal } from './components/LiveProcessingModal';
import { SettingsModal } from './components/SettingsModal';
import type {
  MovieProject,
  ProcessingJob,
  RecapSettings,
  SceneData,
  RecapPreset,
} from './types/moviecut';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [projects, setProjects] = useState<MovieProject[]>([]);
  const [currentProject, setCurrentProject] = useState<MovieProject | null>(null);
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [defaultPreset, setDefaultPreset] = useState<RecapPreset>('3-min');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial projects & system status
  useEffect(() => {
    fetchSystemStatus();
    fetchProjects();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (e) {
      console.warn('System status fetch failed:', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data: MovieProject[] = await res.json();
        setProjects(data);
        if (data.length > 0 && !currentProject) {
          setCurrentProject(data[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load projects:', e);
    }
  };

  // Subscribe to Job Updates via SSE
  const trackJob = (jobId: string, onComplete?: (result: any) => void) => {
    setIsProcessingModalOpen(true);

    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const job: ProcessingJob = JSON.parse(event.data);
        setActiveJob(job);

        if (job.status === 'completed') {
          eventSource.close();
          setTimeout(() => {
            setIsProcessingModalOpen(false);
            if (onComplete) {
              onComplete(job.result);
            }
            fetchProjects();
          }, 800);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          eventSource.close();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Polling fallback
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (res.ok) {
            const job: ProcessingJob = await res.json();
            setActiveJob(job);
            if (job.status === 'completed') {
              clearInterval(interval);
              setTimeout(() => {
                setIsProcessingModalOpen(false);
                if (onComplete) onComplete(job.result);
                fetchProjects();
              }, 800);
            } else if (job.status === 'failed' || job.status === 'cancelled') {
              clearInterval(interval);
            }
          }
        } catch (e) {
          clearInterval(interval);
        }
      }, 1000);
    };
  };

  // Cancel running job
  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/jobs/${activeJob.id}/cancel`, { method: 'POST' });
      setIsProcessingModalOpen(false);
      showToast('Processing cancelled.');
    } catch (e) {
      console.error('Failed to cancel job:', e);
    }
  };

  // Handle Project Creation from Upload
  const handleProjectCreated = (newProject: MovieProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProject(newProject);
    showToast(`Movie "${newProject.title}" uploaded successfully.`);
  };

  // Handle Sample Movie Loading
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const res = await fetch('/api/sample-movie', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => [data.project, ...prev.filter((p) => p.id !== data.project.id)]);
        setCurrentProject(data.project);
        setCurrentTab('upload');
        showToast('Sample Sci-Fi Movie "Cybernetic Horizon: Origin" loaded!');
      } else {
        const err = await res.json();
        showToast(`Failed to load sample: ${err.error || 'Server error'}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Start Movie AI Analysis
  const handleStartAnalysis = async (projectId: string, targetDuration: number) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, targetDuration }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(`Analysis failed to start: ${err.error}`);
        return;
      }

      const { jobId } = await res.json();
      trackJob(jobId, (result) => {
        if (result?.analysis) {
          setCurrentProject((prev) =>
            prev && prev.id === projectId
              ? {
                  ...prev,
                  analysis: result.analysis,
                  selectedScenes: result.selectedScenes,
                  activeSettings: { ...prev.activeSettings, targetDuration },
                }
              : prev
          );
          setCurrentTab('analysis');
          showToast('AI Storyline Analysis & Scene Selection Complete!');
        }
      });
    } catch (e: any) {
      showToast(`Error starting analysis: ${e.message}`);
    }
  };

  // Recalculate Scene Selection for new target duration
  const handleRecalculateSelection = async (targetDuration: number) => {
    if (!currentProject) return;
    try {
      const res = await fetch('/api/recalculate-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProject.id, targetDuration }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentProject((prev) =>
          prev
            ? {
                ...prev,
                selectedScenes: data.selectedScenes,
                activeSettings: { ...prev.activeSettings, targetDuration },
                analysis: prev.analysis ? { ...prev.analysis, scenes: data.scenes } : prev.analysis,
              }
            : null
        );
        showToast(`Selection recalculated for ${targetDuration}s duration.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update selected scenes from Timeline Editor
  const handleUpdateScenes = async (newScenes: SceneData[]) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      selectedScenes: newScenes,
    };
    setCurrentProject(updated);

    try {
      await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedScenes: newScenes }),
      });
    } catch (e) {
      console.error('Failed to sync updated scenes:', e);
    }
  };

  // Restore AI's original selection
  const handleRestoreOriginal = () => {
    if (!currentProject?.analysis) return;
    const originalSelected = currentProject.analysis.scenes.filter((s) => s.isSelected);
    handleUpdateScenes(originalSelected);
    showToast('Original AI scene selection restored.');
  };

  // Proceed to Render Video
  const handleProceedToRender = async (customSettings?: RecapSettings) => {
    if (!currentProject) return;
    const settings = customSettings || currentProject.activeSettings;

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          scenes: currentProject.selectedScenes,
          settings,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(`Render failed to start: ${err.error}`);
        return;
      }

      const { jobId } = await res.json();
      trackJob(jobId, (renderedRecap) => {
        if (renderedRecap) {
          setCurrentProject((prev) =>
            prev ? { ...prev, lastRenderedRecap: renderedRecap, activeSettings: settings } : null
          );
          setCurrentTab('render');
          showToast('Final Movie Recap Rendered Successfully!');
        }
      });
    } catch (e: any) {
      showToast(`Error starting render: ${e.message}`);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (currentProject?.id === id) {
          setCurrentProject(projects.find((p) => p.id !== id) || null);
        }
        showToast('Project deleted.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectProject = (project: MovieProject, tab?: string) => {
    setCurrentProject(project);
    if (tab) {
      setCurrentTab(tab);
    }
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setCurrentTab('upload');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      {/* Header Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasApiKey={hasApiKey}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onStartUpload={() => setCurrentTab('upload')}
            onLoadSample={handleLoadSample}
            onOpenProject={handleSelectProject}
            projects={projects}
            currentProject={currentProject}
            isLoadingSample={isLoadingSample}
          />
        )}

        {currentTab === 'upload' && (
          <UploadView
            currentProject={currentProject}
            onProjectCreated={handleProjectCreated}
            onStartAnalysis={handleStartAnalysis}
            onLoadSample={handleLoadSample}
            isLoadingSample={isLoadingSample}
          />
        )}

        {currentTab === 'analysis' && currentProject && currentProject.analysis && (
          <AnalysisView
            currentProject={currentProject}
            onOpenTimeline={() => setCurrentTab('timeline')}
            onRecalculateSelection={handleRecalculateSelection}
            onPreviewScene={(_scene) => setCurrentTab('timeline')}
          />
        )}

        {currentTab === 'timeline' && currentProject && (
          <TimelineEditorView
            currentProject={currentProject}
            onUpdateScenes={handleUpdateScenes}
            onRestoreOriginal={handleRestoreOriginal}
            onProceedToRender={() => handleProceedToRender()}
            targetDuration={currentProject.activeSettings.targetDuration}
          />
        )}

        {currentTab === 'render' && currentProject && (
          <RenderPreviewView
            currentProject={currentProject}
            onOpenTimeline={() => setCurrentTab('timeline')}
            onNewProject={handleNewProject}
            onReRender={handleProceedToRender}
            isRendering={activeJob?.status === 'running'}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            projects={projects}
            currentProject={currentProject}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            onNewProject={handleNewProject}
            onLoadSample={handleLoadSample}
            isLoadingSample={isLoadingSample}
          />
        )}
      </main>

      {/* Live Processing Modal for 10-Step Pipeline */}
      <LiveProcessingModal
        job={activeJob}
        onCancel={handleCancelJob}
        isOpen={isProcessingModalOpen}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasApiKey={hasApiKey}
        defaultPreset={defaultPreset}
        setDefaultPreset={setDefaultPreset}
      />
    </div>
  );
}
