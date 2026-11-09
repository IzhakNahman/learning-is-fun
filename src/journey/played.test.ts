import { describe, expect, it } from 'vitest';
import { nextGameToPlay, parsePlayedGames } from './played';
import { STOPS } from './stops';

const GAMES = STOPS.map((stop) => stop.game);

describe('parsePlayedGames', () => {
  it('reads saved games and ignores unknown names', () => {
    const played = parsePlayedGames('numbers,unknown,letters', GAMES);
    expect([...played].sort()).toEqual(['letters', 'numbers']);
  });

  it('is empty when nothing was saved', () => {
    expect(parsePlayedGames(null, GAMES).size).toBe(0);
    expect(parsePlayedGames('', GAMES).size).toBe(0);
  });
});

describe('nextGameToPlay', () => {
  it('points at the first stop on a fresh start', () => {
    expect(nextGameToPlay(STOPS, new Set())).toBe(GAMES[0]);
  });

  it('skips games that were already opened', () => {
    const played = new Set([GAMES[0]!, GAMES[1]!]);
    expect(nextGameToPlay(STOPS, played)).toBe(GAMES[2]);
  });

  it('goes back to the first stop when every game was opened', () => {
    expect(nextGameToPlay(STOPS, new Set(GAMES))).toBe(GAMES[0]);
  });

  it('has nothing to point at when there are no stops', () => {
    expect(nextGameToPlay([], new Set())).toBeNull();
  });
});
