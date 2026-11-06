import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MovieProject } from '../src/types/moviecut.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');
export const STORAGE_DIR = path.resolve(ROOT_DIR, 'storage');
export const UPLOADS_DIR = path.resolve(STORAGE_DIR, 'uploads');
export const CHUNKS_DIR = path.resolve(UPLOADS_DIR, 'chunks');
export const THUMBNAILS_DIR = path.resolve(STORAGE_DIR, 'thumbnails');
export const CLIPS_DIR = path.resolve(STORAGE_DIR, 'clips');
export const RENDERS_DIR = path.resolve(STORAGE_DIR, 'renders');
export const SAMPLES_DIR = path.resolve(STORAGE_DIR, 'samples');
const PROJECTS_FILE = path.resolve(STORAGE_DIR, 'projects.json');

export function initStorage() {
  const dirs = [STORAGE_DIR, UPLOADS_DIR, CHUNKS_DIR, THUMBNAILS_DIR, CLIPS_DIR, RENDERS_DIR, SAMPLES_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2));
  }
}

export function getProjects(): MovieProject[] {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return [];
    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read projects:', err);
    return [];
  }
}

export function saveProject(project: MovieProject): void {
  try {
    const projects = getProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...projects[index], ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift(project);
    }
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Failed to save project:', err);
  }
}

export function getProjectById(id: string): MovieProject | undefined {
  const projects = getProjects();
  return projects.find((p) => p.id === id);
}

export function deleteProject(id: string): boolean {
  try {
    const projects = getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(filtered, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to delete project:', err);
    return false;
  }
}

export function cleanDirectory(dir: string, olderThanMs = 1000 * 60 * 60 * 24) {
  try {
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile() && now - stat.mtimeMs > olderThanMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('Error cleaning directory:', dir, err);
  }
}
