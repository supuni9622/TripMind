import fs from 'fs/promises';
import path from 'path';
import type { Trip, IndexEntry, DocChunk } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

/** In-memory lock per tripId: serializes read-modify-write so concurrent updates don't overwrite each other. */
const lockTails = new Map<string, Promise<void>>();

/**
 * Run an async function while holding an exclusive lock for the given trip.
 * Only one writer per trip runs at a time; others wait in queue.
 */
export async function withTripLock<T>(tripId: string, fn: () => Promise<T>): Promise<T> {
  let resolveNext!: () => void;
  const next = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });
  const prev = lockTails.get(tripId) ?? Promise.resolve();
  lockTails.set(tripId, next);
  try {
    await prev;
    return await fn();
  } finally {
    resolveNext();
  }
}
const TRIPS_DIR = path.join(DATA_DIR, 'trips');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const INDEX_DIR = path.join(DATA_DIR, 'index');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureDataDirs() {
  await ensureDir(TRIPS_DIR);
  await ensureDir(UPLOADS_DIR);
  await ensureDir(INDEX_DIR);
}

export async function saveTrip(trip: Trip): Promise<void> {
  await ensureDir(TRIPS_DIR);
  const filePath = path.join(TRIPS_DIR, `${trip.id}.json`);
  const data = { ...trip, updatedAt: new Date().toISOString() };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const filePath = path.join(TRIPS_DIR, `${tripId}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
}

export async function getUploadDir(tripId: string): Promise<string> {
  const dir = path.join(UPLOADS_DIR, tripId);
  await ensureDir(dir);
  return dir;
}

export async function listUploads(tripId: string): Promise<{ name: string; size: number }[]> {
  const dir = path.join(UPLOADS_DIR, tripId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: { name: string; size: number }[] = [];
    for (const e of entries) {
      if (e.isFile()) {
        const stat = await fs.stat(path.join(dir, e.name));
        files.push({ name: e.name, size: stat.size });
      }
    }
    return files;
  } catch {
    return [];
  }
}

export async function getIndexPath(tripId: string): Promise<string> {
  return path.join(INDEX_DIR, `${tripId}.json`);
}

export async function loadIndex(tripId: string): Promise<IndexEntry | null> {
  const filePath = await getIndexPath(tripId);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as IndexEntry;
  } catch {
    return null;
  }
}

export async function saveIndex(entry: IndexEntry): Promise<void> {
  await ensureDir(INDEX_DIR);
  const filePath = path.join(INDEX_DIR, `${entry.tripId}.json`);
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

export async function appendChunksToIndex(tripId: string, newChunks: DocChunk[]): Promise<void> {
  const existing = await loadIndex(tripId);
  const chunks = [...(existing?.chunks ?? []), ...newChunks];
  await saveIndex({ tripId, chunks, noteChunks: existing?.noteChunks ?? [] });
}

export async function updateNoteChunks(tripId: string, noteChunks: { id: string; text: string; embedding?: number[] }[]): Promise<void> {
  const existing = await loadIndex(tripId);
  await saveIndex({
    tripId,
    chunks: existing?.chunks ?? [],
    noteChunks,
  });
}

export async function listTripIds(): Promise<string[]> {
  await ensureDir(TRIPS_DIR);
  const entries = await fs.readdir(TRIPS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name.replace(/\.json$/, ''));
}

export async function deleteTrip(tripId: string): Promise<void> {
  const tripPath = path.join(TRIPS_DIR, `${tripId}.json`);
  const uploadPath = path.join(UPLOADS_DIR, tripId);
  const indexPath = path.join(INDEX_DIR, `${tripId}.json`);
  await fs.rm(tripPath, { force: true });
  await fs.rm(uploadPath, { recursive: true, force: true });
  await fs.rm(indexPath, { force: true });
}

export async function cleanupOldTrips(ttlDays: number): Promise<number> {
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  const ids = await listTripIds();
  let deleted = 0;
  for (const id of ids) {
    const trip = await getTrip(id);
    if (trip && new Date(trip.updatedAt).getTime() < cutoff) {
      await deleteTrip(id);
      deleted++;
    }
  }
  return deleted;
}
