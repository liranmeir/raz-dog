import { describe, expect, it } from 'vitest';
import { FOODS } from '@/lib/game/catalog';
import { makeFeedRound, shuffle } from '@/lib/game/feed';

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('makeFeedRound', () => {
  it('includes the target among distinct options of the requested size', () => {
    for (const n of [2, 3, 4]) {
      const r = makeFeedRound(FOODS, n, undefined, seeded(n));
      expect(r.options).toHaveLength(n);
      expect(r.options.map((o) => o.id)).toContain(r.target.id);
      expect(new Set(r.options.map((o) => o.id)).size).toBe(n);
    }
  });

  it('never repeats the previous target', () => {
    const rng = seeded(7);
    let prev: string | undefined;
    for (let i = 0; i < 200; i++) {
      const r = makeFeedRound(FOODS, 3, prev, rng);
      expect(r.target.id).not.toBe(prev);
      prev = r.target.id;
    }
  });

  it('clamps option count to 2..foods.length', () => {
    expect(makeFeedRound(FOODS, 1).options).toHaveLength(2);
    expect(makeFeedRound(FOODS.slice(0, 3), 9).options).toHaveLength(3);
  });

  it('throws with fewer than 2 foods', () => {
    expect(() => makeFeedRound(FOODS.slice(0, 1), 2)).toThrow();
  });
});

describe('shuffle', () => {
  it('keeps the same items and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(3));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
