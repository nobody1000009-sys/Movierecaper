import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  initStorage,
  getProjects,
  saveProject,
  getProjectById,
  deleteProject,
  UPLOADS_DIR,
  THUMBNAILS_DIR,
  RENDERS_DIR,
  SAMPLES_DIR,
  STORAGE_DIR,
  CHUNKS_DIR,
  ROOT_DIR,
} from './server/storageManager.js';
import {
  probeVideo,
  extractPoster,
  renderRecapVideo,
  generateSampleMovie,
  formatBytes,
} from './server/videoProcessor.js';
import { jobManager } from './server/jobManager.js';
import { runMovieAnalysis, solveRecapSelection } from './server/aiAnalysis.js';
import type {
  MovieProject,
  MovieMetadata,
  RecapSettings,
  RenderedRecap,
  SceneData,
} from './src/types/moviecut.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '3000', 10);

initStorage();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Upload-Id, X-Chunk-Index, Range'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static storage files (thumbnails, renders, uploads, samples)
app.use('/storage', express.static(STORAGE_DIR));

// MOBILE-OPTIMIZED ATTACHMENT DOWNLOAD ENDPOINT
// Sends explicit Content-Disposition: attachment so phone browsers (iOS Safari, Android Chrome)
// trigger immediate download into phone storage instead of streaming inline.
app.get('/api/download', (req, res) => {
  try {
    const rawFile = (req.query.file || '').toString().trim();
    if (!rawFile) {
      return res.status(400).json({ error: 'Missing file parameter' });
    }

    // Strip leading slashes and storage prefix to locate file inside STORAGE_DIR
    const cleanRelative = rawFile
      .replace(/^[/\\]+/, '')
      .replace(/^storage[/\\]+/, '');
    const absolutePath = path.resolve(STORAGE_DIR, cleanRelative);

    // Prevent directory traversal attacks
    if (!absolutePath.startsWith(STORAGE_DIR)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Video file not found on server' });
    }

    const defaultName = path.basename(absolutePath);
    const customName = (req.query.name || defaultName).toString().trim();
    let downloadFilename = customName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!path.extname(downloadFilename)) {
      downloadFilename += path.extname(absolutePath) || '.mp4';
    }

    const stat = fs.statSync(absolutePath);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`
    );
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Download failed' });
    }
  }
});

// Configure Multer for video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}${ext}`);
  },
});

const validExtensions = [
  '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.ts', '.3gp', '.flv', '.wmv', '.mpeg', '.mpg', '.ogv'
];

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 4 }, // 4GB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (validExtensions.includes(ext) || file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(null, true); // Permissive: allow user to test any local video
    }
  },
});

// Configure chunked upload storage for large files exceeding single-request limits
const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawId = (req.query.uploadId || req.headers['x-upload-id'] || req.body?.uploadId || 'default').toString();
    const uploadId = rawId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    const dir = path.join(CHUNKS_DIR, uploadId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, _file, cb) => {
    const rawIndex = (req.query.chunkIndex || req.headers['x-chunk-index'] || req.body?.chunkIndex || '0').toString();
    const chunkIndex = parseInt(rawIndex, 10) || 0;
    cb(null, `chunk_${chunkIndex.toString().padStart(6, '0')}`);
  },
});

const uploadChunk = multer({
  storage: chunkStorage,
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB chunk max
});

// SYSTEM STATUS
app.get('/api/system-status', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    storageDir: STORAGE_DIR,
    timestamp: new Date().toISOString(),
  });
});

// UPLOAD VIDEO
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const title = (req.body.title || path.basename(originalName, path.extname(originalName)))
      .replace(/[_-]+/g, ' ')
      .trim();

    const probe = await probeVideo(filePath);
    const projectId = `proj_${Date.now()}`;
    const posterFilename = `${projectId}_poster.jpg`;
    const posterPath = path.join(THUMBNAILS_DIR, posterFilename);

    try {
      await extractPoster(filePath, posterPath, Math.min(2.0, probe.duration * 0.1));
    } catch (e) {
      console.warn('Poster extraction warning:', e);
    }

    const movieMetadata: MovieMetadata = {
      id: `mov_${Date.now()}`,
      title,
      originalName,
      duration: Math.round(probe.duration * 10) / 10,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      bitrate: probe.bitrate,
      size: probe.size,
      format: probe.format,
      videoUrl: `/storage/uploads/${path.basename(filePath)}`,
      videoPath: filePath,
      posterUrl: fs.existsSync(posterPath) ? `/storage/thumbnails/${posterFilename}` : '',
      uploadedAt: new Date().toISOString(),
      isSample: false,
    } as any;

    const defaultSettings: RecapSettings = {
      targetDuration: probe.duration > 300 ? 180 : Math.max(30, Math.round(probe.duration * 0.4)),
      presetName: '3-min',
      resolution: '1080p',
      aspectRatio: '16:9',
      transition: 'cut',
      pacing: 'balanced',
    };

    const project: MovieProject = {
      id: projectId,
      title,
      movieMetadata,
      activeSettings: defaultSettings,
      selectedScenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);

    res.json({
      success: true,
      project,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process uploaded video' });
  }
});

// CHUNKED VIDEO UPLOAD - Single chunk (supports direct binary stream and multipart)
app.post('/api/upload-chunk', (req, res) => {
  const uploadId = ((req.query.uploadId || req.headers['x-upload-id'] || req.body?.uploadId || 'default') as string)
    .replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
  const rawIndex = (req.query.chunkIndex || req.headers['x-chunk-index'] || req.body?.chunkIndex || '0') as string;
  const chunkIndex = parseInt(rawIndex, 10) || 0;
  const formattedIndex = chunkIndex.toString().padStart(6, '0');

  const chunkDir = path.join(CHUNKS_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }
  const chunkPath = path.join(chunkDir, `chunk_${formattedIndex}`);
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // If explicitly multipart/form-data with multer
  if (contentType.includes('multipart/form-data')) {
    uploadChunk.single('chunk')(req, res, (err) => {
      if (err) {
        console.error('Multer chunk error:', err);
        return res.status(500).json({ error: err.message || 'Failed to upload chunk' });
      }
      res.json({
        success: true,
        chunkIndex,
        uploadId,
      });
    });
    return;
  }

  // Primary mode: Stream raw binary chunk directly to disk without memory overhead
  const fileStream = fs.createWriteStream(chunkPath);
  req.pipe(fileStream);

  fileStream.on('finish', () => {
    res.json({
      success: true,
      chunkIndex,
      uploadId,
    });
  });

  fileStream.on('error', (err) => {
    console.error('Binary chunk write error:', err);
    res.status(500).json({ error: 'Failed to write chunk data' });
  });

  req.on('error', (err) => {
    console.error('Binary chunk request error:', err);
    try { fileStream.close(); } catch {}
    res.status(500).json({ error: 'Request stream closed unexpectedly' });
  });
});

// CHUNKED VIDEO UPLOAD - Finalize and assemble
app.post('/api/upload-complete', async (req, res) => {
  try {
    const { uploadId, fileName, title, totalChunks } = req.body;
    if (!uploadId || !totalChunks) {
      return res.status(400).json({ error: 'Missing uploadId or totalChunks' });
    }

    const cleanUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    const chunkDir = path.join(CHUNKS_DIR, cleanUploadId);

    if (!fs.existsSync(chunkDir)) {
      return res.status(400).json({ error: 'Upload chunk directory not found' });
    }

    const total = parseInt(totalChunks, 10);
    const ext = path.extname(fileName || 'movie.mp4').toLowerCase() || '.mp4';
    const cleanName = path.basename(fileName || 'movie', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = `${Date.now()}_${cleanName}${ext}`;
    const finalFilePath = path.join(UPLOADS_DIR, finalFilename);

    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < total; i++) {
      const chunkFilename = `chunk_${i.toString().padStart(6, '0')}`;
      const chunkPath = path.join(chunkDir, chunkFilename);

      if (!fs.existsSync(chunkPath)) {
        writeStream.close();
        return res.status(400).json({ error: `Missing chunk ${i} (${chunkFilename})` });
      }

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', () => {
          // Immediately delete chunk to free disk space and avoid peak disk bloat
          try {
            if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
          } catch (e) {
            // ignore
          }
          resolve();
        });
        readStream.on('error', (err) => {
          writeStream.close();
          reject(err);
        });
      });
    }

    writeStream.end();
    await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));

    // Cleanup chunk directory
    try {
      if (fs.existsSync(chunkDir)) {
        fs.rmdirSync(chunkDir);
      }
    } catch (e) {
      // ignore cleanup errors
    }

    // Probe the final assembled file
    const probe = await probeVideo(finalFilePath);
    const projectId = `proj_${Date.now()}`;
    const posterFilename = `${projectId}_poster.jpg`;
    const posterPath = path.join(THUMBNAILS_DIR, posterFilename);

    try {
      await extractPoster(finalFilePath, posterPath, Math.min(2.0, probe.duration * 0.1));
    } catch (e) {
      console.warn('Poster extraction warning:', e);
    }

    const movieTitle = (title || path.basename(fileName, ext)).replace(/[_-]+/g, ' ').trim();
    const movieMetadata: MovieMetadata = {
      id: `mov_${Date.now()}`,
      title: movieTitle,
      originalName: fileName || 'video.mp4',
      duration: Math.round(probe.duration * 10) / 10,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      bitrate: probe.bitrate,
      size: probe.size,
      format: probe.format,
      videoUrl: `/storage/uploads/${path.basename(finalFilePath)}`,
      videoPath: finalFilePath,
      posterUrl: fs.existsSync(posterPath) ? `/storage/thumbnails/${posterFilename}` : '',
      uploadedAt: new Date().toISOString(),
      isSample: false,
    };

    const defaultSettings: RecapSettings = {
      targetDuration: probe.duration > 300 ? 180 : Math.max(30, Math.round(probe.duration * 0.4)),
      presetName: '3-min',
      resolution: '1080p',
      aspectRatio: '16:9',
      transition: 'cut',
      pacing: 'balanced',
    };

    const project: MovieProject = {
      id: projectId,
      title: movieTitle,
      movieMetadata,
      activeSettings: defaultSettings,
      selectedScenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);

    res.json({
      success: true,
      project,
    });
  } catch (err: any) {
    console.error('Upload complete assembly error:', err);
    res.status(500).json({ error: err.message || 'Failed to assemble chunked video' });
  }
});

// LOAD SAMPLE MOVIE
app.post('/api/sample-movie', async (_req, res) => {
  try {
    const sampleFilePath = path.join(SAMPLES_DIR, 'sample_cybernetic_horizon.mp4');
    await generateSampleMovie(sampleFilePath);

    const probe = await probeVideo(sampleFilePath);
    const projectId = `proj_sample_${Date.now()}`;
    const posterFilename = `sample_poster.jpg`;
    const posterPath = path.join(THUMBNAILS_DIR, posterFilename);

    try {
      await extractPoster(sampleFilePath, posterPath, 2.0);
    } catch (e) {
      console.warn('Sample poster error:', e);
    }

    const movieMetadata: MovieMetadata = {
      id: 'mov_sample_cybernetic',
      title: 'Cybernetic Horizon: Origin',
      originalName: 'sample_cybernetic_horizon.mp4',
      duration: Math.round(probe.duration * 10) / 10,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      bitrate: probe.bitrate,
      size: probe.size,
      format: probe.format,
      videoUrl: `/storage/samples/${path.basename(sampleFilePath)}`,
      videoPath: sampleFilePath,
      posterUrl: fs.existsSync(posterPath) ? `/storage/thumbnails/${posterFilename}` : '',
      uploadedAt: new Date().toISOString(),
      isSample: true,
    } as any;

    const defaultSettings: RecapSettings = {
      targetDuration: 45,
      presetName: '1-min',
      resolution: '1080p',
      aspectRatio: '16:9',
      transition: 'cut',
      pacing: 'balanced',
    };

    const project: MovieProject = {
      id: projectId,
      title: 'Cybernetic Horizon: Origin',
      movieMetadata,
      activeSettings: defaultSettings,
      selectedScenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);

    res.json({
      success: true,
      project,
    });
  } catch (err: any) {
    console.error('Sample movie error:', err);
    res.status(500).json({ error: err.message || 'Failed to load sample movie' });
  }
});

// START ANALYSIS JOB
app.post('/api/analyze', async (req, res) => {
  try {
    const { projectId, targetDuration } = req.body;
    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const duration = targetDuration || project.activeSettings.targetDuration || 180;
    const jobId = `job_analyze_${Date.now()}`;

    // Create job with STEP 1
    jobManager.createJob(jobId, 'analysis', 'STEP 1: Uploading Video / Initializing Engine');
    jobManager.updateJob(jobId, {
      progress: 5,
      stageDescription: 'Validating video source and allocating processing buffers...',
    });

    // Run async in background
    (async () => {
      try {
        const analysis = await runMovieAnalysis(project.movieMetadata, duration, jobId);

        // Update project with analysis
        project.analysis = analysis;
        project.selectedScenes = analysis.scenes.filter((s) => s.isSelected);
        project.activeSettings.targetDuration = duration;
        saveProject(project);

        jobManager.completeJob(jobId, { analysis, selectedScenes: project.selectedScenes });
      } catch (err: any) {
        console.error('Analysis error:', err);
        jobManager.failJob(jobId, err.message || 'Failed during movie analysis');
      }
    })();

    res.json({
      success: true,
      jobId,
    });
  } catch (err: any) {
    console.error('Analyze trigger error:', err);
    res.status(500).json({ error: err.message || 'Failed to start analysis job' });
  }
});

// RE-SOLVE SELECTION FOR NEW DURATION
app.post('/api/recalculate-selection', (req, res) => {
  try {
    const { projectId, targetDuration } = req.body;
    const project = getProjectById(projectId);
    if (!project || !project.analysis) {
      return res.status(404).json({ error: 'Project or analysis not found.' });
    }

    const selected = solveRecapSelection(project.analysis.scenes, targetDuration);
    const selectedIds = new Set(selected.map((s) => s.id));

    // Update scenes in analysis
    for (const sc of project.analysis.scenes) {
      sc.isSelected = selectedIds.has(sc.id);
    }
    project.selectedScenes = selected;
    project.activeSettings.targetDuration = targetDuration;
    saveProject(project);

    res.json({
      success: true,
      selectedScenes: selected,
      scenes: project.analysis.scenes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// START RENDER JOB
app.post('/api/render', async (req, res) => {
  try {
    const { projectId, scenes, settings } = req.body;
    const project = getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const scenesToRender: SceneData[] = scenes || project.selectedScenes;
    if (!scenesToRender || scenesToRender.length === 0) {
      return res.status(400).json({ error: 'No scenes selected for recap render.' });
    }

    const renderSettings: RecapSettings = settings || project.activeSettings;
    const jobId = `job_render_${Date.now()}`;
    const outputFileName = `recap_${project.id}_${Date.now()}.mp4`;
    const outputPath = path.join(RENDERS_DIR, outputFileName);
    const videoSource = (project.movieMetadata as any).videoPath || path.resolve(ROOT_DIR, project.movieMetadata.videoUrl.replace(/^\//, ''));

    if (!fs.existsSync(videoSource)) {
      return res.status(400).json({ error: `Source movie file not found at ${videoSource}` });
    }

    jobManager.createJob(jobId, 'render', 'STEP 7: Preparing Video Timeline');

    (async () => {
      try {
        const { finalDuration, fileSize } = await renderRecapVideo(
          videoSource,
          scenesToRender,
          outputPath,
          renderSettings,
          jobId
        );

        const renderedRecap: RenderedRecap = {
          id: `recap_${Date.now()}`,
          projectId: project.id,
          title: `${project.title} - ${renderSettings.presetName.toUpperCase()} Recap`,
          videoUrl: `/storage/renders/${outputFileName}`,
          downloadUrl: `/api/download?file=renders/${outputFileName}&name=${encodeURIComponent(project.title.replace(/\s+/g, '_'))}_Recap.mp4`,
          duration: Math.round(finalDuration * 10) / 10,
          targetDuration: renderSettings.targetDuration,
          originalDuration: project.movieMetadata.duration,
          compressionRatio: `${Math.round(((project.movieMetadata.duration - finalDuration) / project.movieMetadata.duration) * 100)}% shorter`,
          sceneCount: scenesToRender.length,
          resolution: renderSettings.resolution,
          aspectRatio: renderSettings.aspectRatio,
          fileSize,
          createdAt: new Date().toISOString(),
          scenesSummary: scenesToRender.map((s) => ({
            title: s.title,
            duration: Math.round(((s.customTrimEnd ?? s.end) - (s.customTrimStart ?? s.start)) * 10) / 10,
            timestamp: `${s.customTrimStart ?? s.start}s - ${s.customTrimEnd ?? s.end}s`,
            role: s.narrativeRole,
          })),
        };

        project.lastRenderedRecap = renderedRecap;
        project.selectedScenes = scenesToRender;
        project.activeSettings = renderSettings;
        saveProject(project);

        jobManager.completeJob(jobId, renderedRecap);
      } catch (err: any) {
        console.error('Render error:', err);
        jobManager.failJob(jobId, err.message || 'Rendering failed');
      }
    })();

    res.json({
      success: true,
      jobId,
    });
  } catch (err: any) {
    console.error('Render trigger error:', err);
    res.status(500).json({ error: err.message || 'Failed to start rendering job' });
  }
});

// JOB STATUS POLLING
app.get('/api/jobs/:id', (req, res) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// JOB SSE STREAM
app.get('/api/jobs/:id/stream', (req, res) => {
  const jobId = req.params.id;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (updatedJob: any) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
  };

  sendUpdate(job);

  const listener = (data: any) => {
    sendUpdate(data);
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
      cleanup();
    }
  };

  const cleanup = () => {
    jobManager.off(`update:${jobId}`, listener);
    res.end();
  };

  jobManager.on(`update:${jobId}`, listener);
  req.on('close', cleanup);
});

// CANCEL JOB
app.post('/api/jobs/:id/cancel', (req, res) => {
  const success = jobManager.cancelJob(req.params.id);
  res.json({ success });
});

// PROJECTS CRUD
app.get('/api/projects', (_req, res) => {
  const projects = getProjects();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const updated = { ...project, ...req.body, updatedAt: new Date().toISOString() };
  saveProject(updated);
  res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
  const success = deleteProject(req.params.id);
  res.json({ success });
});

// VITE MIDDLEWARE INTEGRATION
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MovieCut AI Studio running on http://0.0.0.0:${PORT}`);
  });
  // 30-minute timeout for large 1GB+ movie uploads and long FFmpeg renders
  server.timeout = 1000 * 60 * 30;
  server.keepAliveTimeout = 1000 * 60 * 5;
  server.headersTimeout = 1000 * 60 * 6;
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
