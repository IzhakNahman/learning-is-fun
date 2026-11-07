import type { RandomSource } from '../../core/random';
import { pickRandom, randomBetween } from '../../core/random';
import { SKY } from './config';
import type { Box, Cloud, Player } from './types';

export function createBox(
  letterKey: string,
  z: number,
  others: readonly Box[],
  random: RandomSource = Math.random,
): Box {
  const position = findFreeBoxPosition(others, random);
  return {
    x: position.x,
    y: position.y,
    z,
    letterKey,
    punchesTaken: 0,
    phase: 'approaching',
    hoverSeconds: 0,
    shakeSeconds: 0,
    yaw: randomBetween(-SKY.BOX_YAW_RANGE, SKY.BOX_YAW_RANGE, random),
    hue: pickRandom(SKY.BOX_HUES, random) ?? 200,
    bobPhase: randomBetween(0, 6, random),
  };
}

const MAX_POSITION_ATTEMPTS = 14;

function findFreeBoxPosition(
  others: readonly Box[],
  random: RandomSource,
): { x: number; y: number } {
  let candidate = { x: 0, y: 0 };
  for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt++) {
    candidate = {
      x: randomBetween(-SKY.BOX_SPAWN_RANGE_X, SKY.BOX_SPAWN_RANGE_X, random),
      y: randomBetween(-SKY.BOX_SPAWN_RANGE_Y, SKY.BOX_SPAWN_RANGE_Y, random),
    };
    const overlaps = others.some(
      (box) =>
        box.phase !== 'leaving' &&
        Math.hypot(box.x - candidate.x, box.y - candidate.y) <= SKY.BOX_MIN_SPACING,
    );
    if (!overlaps) return candidate;
  }
  return candidate;
}

export function isLive(box: Box): boolean {
  return box.phase !== 'leaving';
}

export function hasNeededLetter(boxes: readonly Box[], neededKeys: readonly string[]): boolean {
  return boxes.some((box) => isLive(box) && neededKeys.includes(box.letterKey));
}

/**
 * Chooses the letter of the next box. A needed letter is guaranteed whenever none is on
 * screen, and is otherwise chosen some of the time; wrong letters avoid repeating live ones.
 */
export function pickBoxLetter(
  neededKeys: readonly string[],
  boxes: readonly Box[],
  allKeys: readonly string[],
  random: RandomSource = Math.random,
): string {
  const liveKeys = boxes.filter(isLive).map((box) => box.letterKey);
  const wantsNeeded =
    neededKeys.length > 0 &&
    (!hasNeededLetter(boxes, neededKeys) || random() < SKY.NEEDED_LETTER_CHANCE);
  if (wantsNeeded) {
    const notOnScreenYet = neededKeys.filter((key) => !liveKeys.includes(key));
    const pool = notOnScreenYet.length > 0 ? notOnScreenYet : neededKeys;
    return pickRandom(pool, random) ?? neededKeys[0] ?? allKeys[0] ?? '';
  }
  const unusedKeys = allKeys.filter((key) => !liveKeys.includes(key));
  return pickRandom(unusedKeys.length > 0 ? unusedKeys : allKeys, random) ?? '';
}

/** The nearest box the glove is touching, if any. */
export function findPunchTarget(
  boxes: readonly Box[],
  player: Pick<Player, 'x' | 'y'>,
): Box | null {
  let nearest: Box | null = null;
  for (const box of boxes) {
    if (box.phase === 'leaving') continue;
    const tooFar = box.z > SKY.PUNCH_PLANE_Z + SKY.PUNCH_REACH_AHEAD;
    const tooClose = box.z < SKY.PUNCH_PLANE_Z - SKY.PUNCH_REACH_BEHIND;
    if (tooFar || tooClose) continue;
    if (Math.hypot(box.x - player.x, box.y - player.y) >= SKY.PUNCH_HIT_RADIUS) continue;
    if (!nearest || box.z < nearest.z) nearest = box;
  }
  return nearest;
}

/** Moves boxes toward the player, lets them hover, then lets them drift away. */
export function advanceBoxes(boxes: Box[], seconds: number): Box[] {
  for (const box of boxes) {
    box.shakeSeconds = Math.max(0, box.shakeSeconds - seconds);
    if (box.phase === 'approaching') {
      box.z -= SKY.BOX_APPROACH_SPEED * seconds;
      if (box.z <= SKY.PUNCH_PLANE_Z) {
        box.z = SKY.PUNCH_PLANE_Z;
        box.phase = 'hovering';
      }
      continue;
    }
    if (box.phase === 'hovering') {
      box.hoverSeconds += seconds;
      if (box.hoverSeconds > SKY.BOX_HOVER_SECONDS) box.phase = 'leaving';
      continue;
    }
    box.z -= SKY.BOX_LEAVE_SPEED * seconds;
  }
  return boxes.filter((box) => box.z > SKY.BOX_REMOVE_Z);
}

export function createCloud(z: number, random: RandomSource = Math.random): Cloud {
  // Keep clouds out of the play area so they never hide a box.
  let x = 0;
  let y = 0;
  do {
    x = randomBetween(-45, 45, random);
    y = randomBetween(-16, 9, random);
  } while (Math.abs(x) < 7.5 && Math.abs(y) < 4.8);
  return { x, y, z, size: randomBetween(2.5, 6, random) };
}
