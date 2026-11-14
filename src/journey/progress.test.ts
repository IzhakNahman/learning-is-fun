import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  clearStars,
  finishGame,
  isFinished,
  loadProgress,
  migrateOldPlayed,
  nextGameToPlay,
  parseProgress,
  recordStar,
  starItem,
  starsOf,
  type Progress,
} from './progress';
import { STOPS } from './stops';

const DAY = '2026-11-14';
const GAMES = STOPS.map((stop) => stop.game);

function starAll(progress: Progress, ids: string[], goal = ids.length): Progress {
  return ids.reduce(
    (current, id) => starItem(current, 'colors', id, goal, 1, DAY).progress,
    progress,
  );
}

describe('starItem', () => {
  it('gives each item one star', () => {
    let progress = starItem(EMPTY_PROGRESS, 'colors', 'red', 3, 1, DAY).progress;
    const again = starItem(progress, 'colors', 'red', 3, 1, DAY);
    expect(again.isNew).toBe(false);
    progress = again.progress;
    expect([...starsOf(progress, 'colors')]).toEqual(['red']);
    expect(isFinished(progress, 'colors')).toBe(false);
  });

  it('finishes the game exactly when the goal is reached, with trophies', () => {
    const before = starAll(EMPTY_PROGRESS, ['red', 'blue'], 3);
    expect(isFinished(before, 'colors')).toBe(false);
    const last = starItem(before, 'colors', 'green', 3, 1, DAY);
    expect(last.finished).toEqual({ trophies: 2, cappedToday: false, firstTime: true });
    expect(isFinished(last.progress, 'colors')).toBe(true);
    expect(last.progress.trophies).toBe(2);
  });

  it('does not finish again for extra stars in the same run', () => {
    const done = starAll(EMPTY_PROGRESS, ['red', 'blue'], 2);
    const extra = starItem(done, 'colors', 'green', 2, 1, DAY);
    expect(extra.finished).toBeNull();
    expect(extra.progress.trophies).toBe(2);
  });
});

describe('play again', () => {
  it('clears the stars but keeps the ✓ and the trophies, and a replay earns 1', () => {
    const done = starAll(EMPTY_PROGRESS, ['red', 'blue']);
    const cleared = clearStars(done, 'colors');
    expect(starsOf(cleared, 'colors').size).toBe(0);
    expect(isFinished(cleared, 'colors')).toBe(true);
    expect(cleared.trophies).toBe(2);
    const replayed = starAll(cleared, ['red', 'blue']);
    expect(replayed.trophies).toBe(3);
  });
});

describe('finishGame (round games)', () => {
  it('counts every finished set, with the daily replay cap', () => {
    let progress = EMPTY_PROGRESS;
    const given: number[] = [];
    for (let index = 0; index < 4; index++) {
      const step = finishGame(progress, 'count', 2, DAY);
      given.push(step.result.trophies);
      progress = step.progress;
    }
    expect(given).toEqual([3, 1, 1, 0]);
    expect(progress.trophies).toBe(5);
  });
});

describe('nextGameToPlay', () => {
  it('is the first game that is not finished (opening a game does not count)', () => {
    expect(nextGameToPlay(STOPS, EMPTY_PROGRESS)).toBe(STOPS[0]!.game);
    const first = finishGame(EMPTY_PROGRESS, STOPS[0]!.game, 1, DAY).progress;
    expect(nextGameToPlay(STOPS, first)).toBe(STOPS[1]!.game);
  });

  it('goes back to the first game when everything is finished', () => {
    const all = GAMES.reduce(
      (progress, game) => finishGame(progress, game, 1, DAY).progress,
      EMPTY_PROGRESS,
    );
    expect(nextGameToPlay(STOPS, all)).toBe(STOPS[0]!.game);
  });
});

describe('saved progress', () => {
  it('survives a round trip and drops broken or unknown parts', () => {
    const done = starAll(EMPTY_PROGRESS, ['red']);
    expect(parseProgress(JSON.stringify(done), GAMES)).toEqual(done);
    expect(parseProgress('not json', GAMES)).toEqual(EMPTY_PROGRESS);
    const odd = parseProgress(
      '{"trophies":-3,"games":{"colors":{"stars":["a","a",5],"finishes":"x"},"nope":{}}}',
      GAMES,
    );
    expect(odd.trophies).toBe(0);
    expect(odd.games.colors).toEqual({
      stars: ['a'],
      finishes: 0,
      replayDay: '',
      replayRewards: 0,
    });
    expect(Object.keys(odd.games)).toEqual(['colors']);
  });

  it('keeps only really finished games from the old save', () => {
    const migrated = migrateOldPlayed('numbers,colors,count,mix', GAMES);
    expect(isFinished(migrated, 'count')).toBe(true);
    expect(isFinished(migrated, 'mix')).toBe(true);
    expect(isFinished(migrated, 'numbers')).toBe(false);
    expect(isFinished(migrated, 'colors')).toBe(false);
  });

  describe('on the device', () => {
    beforeEach(() => localStorage.clear());

    it('saves stars and finishes so they are there after a reload', () => {
      recordStar('colors', 'red', 2);
      const result = recordStar('colors', 'blue', 2);
      expect(result.finished?.trophies).toBe(2);
      const reloaded = loadProgress();
      expect(isFinished(reloaded, 'colors')).toBe(true);
      expect(reloaded.trophies).toBe(2);
    });

    it('reads the old save once, until the new one exists', () => {
      localStorage.setItem('learning-is-fun:finished-games', 'count,numbers');
      expect(isFinished(loadProgress(), 'count')).toBe(true);
      expect(isFinished(loadProgress(), 'numbers')).toBe(false);
    });
  });
});
