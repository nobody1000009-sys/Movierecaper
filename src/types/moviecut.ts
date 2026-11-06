export type NarrativeRole =
  | 'Hook / Opening'
  | 'Character Introduction'
  | 'Inciting Incident'
  | 'Rising Stakes'
  | 'Key Conversation'
  | 'Major Plot Twist'
  | 'Emotional Peak'
  | 'Action Climax'
  | 'Resolution & Ending';

export interface SceneScores {
  storyImportance: number; // 0-100
  emotionalImpact: number; // 0-100
  entertainmentValue: number; // 0-100
  visualQuality: number; // 0-100
  overallScore: number; // 0-100
}

export interface SceneData {
  id: string;
  sceneNumber: number;
  title: string;
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
  narrativeRole: NarrativeRole;
  characterFocus: string[];
  plotSignificance: string;
  dialogueHighlights?: string;
  reasonForSelection: string;
  scores: SceneScores;
  thumbnailUrl: string;
  isSelected: boolean;
  act: 'Act 1: Setup' | 'Act 2: Confrontation' | 'Act 3: Resolution';
  customTrimStart?: number;
  customTrimEnd?: number;
}

export interface CharacterInfo {
  name: string;
  role: string;
  description: string;
}

export interface StorylineAnalysis {
  movieTitle: string;
  logline: string;
  genre: string[];
  detectedCharacters: CharacterInfo[];
  narrativeArcSummary: {
    act1: string;
    act2: string;
    act3: string;
  };
  keyPlotPoints: {
    timestamp: number;
    title: string;
    significance: string;
  }[];
  emotionalGraph: {
    timestamp: number;
    intensity: number;
    label: string;
  }[];
  totalAnalyzedScenes: number;
  scenes: SceneData[];
}

export interface MovieMetadata {
  id: string;
  title: string;
  originalName: string;
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  size: number; // in bytes
  format: string;
  videoUrl: string;
  videoPath?: string;
  posterUrl: string;
  uploadedAt: string;
  isSample?: boolean;
}

export type RecapPreset = '1-min' | '3-min' | '5-min' | '10-min' | '15-min' | 'custom';

export interface RecapSettings {
  targetDuration: number; // in seconds
  presetName: RecapPreset;
  resolution: '1080p' | '720p';
  aspectRatio: '16:9' | '9:16' | '1:1';
  transition: 'cut' | 'fade';
  pacing: 'balanced' | 'fast-paced' | 'detailed';
  burnSubtitles?: boolean;
}

export type JobStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProcessingJob {
  id: string;
  type: 'analysis' | 'render';
  status: JobStatus;
  currentStep: number; // 1 to 10
  stepName: string;
  stageDescription: string;
  progress: number; // 0 to 100
  scenesAnalyzed?: number;
  totalScenesToAnalyze?: number;
  clipsCompleted?: number;
  totalClipsToRender?: number;
  currentClipName?: string;
  estimatedSecondsRemaining?: number;
  error?: string;
  result?: any;
  startedAt: number;
  updatedAt: number;
}

export interface RenderedRecap {
  id: string;
  projectId: string;
  title: string;
  videoUrl: string;
  downloadUrl: string;
  duration: number;
  targetDuration: number;
  originalDuration: number;
  compressionRatio: string;
  sceneCount: number;
  resolution: string;
  aspectRatio: string;
  fileSize: number;
  createdAt: string;
  scenesSummary: {
    title: string;
    duration: number;
    timestamp: string;
    role: NarrativeRole;
  }[];
}

export interface MovieProject {
  id: string;
  title: string;
  movieMetadata: MovieMetadata;
  analysis?: StorylineAnalysis;
  activeSettings: RecapSettings;
  selectedScenes: SceneData[];
  lastRenderedRecap?: RenderedRecap;
  createdAt: string;
  updatedAt: string;
}
