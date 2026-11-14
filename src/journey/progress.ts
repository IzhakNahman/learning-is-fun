import type { GameId } from '../content';
import { readSetting, writeSetting } from '../core/storage';
import { STOPS, type StopDefinition } from './stops';
import {
  EMPTY_TROPHY_RECORD,
  localDay,
  trophiesForFinish,
  type RoadLevel,
  type TrophyRecord,
} from './trophies';

/**
 * The child's progress: a ⭐ for every item done in a game, "finished" when the game's goal is
 * reached, and trophies. Saved on the device only.
 *
 * The pure functions take and return a `Progress` value, so they are easy to test; the small
 * functions at the bottom load, change and save it.
 */

export interface GameProgress extends TrophyRecord {
  /** Items done in the current run (a letter key, a number, a colour id ...). */
  stars: string[];
}

export interface Progress {
  trophies: number;
  games: Partial<Record<GameId, GameProgress>>;
}

export const EMPTY_PROGRESS: Progress = { trophies: 0, games: {} };

const PROGRESS_KEY = 'progress-v2';
/** The old save: a list of games with a ✓ (star games were only marked when finished). */
const OLD_PLAYED_KEY = 'finished-games';
const OLD_FINISHED_STAR_GAMES: ReadonlySet<string> = new Set([
  'lookalike',
  'count',
  'mix',
  'starts',
  'add',
]);

export interface FinishResult {
  trophies: number;
  cappedToday: boolean;
  firstTime: boolean;
}

export interface StarResult {
  progress: Progress;
  /** False when the item already had its star. */
  isNew: boolean;
  /** Set when this star reached the goal: the game was just finished. */
  finished: FinishResult | null;
}

export function gameProgress(progress: Progress, game: GameId): GameProgress {
  return progress.games[game] ?? { ...EMPTY_TROPHY_RECORD, stars: [] };
}

export function isFinished(progress: Progress, game: GameId): boolean {
  return gameProgress(progress, game).finishes > 0;
}

export function starsOf(progress: Progress, game: GameId): ReadonlySet<string> {
  return new Set(gameProgress(progress, game).stars);
}

function withGame(progress: Progress, game: GameId, next: GameProgress): Progress {
  return { ...progress, games: { ...progress.games, [game]: next } };
}

/** Records a finish and its trophies (used directly by the round-based games). */
export function finishGame(
  progress: Progress,
  game: GameId,
  level: RoadLevel,
  today: string,
  bonus = 0,
): { progress: Progress; result: FinishResult } {
  const current = gameProgress(progress, game);
  const reward = trophiesForFinish(current, level, today, bonus);
  const next = withGame(progress, game, { ...current, ...reward.record });
  return {
    progress: { ...next, trophies: progress.trophies + reward.trophies },
    result: {
      trophies: reward.trophies,
      cappedToday: reward.cappedToday,
      firstTime: current.finishes === 0,
    },
  };
}

/** Gives an item its ⭐; when that reaches `goal` stars, the game is finished. */
export function starItem(
  progress: Progress,
  game: GameId,
  itemId: string,
  goal: number,
  level: RoadLevel,
  today: string,
): StarResult {
  const current = gameProgress(progress, game);
  if (current.stars.includes(itemId)) return { progress, isNew: false, finished: null };
  const stars = [...current.stars, itemId];
  const starred = withGame(progress, game, { ...current, stars });
  // Finish once per run: only the star that first reaches the goal counts.
  const reachedGoalNow = current.stars.length < goal && stars.length >= goal;
  if (!reachedGoalNow) return { progress: starred, isNew: true, finished: null };
  const { progress: done, result } = finishGame(starred, game, level, today);
  return { progress: done, isNew: true, finished: result };
}

/** "Play again": clears the stars so they can be earned again. The ✓ and trophies stay. */
export function clearStars(progress: Progress, game: GameId): Progress {
  const current = gameProgress(progress, game);
  return withGame(progress, game, { ...current, stars: [] });
}

/** The first game on the road that is not finished yet; the first game once all are. */
export function nextGameToPlay(
  stops: readonly StopDefinition[],
  progress: Progress,
): GameId | null {
  const next = stops.find((stop) => !isFinished(progress, stop.game)) ?? stops[0];
  return next?.game ?? null;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseGame(value: unknown): GameProgress | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const stars = Array.isArray(record.stars)
    ? record.stars.filter((star): star is string => typeof star === 'string')
    : [];
  return {
    stars: [...new Set(stars)],
    finishes: isWholeNumber(record.finishes) ? record.finishes : 0,
    replayDay: typeof record.replayDay === 'string' ? record.replayDay : '',
    replayRewards: isWholeNumber(record.replayRewards) ? record.replayRewards : 0,
  };
}

/** Reads a saved progress safely: anything broken or unknown is dropped, never thrown. */
export function parseProgress(saved: string | null, knownGames: readonly GameId[]): Progress {
  if (!saved) return EMPTY_PROGRESS;
  let data: unknown;
  try {
    data = JSON.parse(saved);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (typeof data !== 'object' || data === null) return EMPTY_PROGRESS;
  const raw = data as Record<string, unknown>;
  const rawGames = (typeof raw.games === 'object' && raw.games !== null ? raw.games : {}) as Record<
    string,
    unknown
  >;
  const games: Progress['games'] = {};
  for (const game of knownGames) {
    const parsed = parseGame(rawGames[game]);
    if (parsed) games[game] = parsed;
  }
  return { trophies: isWholeNumber(raw.trophies) ? raw.trophies : 0, games };
}

/**
 * The old save marked most games as soon as they were opened. Only the star games in it were
 * really finished, so only they keep their ✓ (with no trophies, since none existed then).
 */
export function migrateOldPlayed(saved: string | null, knownGames: readonly GameId[]): Progress {
  const names = saved ? saved.split(',') : [];
  const games: Progress['games'] = {};
  for (const game of knownGames) {
    if (!names.includes(game) || !OLD_FINISHED_STAR_GAMES.has(game)) continue;
    games[game] = { ...EMPTY_TROPHY_RECORD, finishes: 1, stars: [] };
  }
  return { trophies: 0, games };
}

// ---------- saved on the device ----------

const knownGames = (): GameId[] => STOPS.map((stop) => stop.game);

function levelOf(game: GameId): RoadLevel {
  return STOPS.find((stop) => stop.game === game)?.level ?? 1;
}

export function loadProgress(): Progress {
  const saved = readSetting(PROGRESS_KEY);
  if (saved) return parseProgress(saved, knownGames());
  return migrateOldPlayed(readSetting(OLD_PLAYED_KEY), knownGames());
}

function saveProgress(progress: Progress): void {
  writeSetting(PROGRESS_KEY, JSON.stringify(progress));
}

export function recordStar(game: GameId, itemId: string, goal: number): StarResult {
  const result = starItem(loadProgress(), game, itemId, goal, levelOf(game), localDay());
  saveProgress(result.progress);
  return result;
}

export function recordFinish(game: GameId, bonus = 0): FinishResult {
  const { progress, result } = finishGame(loadProgress(), game, levelOf(game), localDay(), bonus);
  saveProgress(progress);
  return result;
}

export function recordPlayAgain(game: GameId): void {
  saveProgress(clearStars(loadProgress(), game));
}
