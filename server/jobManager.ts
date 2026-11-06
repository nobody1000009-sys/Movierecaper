import { EventEmitter } from 'events';
import type { ProcessingJob, JobStatus } from '../src/types/moviecut.js';

class JobManager extends EventEmitter {
  private jobs: Map<string, ProcessingJob> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeProcesses: Map<string, Set<any>> = new Map();

  createJob(id: string, type: 'analysis' | 'render', initialStepName = 'Initializing'): ProcessingJob {
    const job: ProcessingJob = {
      id,
      type,
      status: 'running',
      currentStep: 1,
      stepName: initialStepName,
      stageDescription: 'Preparing task parameters...',
      progress: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.jobs.set(id, job);
    this.abortControllers.set(id, new AbortController());
    this.activeProcesses.set(id, new Set());
    this.emit(`update:${id}`, job);
    return job;
  }

  getJob(id: string): ProcessingJob | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<ProcessingJob>): ProcessingJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, updates, { updatedAt: Date.now() });
    this.emit(`update:${id}`, job);
    return job;
  }

  registerProcess(jobId: string, proc: any): void {
    const set = this.activeProcesses.get(jobId);
    if (set) {
      set.add(proc);
      proc.on('close', () => set.delete(proc));
      proc.on('error', () => set.delete(proc));
    }
  }

  getAbortSignal(id: string): AbortSignal | undefined {
    return this.abortControllers.get(id)?.signal;
  }

  isCancelled(id: string): boolean {
    const job = this.jobs.get(id);
    return job?.status === 'cancelled';
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status === 'completed' || job.status === 'failed') return false;

    job.status = 'cancelled';
    job.stageDescription = 'Job cancelled by user';
    job.updatedAt = Date.now();

    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }

    const procs = this.activeProcesses.get(id);
    if (procs) {
      for (const proc of procs) {
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          // ignore
        }
      }
      procs.clear();
    }

    this.emit(`update:${id}`, job);
    return true;
  }

  completeJob(id: string, result: any): ProcessingJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    job.status = 'completed';
    job.progress = 100;
    job.currentStep = 10;
    job.stepName = 'Complete';
    job.stageDescription = 'All processing stages finished successfully.';
    job.result = result;
    job.updatedAt = Date.now();

    this.emit(`update:${id}`, job);
    return job;
  }

  failJob(id: string, errorMsg: string): ProcessingJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    job.status = 'failed';
    job.error = errorMsg;
    job.stageDescription = `Failed: ${errorMsg}`;
    job.updatedAt = Date.now();

    this.emit(`update:${id}`, job);
    return job;
  }
}

export const jobManager = new JobManager();
