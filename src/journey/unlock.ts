import type { GameId } from '../content';
import type { StopDefinition } from './stops';

/**
 * Decides whether a stop can be opened.
 * Today every stop is open. A different policy (for example `sequentialPolicy`) can be
 * plugged in later without changing the road screen.
 */
export type UnlockPolicy = (stopIndex: number, stops: readonly StopDefinition[]) => boolean;

export const openPolicy: UnlockPolicy = () => true;

/** A stop opens once the stop before it has been completed. The first stop is always open. */
export function sequentialPolicy(completedGames: ReadonlySet<GameId>): UnlockPolicy {
  return (stopIndex, stops) => {
    if (stopIndex === 0) return true;
    const previousStop = stops[stopIndex - 1];
    return previousStop !== undefined && completedGames.has(previousStop.game);
  };
}
