import type { StrategyHistoryRow } from '@/lib/strategy-workbench-data';

const STORAGE_KEY = 'hyundai-ai-strategy-generation-jobs';
const MOCK_GENERATION_DELAY_MS = 5000;

export interface AsyncStrategyHistoryRow extends StrategyHistoryRow {
  requestKey: string;
  readyAt: number;
}

export type AsyncStrategyRequest = Omit<AsyncStrategyHistoryRow, 'id' | 'caseId' | 'status' | 'createdAt' | 'readyAt'>;

function loadJobs(): AsyncStrategyHistoryRow[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: AsyncStrategyHistoryRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function createdAtLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function enqueueAsyncStrategy(request: AsyncStrategyRequest) {
  const jobs = loadJobs();
  const existing = jobs.find((job) => job.requestKey === request.requestKey);
  if (existing) return existing;

  const now = new Date();
  const sequence = 29 + jobs.length;
  const job: AsyncStrategyHistoryRow = {
    ...request,
    id: `ST-${now.getFullYear()}-${String(sequence).padStart(3, '0')}`,
    caseId: `ASYNC-${request.requestKey}`,
    status: 'GENERATING',
    createdAt: createdAtLabel(now),
    readyAt: now.getTime() + MOCK_GENERATION_DELAY_MS,
  };

  saveJobs([job, ...jobs]);
  return job;
}

export function getAsyncStrategyRows(now = Date.now()): AsyncStrategyHistoryRow[] {
  const jobs = loadJobs();
  let changed = false;
  const resolved = jobs.map((job) => {
    if (job.status === 'GENERATING' && now >= job.readyAt) {
      changed = true;
      return { ...job, status: 'READY' as const };
    }
    return job;
  });

  if (changed) saveJobs(resolved);
  return resolved;
}
