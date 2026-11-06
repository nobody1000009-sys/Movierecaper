import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import type { MovieMetadata, SceneData, RecapSettings } from '../src/types/moviecut.js';
import { jobManager } from './jobManager.js';
import { THUMBNAILS_DIR, CLIPS_DIR, RENDERS_DIR, SAMPLES_DIR } from './storageManager.js';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  size: number;
  format: string;
}

export async function probeVideo(filePath: string): Promise<ProbeResult> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

    const duration =
      parseFloat(data.format?.duration || videoStream?.duration || audioStream?.duration || '0') || 0;
    const width = parseInt(videoStream?.width || '1920', 10);
    const height = parseInt(videoStream?.height || '1080', 10);
    const size = parseInt(data.format?.size || '0', 10) || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);
    const bitrate = parseInt(data.format?.bit_rate || '0', 10);

    let fps = 24;
    if (videoStream?.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/');
      if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
        fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
      }
    }

    const format = data.format?.format_name || path.extname(filePath).replace('.', '') || 'mp4';

    return {
      duration,
      width,
      height,
      fps,
      bitrate,
      size,
      format,
    };
  } catch (err: any) {
    console.error('ffprobe error:', err);
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0 };
    return {
      duration: 60,
      width: 1920,
      height: 1080,
      fps: 24,
      bitrate: 2000000,
      size: stat.size,
      format: path.extname(filePath).replace('.', '') || 'mp4',
    };
  }
}

export async function extractPoster(
  videoPath: string,
  outputPath: string,
  timestamp = 1.0,
  jobId?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss',
      timestamp.toString(),
      '-i',
      videoPath,
      '-vframes',
      '1',
      '-q:v',
      '2',
      '-y',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args);
    if (jobId) {
      jobManager.registerProcess(jobId, proc);
    }

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Failed to extract poster. Exit code: ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function extractRepresentativeFrames(
  videoPath: string,
  duration: number,
  outputDir: string,
  frameCount = 16,
  jobId?: string
): Promise<{ timestamp: number; imagePath: string }[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: { timestamp: number; imagePath: string }[] = [];
  const validDuration = Math.max(duration, 5);
  // Distribute timestamps across the entire movie duration
  const timestamps: number[] = [];
  const step = validDuration / (frameCount + 1);
  for (let i = 1; i <= frameCount; i++) {
    timestamps.push(Math.round(step * i * 10) / 10);
  }

  for (let i = 0; i < timestamps.length; i++) {
    if (jobId && jobManager.isCancelled(jobId)) {
      throw new Error('Operation cancelled by user');
    }

    const t = timestamps[i];
    const imagePath = path.join(outputDir, `frame_${i + 1}_${Math.floor(t)}s.jpg`);

    try {
      await extractPoster(videoPath, imagePath, t, jobId);
      results.push({ timestamp: t, imagePath });
    } catch (e) {
      console.warn(`Could not extract frame at ${t}s:`, e);
    }

    if (jobId) {
      const progress = Math.round(10 + (i / timestamps.length) * 15);
      jobManager.updateJob(jobId, {
        progress,
        scenesAnalyzed: i + 1,
        totalScenesToAnalyze: timestamps.length,
        stageDescription: `Extracted frame snapshot ${i + 1} of ${timestamps.length} (${formatTime(t)})`,
      });
    }
  }

  return results;
}

export async function cutClip(
  sourcePath: string,
  outputPath: string,
  start: number,
  end: number,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1';
  } = {},
  jobId?: string
): Promise<string> {
  const duration = Math.max(end - start, 0.5);

  let scaleFilter = '';
  if (options.aspectRatio === '9:16') {
    const w = options.targetWidth || 1080;
    const h = options.targetHeight || 1920;
    scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  } else if (options.aspectRatio === '1:1') {
    const w = options.targetWidth || 1080;
    const h = options.targetHeight || 1080;
    scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  } else if (options.targetWidth && options.targetHeight) {
    const w = options.targetWidth;
    const h = options.targetHeight;
    scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  }

  const args: string[] = [
    '-ss',
    start.toString(),
    '-t',
    duration.toString(),
    '-i',
    sourcePath,
  ];

  if (scaleFilter) {
    args.push('-vf', scaleFilter);
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '22',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-y',
    outputPath
  );

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    if (jobId) {
      jobManager.registerProcess(jobId, proc);
    }

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Clip extraction failed with code ${code}: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function renderRecapVideo(
  sourcePath: string,
  scenes: SceneData[],
  outputPath: string,
  settings: RecapSettings,
  jobId: string
): Promise<{ finalDuration: number; fileSize: number }> {
  if (scenes.length === 0) {
    throw new Error('No scenes selected for rendering.');
  }

  const jobDir = path.join(CLIPS_DIR, jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  // Determine output resolution dimensions
  let targetWidth = 1920;
  let targetHeight = 1080;
  if (settings.resolution === '720p') {
    targetWidth = 1280;
    targetHeight = 720;
  }
  if (settings.aspectRatio === '9:16') {
    const tmp = targetWidth;
    targetWidth = targetHeight;
    targetHeight = tmp;
    if (settings.resolution === '1080p') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else {
      targetWidth = 720;
      targetHeight = 1280;
    }
  } else if (settings.aspectRatio === '1:1') {
    targetWidth = settings.resolution === '1080p' ? 1080 : 720;
    targetHeight = targetWidth;
  }

  // STEP 8: Cutting Individual Clips
  jobManager.updateJob(jobId, {
    currentStep: 8,
    stepName: 'STEP 8: Cutting Individual Clips',
    stageDescription: `Initiating frame-accurate trimming for ${scenes.length} selected scenes...`,
    progress: 70,
    clipsCompleted: 0,
    totalClipsToRender: scenes.length,
  });

  const clipPaths: string[] = [];
  const startTime = Date.now();

  for (let i = 0; i < scenes.length; i++) {
    if (jobManager.isCancelled(jobId)) {
      throw new Error('Rendering cancelled by user');
    }

    const scene = scenes[i];
    const clipOut = path.join(jobDir, `clip_${String(i + 1).padStart(3, '0')}.mp4`);
    const trimStart = scene.customTrimStart !== undefined ? scene.customTrimStart : scene.start;
    const trimEnd = scene.customTrimEnd !== undefined ? scene.customTrimEnd : scene.end;

    jobManager.updateJob(jobId, {
      currentClipName: `Scene ${i + 1}: ${scene.title}`,
      stageDescription: `Trimming Scene ${i + 1}/${scenes.length}: "${scene.title}" (${formatTime(trimStart)} - ${formatTime(trimEnd)})`,
    });

    await cutClip(
      sourcePath,
      clipOut,
      trimStart,
      trimEnd,
      {
        targetWidth,
        targetHeight,
        aspectRatio: settings.aspectRatio,
      },
      jobId
    );

    clipPaths.push(clipOut);

    const clipsDone = i + 1;
    const progress = Math.round(70 + (clipsDone / scenes.length) * 18);
    const elapsed = (Date.now() - startTime) / 1000;
    const avgPerClip = elapsed / clipsDone;
    const remaining = Math.round(avgPerClip * (scenes.length - clipsDone));

    jobManager.updateJob(jobId, {
      progress,
      clipsCompleted: clipsDone,
      estimatedSecondsRemaining: remaining,
      stageDescription: `Completed Scene ${clipsDone} of ${scenes.length} ("${scene.title}")`,
    });
  }

  // STEP 9: Combining Selected Clips
  jobManager.updateJob(jobId, {
    currentStep: 9,
    stepName: 'STEP 9: Combining Selected Clips',
    stageDescription: `Concatenating ${clipPaths.length} clips and harmonizing audio waveforms...`,
    progress: 90,
  });

  if (jobManager.isCancelled(jobId)) {
    throw new Error('Rendering cancelled by user');
  }

  // Create concat list file
  const concatListFile = path.join(jobDir, 'concat_list.txt');
  const fileContent = clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(concatListFile, fileContent, 'utf-8');

  // STEP 10: Rendering Final Movie Recap
  jobManager.updateJob(jobId, {
    currentStep: 10,
    stepName: 'STEP 10: Rendering Final Movie Recap',
    stageDescription: `Encoding final master file with H.264/AAC at ${targetWidth}x${targetHeight}...`,
    progress: 95,
  });

  await new Promise<void>((resolve, reject) => {
    const args = [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListFile,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args);
    jobManager.registerProcess(jobId, proc);

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`Final concat failed with exit code ${code}: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', reject);
  });

  // Cleanup temporary intermediate clips to save space
  try {
    for (const cp of clipPaths) {
      if (fs.existsSync(cp)) fs.unlinkSync(cp);
    }
    if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile);
    if (fs.existsSync(jobDir)) fs.rmdirSync(jobDir);
  } catch (e) {
    // ignore cleanup errors
  }

  const probe = await probeVideo(outputPath);
  return {
    finalDuration: probe.duration,
    fileSize: probe.size,
  };
}

/**
 * Creates an ultra-cinematic 100-second sample movie with 6 distinct scenes,
 * complete with visual cards, synth audio patterns, and dramatic timestamps.
 */
export async function generateSampleMovie(outputPath: string): Promise<string> {
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Build a multi-scene 100-second sci-fi movie clip using FFmpeg filtergraphs
  // Scene 1: 0 - 15s: "The Quantum Relic" (Deep navy/cyan gradient, 220Hz pulse)
  // Scene 2: 15 - 32s: "Dr. Kaelen's Discovery" (Amber warning, 330Hz tone)
  // Scene 3: 32 - 52s: "Neural Infiltration" (Crimson danger, 440Hz rhythm)
  // Scene 4: 52 - 70s: "The Traitor Revealed" (Deep violet, 261Hz somber)
  // Scene 5: 70 - 88s: "Rooftop Confrontation" (Electric magenta & blue pulse, 523Hz climactic)
  // Scene 6: 88 - 100s: "Dawn of Aethelgard" (Emerald horizon, 392Hz uplifting)

  const args = [
    // Video inputs: 6 distinct color scenes
    '-f', 'lavfi', '-i', 'color=c=#0B132B:s=1280x720:d=15:r=24',
    '-f', 'lavfi', '-i', 'color=c=#2B1B0B:s=1280x720:d=17:r=24',
    '-f', 'lavfi', '-i', 'color=c=#2B0B13:s=1280x720:d=20:r=24',
    '-f', 'lavfi', '-i', 'color=c=#1A0B2B:s=1280x720:d=18:r=24',
    '-f', 'lavfi', '-i', 'color=c=#0B222B:s=1280x720:d=18:r=24',
    '-f', 'lavfi', '-i', 'color=c=#0B2B1B:s=1280x720:d=12:r=24',

    // Audio inputs: 6 distinct synth tones
    '-f', 'lavfi', '-i', 'sine=frequency=220:duration=15',
    '-f', 'lavfi', '-i', 'sine=frequency=330:duration=17',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20',
    '-f', 'lavfi', '-i', 'sine=frequency=261:duration=18',
    '-f', 'lavfi', '-i', 'sine=frequency=523:duration=18',
    '-f', 'lavfi', '-i', 'sine=frequency=392:duration=12',

    // Filter complex: text overlays & concat
    '-filter_complex',
    `[0:v]drawtext=text='CYBERNETIC HORIZON\\: ORIGIN':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='PROLOGUE\\: THE QUANTUM RELIC [00\\:00 - 00\\:15]':fontcolor=#64DFDF:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 1 - OPENING HOOK':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+70[v0];
     [1:v]drawtext=text='SCENE 2\\: DR. KAELEN DISCOVERY':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='ANOMALY DETECTED IN ARCHIVES [00\\:15 - 00\\:32]':fontcolor=#F4A261:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 1 - INCITING INCIDENT':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60[v1];
     [2:v]drawtext=text='SCENE 3\\: NEURAL INFILTRATION':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='BREACHING THE RED SECTOR [00\\:32 - 00\\:52]':fontcolor=#E63946:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 2 - RISING TENSION & STAKES':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60[v2];
     [3:v]drawtext=text='SCENE 4\\: THE BETRAYAL':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='COMMANDER VANE REVEALS HIS ALLEGIANCE [00\\:52 - 01\\:10]':fontcolor=#C77DFF:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 2 - MAJOR PLOT TWIST':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60[v3];
     [4:v]drawtext=text='SCENE 5\\: ROOFTOP SHOWDOWN':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='FINAL CONFRONTATION OVER NEO-TOKYO [01\\:10 - 01\\:28]':fontcolor=#48CAE4:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 3 - ACTION CLIMAX':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60[v4];
     [5:v]drawtext=text='SCENE 6\\: DAWN OF AETHELGARD':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='THE MATRIX SHUTS DOWN - PEACE RESTORED [01\\:28 - 01\\:40]':fontcolor=#52B788:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+20,drawtext=text='ACT 3 - RESOLUTION & CONCLUSION':fontcolor=yellow:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60[v5];
     [v0][6:a][v1][7:a][v2][8:a][v3][9:a][v4][10:a][v5][11:a]concat=n=6:v=1:a=1[outv][outa]`,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`Failed to generate sample movie (code ${code}): ${stderr.slice(-300)}`));
      }
    });
    proc.on('error', reject);
  });

  return outputPath;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
