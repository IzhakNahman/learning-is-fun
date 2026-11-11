export type RandomSource = () => number;

export function randomBetween(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  return min + random() * (max - min);
}

export function pickRandom<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

export function shuffled<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    const held = copy[index] as T;
    copy[index] = copy[swapIndex] as T;
    copy[swapIndex] = held;
  }
  return copy;
}

/** Up to `count` different items from `items`, in random order. */
export function pickDistinct<T>(
  items: readonly T[],
  count: number,
  random: RandomSource = Math.random,
): T[] {
  return shuffled(items, random).slice(0, count);
}
