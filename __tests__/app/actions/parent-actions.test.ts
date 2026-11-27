import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  settings: { upsert: vi.fn() },
  player: { update: vi.fn() },
  gameEvent: { findMany: vi.fn() },
}));
const guard = vi.hoisted(() => ({ isParent: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/parent-guard', () => guard);

import { getProgressSummary, setStars, updateSettings } from '@/app/actions/parent-actions';
import { DEFAULT_SETTINGS } from '@/lib/game/state';

beforeEach(() => vi.clearAllMocks());

describe('parent actions', () => {
  it('refuse everything when the parent area is locked', async () => {
    guard.isParent.mockResolvedValue(false);
    expect((await updateSettings(DEFAULT_SETTINGS)).success).toBe(false);
    expect((await setStars(5)).success).toBe(false);
    expect((await getProgressSummary()).success).toBe(false);
    expect(prismaMock.settings.upsert).not.toHaveBeenCalled();
  });

  it('validates and saves settings', async () => {
    guard.isParent.mockResolvedValue(true);
    expect((await updateSettings({ ...DEFAULT_SETTINGS, feedOptions: 9 })).success).toBe(false);
    const r = await updateSettings({ ...DEFAULT_SETTINGS, feedOptions: 3 });
    expect(r.success).toBe(true);
    expect(prismaMock.settings.upsert).toHaveBeenCalled();
  });

  it('rejects invalid star values', async () => {
    guard.isParent.mockResolvedValue(true);
    expect((await setStars(-3)).success).toBe(false);
    expect((await setStars(1.5)).success).toBe(false);
    expect((await setStars(10)).success).toBe(true);
  });

  it('summarizes events', async () => {
    guard.isParent.mockResolvedValue(true);
    prismaMock.gameEvent.findMany.mockResolvedValue([{ game: 'echo', kind: 'vocalize', createdAt: new Date() }]);
    const r = await getProgressSummary();
    expect(r.data?.totals.vocalizations).toBe(1);
  });
});
