import type { GameId } from '../content';
import { readSetting, writeSetting } from '../core/storage';
import { STOPS } from './stops';
import type { StopDefinition } from './stops';

/** A new key: older saves marked a star game as soon as it was opened. */
const PLAYED_KEY = 'finished-games';

/** Games with stars. They get a ✓ only after a whole set of stars is earned, not on opening. */
export const STAR_GAMES: ReadonlySet<GameId> = new Set<GameId>([
  'lookalike',
  'count',
  'mix',
  'starts',
  'add',
]);

/** Games without stars are marked as soon as they are opened. */
export function isMarkedOnOpen(game: GameId): boolean {
  return !STAR_GAMES.has(game);
}

/** Called by a star game when the child has just earned all the stars of a set. */
export function markStarGameFinished(game: GameId): void {
  markGamePlayed(game, STOPS);
}

/** Reads the saved list of opened games, ignoring anything that is not a known game. */
export function parsePlayedGames(saved: string | null, knownGames: readonly GameId[]): Set<GameId> {
  const names = saved ? saved.split(',') : [];
  return new Set(knownGames.filter((game) => names.includes(game)));
}

export function loadPlayedGames(stops: readonly StopDefinition[]): Set<GameId> {
  return parsePlayedGames(
    readSetting(PLAYED_KEY),
    stops.map((stop) => stop.game),
  );
}

export function markGamePlayed(game: GameId, stops: readonly StopDefinition[]): void {
  const played = loadPlayedGames(stops).add(game);
  writeSetting(PLAYED_KEY, [...played].join(','));
}

/** The first game on the road the child has not opened yet; the first game once all were opened. */
export function nextGameToPlay(
  stops: readonly StopDefinition[],
  played: ReadonlySet<GameId>,
): GameId | null {
  const next = stops.find((stop) => !played.has(stop.game)) ?? stops[0];
  return next?.game ?? null;
}
