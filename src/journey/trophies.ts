/**
 * Trophy rules (pure, no storage). Trophies are only collected and shown for now.
 *
 * Best practice for young children: reward finishing, never take anything away, no timers or
 * streaks. Replaying is welcome but worth less (so new games stay attractive), and a daily cap
 * keeps one favourite game from being farmed.
 */

/** Where a game sits on the learning ladder: 1 = first steps … 5 = reading. */
export type RoadLevel = 1 | 2 | 3 | 4 | 5;

const FIRST_FINISH_TROPHIES: Record<RoadLevel, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 5 };
export const REPLAY_TROPHIES = 1;
export const MAX_REPLAY_REWARDS_PER_DAY = 2;

/** What we remember about one game's trophies. */
export interface TrophyRecord {
  /** How many times the game was finished (0 = never). */
  finishes: number;
  /** The local date (YYYY-MM-DD) of the last replay reward. */
  replayDay: string;
  /** Replay rewards given on `replayDay`. */
  replayRewards: number;
}

export const EMPTY_TROPHY_RECORD: TrophyRecord = { finishes: 0, replayDay: '', replayRewards: 0 };

export interface FinishReward {
  trophies: number;
  record: TrophyRecord;
  /** True when this was a replay and today's replay trophies for this game were already given. */
  cappedToday: boolean;
}

export function firstFinishTrophies(level: RoadLevel): number {
  return FIRST_FINISH_TROPHIES[level];
}

/**
 * Trophies for finishing a game. `bonus` (for a great result) is only added when trophies are
 * given at all, so it cannot get around the daily cap.
 */
export function trophiesForFinish(
  record: TrophyRecord,
  level: RoadLevel,
  today: string,
  bonus = 0,
): FinishReward {
  const finishes = record.finishes + 1;
  if (record.finishes === 0) {
    return {
      trophies: firstFinishTrophies(level) + bonus,
      record: { ...record, finishes },
      cappedToday: false,
    };
  }
  const rewardsToday = record.replayDay === today ? record.replayRewards : 0;
  if (rewardsToday >= MAX_REPLAY_REWARDS_PER_DAY) {
    return { trophies: 0, record: { ...record, finishes }, cappedToday: true };
  }
  return {
    trophies: REPLAY_TROPHIES + bonus,
    record: { finishes, replayDay: today, replayRewards: rewardsToday + 1 },
    cappedToday: false,
  };
}

/** The device's local date as YYYY-MM-DD (a "day" for the daily cap). */
export function localDay(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
