import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  player: { upsert: vi.fn(), update: vi.fn((a) => a) },
  settings: { findUnique: vi.fn() },
  gameEvent: { createMany: vi.fn((a) => a) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { getGameState, saveProgress } from '@/app/actions/game-actions';
import { DEFAULT_SETTINGS } from '@/lib/game/state';

beforeEach(() => vi.clearAllMocks());

describe('getGameState', () => {
  it('creates the player if missing and falls back to default settings', async () => {
    prismaMock.player.upsert.mockResolvedValue({ stars: 4, owned: ['cap'], equipped: 'cap' });
    prismaMock.settings.findUnique.mockResolvedValue(null);
    const r = await getGameState();
    expect(r).toEqual({ success: true, data: { player: { stars: 4, owned: ['cap'], equipped: 'cap' }, settings: DEFAULT_SETTINGS } });
  });

  it('returns an error result when the db fails', async () => {
    prismaMock.player.upsert.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await getGameState()).success).toBe(false);
  });
});

describe('saveProgress', () => {
  it('rejects invalid payloads without touching the db', async () => {
    const r = await saveProgress({ stars: -1, owned: [], equipped: null }, []);
    expect(r.success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('saves state and events in one transaction', async () => {
    prismaMock.player.upsert.mockResolvedValue({});
    const at = Date.UTC(2026, 10, 27);
    const r = await saveProgress({ stars: 3, owned: [], equipped: null }, [{ game: 'feed', kind: 'success', detail: 'apple', at }]);
    expect(r.success).toBe(true);
    expect(prismaMock.gameEvent.createMany).toHaveBeenCalledWith({
      data: [{ playerId: 'raz', game: 'feed', kind: 'success', detail: 'apple', createdAt: new Date(at) }],
    });
    expect(prismaMock.player.update).toHaveBeenCalledWith({ where: { id: 'raz' }, data: { stars: 3, owned: [], equipped: null } });
  });
});
