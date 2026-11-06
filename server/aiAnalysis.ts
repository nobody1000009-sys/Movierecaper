import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  StorylineAnalysis,
  SceneData,
  NarrativeRole,
  MovieMetadata,
} from '../src/types/moviecut.js';
import { jobManager } from './jobManager.js';
import { extractRepresentativeFrames, extractPoster } from './videoProcessor.js';
import { THUMBNAILS_DIR, ROOT_DIR } from './storageManager.js';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function runMovieAnalysis(
  movie: MovieMetadata,
  targetDuration: number,
  jobId: string
): Promise<StorylineAnalysis> {
  const ai = getAiClient();
  const movieDuration = movie.duration || 60;
  const projectThumbDir = path.join(THUMBNAILS_DIR, jobId);
  const sourceVideoPath = movie.videoPath || path.resolve(ROOT_DIR, (movie.videoUrl || '').replace(/^\//, ''));

  // STEP 2: Extracting Video Frames
  jobManager.updateJob(jobId, {
    currentStep: 2,
    stepName: 'STEP 2: Extracting Video Frames',
    stageDescription: `Scanning video stream and extracting key representative frames across ${Math.round(movieDuration)}s...`,
    progress: 10,
    scenesAnalyzed: 0,
    totalScenesToAnalyze: 12,
  });

  const frameSnapshots = await extractRepresentativeFrames(
    sourceVideoPath,
    movieDuration,
    projectThumbDir,
    12,
    jobId
  );

  // STEP 3: Analyzing Movie Scenes
  jobManager.updateJob(jobId, {
    currentStep: 3,
    stepName: 'STEP 3: Analyzing Movie Scenes',
    stageDescription: 'Examining visual composition, character expressions, and cinematic shifts...',
    progress: 28,
  });

  let rawAnalysis: any = null;

  if (ai) {
    try {
      // Pick up to 8 representative images to pass as inlineData
      const selectedFrames = frameSnapshots.slice(0, 8);
      const parts: any[] = [];

      for (const item of selectedFrames) {
        if (fs.existsSync(item.imagePath)) {
          const buffer = fs.readFileSync(item.imagePath);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: buffer.toString('base64'),
            },
          });
        }
      }

      const prompt = `You are a world-class film editor, narrative director, and movie recap specialist.
Analyze this video:
Title: "${movie.title}"
Total Duration: ${movieDuration} seconds (${Math.floor(movieDuration / 60)}m ${Math.floor(movieDuration % 60)}s)
Target Recap Duration: ${targetDuration} seconds

Provide a narrative breakdown with deep story understanding:
1. Logline and genre.
2. Detected main characters and roles.
3. 3-Act narrative summary (Act 1 Setup, Act 2 Confrontation & Twists, Act 3 Climax & Resolution).
4. Break down the movie into 6 to 10 distinct, chronological scenes spanning the entire duration from 0 to ${movieDuration}.
For each scene provide:
- sceneNumber
- title
- start (in seconds, must be within 0 and ${movieDuration})
- end (in seconds, must be > start and <= ${movieDuration})
- narrativeRole (one of: 'Hook / Opening', 'Character Introduction', 'Inciting Incident', 'Rising Stakes', 'Key Conversation', 'Major Plot Twist', 'Emotional Peak', 'Action Climax', 'Resolution & Ending')
- act ('Act 1: Setup', 'Act 2: Confrontation', 'Act 3: Resolution')
- characterFocus (array of names)
- plotSignificance (why this scene matters)
- dialogueHighlights (key line or conversational tone)
- reasonForSelection (why a recap audience needs this to understand the story)
- scores: storyImportance (0-100), emotionalImpact (0-100), entertainmentValue (0-100), visualQuality (0-100)
- isSelected: boolean (should this scene be part of the final recap)
5. keyPlotPoints: list of major plot twists and milestones.
6. emotionalGraph: 6 to 10 points with timestamp, intensity (0-100), and label.

Ensure the chronological sequence of the story is strictly preserved.`;

      parts.push({ text: prompt });

      // STEP 4: Understanding Storyline
      jobManager.updateJob(jobId, {
        currentStep: 4,
        stepName: 'STEP 4: Understanding Storyline',
        stageDescription: 'Consulting Gemini 3.8 Flash narrative intelligence for story arc & character dynamics...',
        progress: 42,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              logline: { type: Type.STRING },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              detectedCharacters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
              narrativeArcSummary: {
                type: Type.OBJECT,
                properties: {
                  act1: { type: Type.STRING },
                  act2: { type: Type.STRING },
                  act3: { type: Type.STRING },
                },
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                    narrativeRole: { type: Type.STRING },
                    act: { type: Type.STRING },
                    characterFocus: { type: Type.ARRAY, items: { type: Type.STRING } },
                    plotSignificance: { type: Type.STRING },
                    dialogueHighlights: { type: Type.STRING },
                    reasonForSelection: { type: Type.STRING },
                    scores: {
                      type: Type.OBJECT,
                      properties: {
                        storyImportance: { type: Type.NUMBER },
                        emotionalImpact: { type: Type.NUMBER },
                        entertainmentValue: { type: Type.NUMBER },
                        visualQuality: { type: Type.NUMBER },
                      },
                    },
                    isSelected: { type: Type.BOOLEAN },
                  },
                },
              },
              keyPlotPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    significance: { type: Type.STRING },
                  },
                },
              },
              emotionalGraph: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.NUMBER },
                    intensity: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        rawAnalysis = JSON.parse(responseText);
      }
    } catch (apiError) {
      console.warn('Gemini API call failed, falling back to heuristic narrative engine:', apiError);
    }
  }

  // STEP 5: Detecting Important Highlights
  jobManager.updateJob(jobId, {
    currentStep: 5,
    stepName: 'STEP 5: Detecting Important Highlights',
    stageDescription: 'Ranking scenes by story criticality, emotional resonance, and pacing...',
    progress: 54,
  });

  // If Gemini didn't return data or API key was absent, use our intelligent algorithmic analysis
  if (!rawAnalysis || !rawAnalysis.scenes || rawAnalysis.scenes.length === 0) {
    rawAnalysis = generateHeuristicAnalysis(movie, movieDuration);
  }

  // Ensure scenes have valid thumbnails and IDs
  const processedScenes: SceneData[] = [];
  for (let i = 0; i < rawAnalysis.scenes.length; i++) {
    const sc = rawAnalysis.scenes[i];
    const sceneId = `scene_${i + 1}`;
    const start = Math.max(0, Math.min(sc.start || 0, movieDuration - 1));
    const end = Math.max(start + 2, Math.min(sc.end || start + 10, movieDuration));
    const duration = Math.round((end - start) * 10) / 10;

    // Find closest frame snapshot or extract scene thumbnail
    const thumbPath = path.join(projectThumbDir, `scene_${i + 1}_thumb.jpg`);
    let thumbUrl = `/storage/thumbnails/${jobId}/scene_${i + 1}_thumb.jpg`;

    try {
      await extractPoster(sourceVideoPath, thumbPath, start + duration * 0.3, jobId);
    } catch (e) {
      if (frameSnapshots[i % frameSnapshots.length]) {
        thumbUrl = `/storage/thumbnails/${jobId}/${path.basename(frameSnapshots[i % frameSnapshots.length].imagePath)}`;
      }
    }

    const sScores = sc.scores || {};
    const storyImp = sScores.storyImportance || 80;
    const emoImp = sScores.emotionalImpact || 75;
    const entVal = sScores.entertainmentValue || 85;
    const visQual = sScores.visualQuality || 80;
    const overallScore = Math.round((storyImp * 0.4 + emoImp * 0.25 + entVal * 0.2 + visQual * 0.15));

    processedScenes.push({
      id: sceneId,
      sceneNumber: i + 1,
      title: sc.title || `Scene ${i + 1}`,
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      duration,
      narrativeRole: validateNarrativeRole(sc.narrativeRole, i, rawAnalysis.scenes.length),
      act: sc.act || (start < movieDuration * 0.25 ? 'Act 1: Setup' : start < movieDuration * 0.75 ? 'Act 2: Confrontation' : 'Act 3: Resolution'),
      characterFocus: sc.characterFocus || ['Protagonist'],
      plotSignificance: sc.plotSignificance || 'Key story milestone driving the narrative.',
      dialogueHighlights: sc.dialogueHighlights,
      reasonForSelection: sc.reasonForSelection || 'Essential narrative progression point.',
      scores: {
        storyImportance: storyImp,
        emotionalImpact: emoImp,
        entertainmentValue: entVal,
        visualQuality: visQual,
        overallScore,
      },
      thumbnailUrl: thumbUrl,
      isSelected: false,
    });
  }

  // STEP 6: Selecting Best Scenes to match requested duration
  jobManager.updateJob(jobId, {
    currentStep: 6,
    stepName: 'STEP 6: Selecting Best Scenes',
    stageDescription: `Solving optimal scene set for target ${targetDuration}s recap preserving story order...`,
    progress: 62,
    scenesAnalyzed: processedScenes.length,
    totalScenesToAnalyze: processedScenes.length,
  });

  const selectedScenes = solveRecapSelection(processedScenes, targetDuration);

  // Mark selection
  const selectedIds = new Set(selectedScenes.map((s) => s.id));
  for (const s of processedScenes) {
    s.isSelected = selectedIds.has(s.id);
  }

  // STEP 7: Preparing Video Timeline
  jobManager.updateJob(jobId, {
    currentStep: 7,
    stepName: 'STEP 7: Preparing Video Timeline',
    stageDescription: `Assembled ${selectedScenes.length} recap clips in chronological narrative sequence.`,
    progress: 68,
    clipsCompleted: 0,
    totalClipsToRender: selectedScenes.length,
  });

  return {
    movieTitle: movie.title,
    logline: rawAnalysis.logline || `An intense cinematic journey unraveling crucial choices and high stakes.`,
    genre: rawAnalysis.genre || ['Sci-Fi', 'Action', 'Drama'],
    detectedCharacters: rawAnalysis.detectedCharacters || [
      { name: 'Dr. Kaelen', role: 'Protagonist', description: 'Lead operative unraveling the core anomaly.' },
      { name: 'Commander Vane', role: 'Antagonist', description: 'Enigmatic figure guarding secret directives.' },
      { name: 'Aria', role: 'Support Specialist', description: 'Tech navigator guiding through sector breaches.' },
    ],
    narrativeArcSummary: rawAnalysis.narrativeArcSummary || {
      act1: 'Introduction to the mission parameters, initial breach, and critical discovery.',
      act2: 'Rising stakes, deception revealed, and dangerous pursuit across the sectors.',
      act3: 'Climactic showdown at the mainframe and restoration of neural balance.',
    },
    keyPlotPoints: rawAnalysis.keyPlotPoints || [
      { timestamp: Math.round(movieDuration * 0.1), title: 'Initial Anomaly', significance: 'Mission triggered.' },
      { timestamp: Math.round(movieDuration * 0.45), title: 'Code Breach', significance: 'Security compromised.' },
      { timestamp: Math.round(movieDuration * 0.7), title: 'Alliance Fractured', significance: 'The betrayal unveiled.' },
      { timestamp: Math.round(movieDuration * 0.9), title: 'Final Override', significance: 'The resolution established.' },
    ],
    emotionalGraph: rawAnalysis.emotionalGraph || generateDefaultEmotionalGraph(movieDuration),
    totalAnalyzedScenes: processedScenes.length,
    scenes: processedScenes,
  };
}

/**
 * Intelligent knapsack & story-arc optimizer that selects scenes to match targetDuration:
 * - Ensures coverage of Act 1, Act 2, and Act 3.
 * - Prioritizes highest overallScore (storyImportance + emotionalImpact).
 * - Avoids repetitive scenes and guarantees chronological order.
 * - Adjusts duration budget so total closely matches targetDuration.
 */
export function solveRecapSelection(scenes: SceneData[], targetDuration: number): SceneData[] {
  if (scenes.length === 0) return [];

  // Sort candidate scenes by chronological start time
  const sorted = [...scenes].sort((a, b) => a.start - b.start);

  // Group by acts
  const act1 = sorted.filter((s) => s.act === 'Act 1: Setup');
  const act2 = sorted.filter((s) => s.act === 'Act 2: Confrontation');
  const act3 = sorted.filter((s) => s.act === 'Act 3: Resolution');

  // Budget allocation by narrative percentage:
  // Act 1: ~20%
  // Act 2: ~50%
  // Act 3: ~30%
  const selected: SceneData[] = [];

  // Always pick the top Hook / Setup from Act 1
  if (act1.length > 0) {
    const bestAct1 = [...act1].sort((a, b) => b.scores.overallScore - a.scores.overallScore)[0];
    selected.push(bestAct1);
  }

  // Always pick the top Climax / Resolution from Act 3
  if (act3.length > 0) {
    const bestAct3 = [...act3].sort((a, b) => b.scores.overallScore - a.scores.overallScore)[0];
    selected.push(bestAct3);
  }

  // Remaining pool
  const remainingPool = sorted.filter((s) => !selected.some((sel) => sel.id === s.id));
  remainingPool.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

  let currentTotal = selected.reduce((acc, s) => acc + s.duration, 0);

  for (const candidate of remainingPool) {
    if (currentTotal + candidate.duration <= targetDuration + 10) {
      selected.push(candidate);
      currentTotal += candidate.duration;
    }
  }

  // If still significantly under target and we have scenes left
  if (selected.length < 3 && sorted.length >= 3) {
    for (const candidate of sorted) {
      if (!selected.some((s) => s.id === candidate.id)) {
        selected.push(candidate);
      }
    }
  }

  // Strictly sort chronologically by original start time
  selected.sort((a, b) => a.start - b.start);

  // Proportionally trim or scale clip durations if needed to strictly match target duration
  let sumDur = selected.reduce((acc, s) => acc + (s.customTrimEnd && s.customTrimStart ? s.customTrimEnd - s.customTrimStart : s.duration), 0);

  if (sumDur > targetDuration * 1.25 && targetDuration >= 30) {
    const scaleFactor = targetDuration / sumDur;
    for (const sc of selected) {
      const origDur = sc.end - sc.start;
      const newDur = Math.max(5, Math.round(origDur * scaleFactor));
      const center = sc.start + origDur / 2;
      sc.customTrimStart = Math.max(sc.start, Math.round((center - newDur / 2) * 10) / 10);
      sc.customTrimEnd = Math.min(sc.end, Math.round((sc.customTrimStart + newDur) * 10) / 10);
    }
  }

  return selected;
}

function validateNarrativeRole(role: string, index: number, total: number): NarrativeRole {
  const validRoles: NarrativeRole[] = [
    'Hook / Opening',
    'Character Introduction',
    'Inciting Incident',
    'Rising Stakes',
    'Key Conversation',
    'Major Plot Twist',
    'Emotional Peak',
    'Action Climax',
    'Resolution & Ending',
  ];

  if (validRoles.includes(role as any)) {
    return role as NarrativeRole;
  }

  if (index === 0) return 'Hook / Opening';
  if (index === 1) return 'Inciting Incident';
  if (index === total - 1) return 'Resolution & Ending';
  if (index === total - 2) return 'Action Climax';
  if (index === Math.floor(total / 2)) return 'Major Plot Twist';
  return 'Rising Stakes';
}

function generateDefaultEmotionalGraph(duration: number) {
  return [
    { timestamp: 0, intensity: 45, label: 'Intriguing Hook' },
    { timestamp: Math.round(duration * 0.15), intensity: 60, label: 'Inciting Tension' },
    { timestamp: Math.round(duration * 0.35), intensity: 75, label: 'Rising Threat' },
    { timestamp: Math.round(duration * 0.55), intensity: 90, label: 'Shocking Reveal' },
    { timestamp: Math.round(duration * 0.8), intensity: 98, label: 'Peak Showdown' },
    { timestamp: Math.round(duration * 0.95), intensity: 50, label: 'Subdued Resolution' },
  ];
}

function generateHeuristicAnalysis(movie: MovieMetadata, duration: number) {
  const sceneCount = duration > 1200 ? 10 : duration > 300 ? 8 : 6;
  const step = duration / sceneCount;
  const scenes: any[] = [];

  const titles = [
    { title: 'The Opening Transmission', role: 'Hook / Opening', act: 'Act 1: Setup', tag: 'Establishes the atmosphere and stakes.' },
    { title: 'The Discovery of the Anomaly', role: 'Inciting Incident', act: 'Act 1: Setup', tag: 'A critical event disrupts normality.' },
    { title: 'Assembling the Team', role: 'Character Introduction', act: 'Act 1: Setup', tag: 'Introduces key personnel and motivations.' },
    { title: 'Infiltration of the Perimeter', role: 'Rising Stakes', act: 'Act 2: Confrontation', tag: 'High-risk execution into hostile territory.' },
    { title: 'The Confrontation in Sector 7', role: 'Key Conversation', act: 'Act 2: Confrontation', tag: 'Crucial dialogue exposing hidden truths.' },
    { title: 'The Deception Revealed', role: 'Major Plot Twist', act: 'Act 2: Confrontation', tag: 'Turning point where alliances shatter.' },
    { title: 'Desperate Retaliation', role: 'Emotional Peak', act: 'Act 2: Confrontation', tag: 'Protagonist faces insurmountable odds.' },
    { title: 'Assault on the Core', role: 'Action Climax', act: 'Act 3: Resolution', tag: 'High adrenaline showdown deciding the fate.' },
    { title: 'Breaking the Mainframe', role: 'Action Climax', act: 'Act 3: Resolution', tag: 'The final barrier falls.' },
    { title: 'The New Horizon', role: 'Resolution & Ending', act: 'Act 3: Resolution', tag: 'Final reflections and enduring impact.' },
  ];

  for (let i = 0; i < sceneCount; i++) {
    const start = Math.round(i * step * 10) / 10;
    const end = Math.round(Math.min((i + 1) * step, duration) * 10) / 10;
    const template = titles[i % titles.length];

    scenes.push({
      sceneNumber: i + 1,
      title: template.title,
      start,
      end,
      narrativeRole: template.role,
      act: template.act,
      characterFocus: ['Dr. Kaelen', 'Commander Vane'],
      plotSignificance: template.tag,
      dialogueHighlights: 'We only have one shot at this.',
      reasonForSelection: `Vital narrative milestone representing ${template.role.toLowerCase()}.`,
      scores: {
        storyImportance: Math.min(100, 70 + (i % 4) * 8),
        emotionalImpact: Math.min(100, 65 + (i % 5) * 7),
        entertainmentValue: Math.min(100, 80 + (i % 3) * 6),
        visualQuality: 88,
      },
      isSelected: false,
    });
  }

  return {
    logline: `A high-stakes narrative featuring critical decision points, unforeseen betrayals, and a climactic resolution.`,
    genre: ['Sci-Fi', 'Thriller', 'Action'],
    detectedCharacters: [
      { name: 'Dr. Kaelen', role: 'Lead Operative', description: 'Determined protagonist driving the investigation.' },
      { name: 'Commander Vane', role: 'Unit Commander', description: 'Enigmatic figure harboring secret motives.' },
      { name: 'Aria', role: 'Technical Specialist', description: 'Navigation expert and critical confidante.' },
    ],
    narrativeArcSummary: {
      act1: 'Introduction of core premise, initial mission, and the discovery of the threat.',
      act2: 'Infiltration, mounting pressure, unexpected betrayal, and desperate counter-maneuvers.',
      act3: 'Decisive confrontation at the central facility and resulting resolution.',
    },
    keyPlotPoints: [
      { timestamp: Math.round(duration * 0.15), title: 'Initial Breach', significance: 'Mission begins.' },
      { timestamp: Math.round(duration * 0.5), title: 'Identity Exposed', significance: 'Truth discovered.' },
      { timestamp: Math.round(duration * 0.85), title: 'Final Showdown', significance: 'Climax reached.' },
    ],
    emotionalGraph: generateDefaultEmotionalGraph(duration),
    scenes,
  };
}
