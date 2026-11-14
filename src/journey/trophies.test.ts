import { describe, expect, it } from 'vitest';
import {
  EMPTY_TROPHY_RECORD,
  MAX_REPLAY_REWARDS_PER_DAY,
  localDay,
  trophiesForFinish,
  type TrophyRecord,
} from './trophies';

const DAY = '2026-11-14';
const NEXT_DAY = '2026-11-15';

function finishTimes(times: number, level: 1 | 2 | 3 | 4 | 5, day = DAY): number[] {
  let record: TrophyRecord = EMPTY_TROPHY_RECORD;
  const given: number[] = [];
  for (let index = 0; index < times; index++) {
    const reward = trophiesForFinish(record, level, day);
    given.push(reward.trophies);
    record = reward.record;
  }
  return given;
}

describe('trophiesForFinish', () => {
  it('gives more trophies for a first finish higher up the ladder', () => {
    expect(finishTimes(1, 1)).toEqual([2]);
    expect(finishTimes(1, 2)).toEqual([3]);
    expect(finishTimes(1, 3)).toEqual([4]);
    expect(finishTimes(1, 4)).toEqual([5]);
  });

  it('gives 1 trophy for a replay, at most twice a day, then 0 (never negative)', () => {
    expect(finishTimes(5, 1)).toEqual([2, 1, 1, 0, 0]);
    expect(MAX_REPLAY_REWARDS_PER_DAY).toBe(2);
  });

  it('says when today’s replay trophies were already given', () => {
    let record: TrophyRecord = EMPTY_TROPHY_RECORD;
    for (let index = 0; index < 3; index++) record = trophiesForFinish(record, 1, DAY).record;
    const reward = trophiesForFinish(record, 1, DAY);
    expect(reward.cappedToday).toBe(true);
    expect(reward.record.finishes).toBe(4);
  });

  it('opens replay rewards again on a new day', () => {
    let record: TrophyRecord = EMPTY_TROPHY_RECORD;
    for (let index = 0; index < 4; index++) record = trophiesForFinish(record, 1, DAY).record;
    expect(trophiesForFinish(record, 1, NEXT_DAY).trophies).toBe(1);
  });

  it('adds a bonus only when trophies are given at all', () => {
    expect(trophiesForFinish(EMPTY_TROPHY_RECORD, 4, DAY, 1).trophies).toBe(6);
    let record: TrophyRecord = EMPTY_TROPHY_RECORD;
    for (let index = 0; index < 3; index++) record = trophiesForFinish(record, 4, DAY).record;
    expect(trophiesForFinish(record, 4, DAY, 1).trophies).toBe(0);
  });
});

describe('localDay', () => {
  it('is the local date as YYYY-MM-DD', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
