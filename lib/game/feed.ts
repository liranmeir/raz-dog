import type { Food } from './catalog';

export type FeedRound = { target: Food; options: Food[] };

export const ROUNDS_PER_GAME = 5;

/**
 * Build one feeding round: a target food plus `optionCount` distinct
 * options (target included, position shuffled). Avoids repeating the
 * previous round's target so consecutive rounds feel different.
 */
export function makeFeedRound(
  foods: Food[],
  optionCount: number,
  previousTargetId?: string,
  rng: () => number = Math.random,
): FeedRound {
  if (foods.length < 2) throw new Error('need at least 2 foods');
  const count = Math.max(2, Math.min(optionCount, foods.length));

  const candidates = foods.length > 2 ? foods.filter((f) => f.id !== previousTargetId) : foods;
  const target = candidates[Math.floor(rng() * candidates.length)];

  const others = shuffle(foods.filter((f) => f.id !== target.id), rng).slice(0, count - 1);
  const options = shuffle([target, ...others], rng);
  return { target, options };
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
