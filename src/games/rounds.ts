/** Shared rules for the drag games: how rounds are grouped into sets and how hard they get. */

export type Level = 'easy' | 'hard';

/** After this many solved rounds the child earns a celebration and the game gets harder. */
export const ROUNDS_PER_SET = 5;

/** The first set is easy; every set after it is harder. */
export function levelFor(solvedRounds: number, setSize = ROUNDS_PER_SET): Level {
  return solvedRounds < setSize ? 'easy' : 'hard';
}

/** True when the round that was just solved finished a set. */
export function finishedSet(solvedRounds: number, setSize = ROUNDS_PER_SET): boolean {
  return solvedRounds > 0 && solvedRounds % setSize === 0;
}

/** How many stars are lit: the rounds solved in the current set (all of them right after a set). */
export function starsLit(solvedRounds: number, setSize = ROUNDS_PER_SET): number {
  if (finishedSet(solvedRounds, setSize)) return setSize;
  return solvedRounds % setSize;
}
