import { db } from '../db';
import { lineHistory } from '../schema';
import { gte } from 'drizzle-orm';

export interface LineHistory {
  game_id: string;
  opening_line: number;
  max_line: number;
  min_line: number;
  last_updated: string;
}

// In-memory cache for line tracking (synced with Neon DB for persistence)
const lineCache = new Map<string, LineHistory>();
let lineCacheInitialized = false;

// Load line history from DB on first request
async function initializeLineCache(): Promise<void> {
  if (lineCacheInitialized) return;

  try {
    // Get today's date for filtering (lines from today only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await db.query.lineHistory.findMany({
      where: gte(lineHistory.lastUpdated, today),
    });

    for (const row of data) {
      lineCache.set(row.gameId, {
        game_id: row.gameId,
        opening_line: row.openingLine,
        max_line: row.maxLine,
        min_line: row.minLine,
        last_updated: row.lastUpdated.toISOString(),
      });
    }
    console.log(`Line cache initialized with ${data.length} games from Neon DB`);
  } catch (err) {
    console.error('Failed to initialize line cache:', err);
  }

  lineCacheInitialized = true;
}

// Save line history to DB
async function persistLineHistory(history: LineHistory): Promise<void> {
  try {
    await db.insert(lineHistory).values({
      gameId: history.game_id,
      openingLine: history.opening_line,
      maxLine: history.max_line,
      minLine: history.min_line,
      lastUpdated: new Date(history.last_updated),
    }).onConflictDoUpdate({
      target: lineHistory.gameId,
      set: {
        openingLine: history.opening_line,
        maxLine: history.max_line,
        minLine: history.min_line,
        lastUpdated: new Date(history.last_updated),
      }
    });

  } catch (err) {
    console.error('Error persisting line history:', err);
  }
}

export async function updateLineCache(gameId: string, currentLine: number): Promise<LineHistory> {
  // Initialize cache from DB on first call
  await initializeLineCache();

  const existing = lineCache.get(gameId);
  const now = new Date().toISOString();

  if (existing) {
    // Update max/min
    const newMax = Math.max(existing.max_line, currentLine);
    const newMin = Math.min(existing.min_line, currentLine);

    // Only persist if values changed
    if (newMax !== existing.max_line || newMin !== existing.min_line) {
      existing.max_line = newMax;
      existing.min_line = newMin;
      existing.last_updated = now;
      // Persist asynchronously (don't await to avoid blocking)
      persistLineHistory(existing);
    }
    return existing;
  } else {
    // First time seeing this game
    const newEntry: LineHistory = {
      game_id: gameId,
      opening_line: currentLine,
      max_line: currentLine,
      min_line: currentLine,
      last_updated: now,
    };
    lineCache.set(gameId, newEntry);
    // Persist new entry
    persistLineHistory(newEntry);
    return newEntry;
  }
}

export function getLineHistory(gameId: string): LineHistory | null {
  return lineCache.get(gameId) || null;
}

// Clear old entries (games that ended) - call periodically
export function cleanLineCache(activeGameIds: string[]): void {
  const activeSet = new Set(activeGameIds);
  const keysToDelete: string[] = [];
  lineCache.forEach((_, gameId) => {
    if (!activeSet.has(gameId)) {
      keysToDelete.push(gameId);
    }
  });
  keysToDelete.forEach(key => lineCache.delete(key));
}
