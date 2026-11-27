import { describe, expect, it } from 'vitest';
import { summarizeEvents } from '@/lib/game/summary';

describe('summarizeEvents', () => {
  it('groups by Jerusalem day and counts kinds', () => {
    const s = summarizeEvents([
      { game: 'echo', kind: 'vocalize', createdAt: new Date('2026-11-26T21:30:00Z') }, // 23:30 local, 26th
      { game: 'echo', kind: 'vocalize', createdAt: new Date('2026-11-26T22:30:00Z') }, // 00:30 local, 27th
      { game: 'feed', kind: 'success', createdAt: new Date('2026-11-27T08:00:00Z') },
      { game: 'feed', kind: 'miss', createdAt: new Date('2026-11-27T08:01:00Z') },
      { game: 'feed', kind: 'round_complete', createdAt: new Date('2026-11-27T08:02:00Z') },
    ]);
    expect(s.days.map((d) => d.day)).toEqual(['2026-11-27', '2026-11-26']);
    expect(s.days[0]).toMatchObject({ vocalizations: 1, feedSuccess: 1, feedMiss: 1, games: 1 });
    expect(s.totals).toEqual({ vocalizations: 2, feedSuccess: 1, feedMiss: 1, games: 1 });
  });
});
