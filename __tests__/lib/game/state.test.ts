import { describe, expect, it } from 'vitest';
import { addStars, buyItem, DEFAULT_SETTINGS, settingsSchema, toggleEquip } from '@/lib/game/state';

describe('player state', () => {
  it('adds stars and never goes negative', () => {
    expect(addStars({ stars: 2, owned: [], equipped: null }, 3).stars).toBe(5);
    expect(addStars({ stars: 2, owned: [], equipped: null }, -10).stars).toBe(0);
  });

  it('buys an affordable item, deducts stars and wears it', () => {
    const r = buyItem({ stars: 6, owned: [], equipped: null }, 'cap');
    expect(r).toEqual({ ok: true, state: { stars: 1, owned: ['cap'], equipped: 'cap' } });
  });

  it('refuses unknown, owned, or unaffordable items', () => {
    expect(buyItem({ stars: 99, owned: [], equipped: null }, 'nope')).toEqual({ ok: false, reason: 'unknown' });
    expect(buyItem({ stars: 99, owned: ['cap'], equipped: null }, 'cap')).toEqual({ ok: false, reason: 'owned' });
    expect(buyItem({ stars: 1, owned: [], equipped: null }, 'crown')).toEqual({ ok: false, reason: 'poor' });
  });

  it('toggles equip only for owned items', () => {
    const s = { stars: 0, owned: ['cap'], equipped: null };
    expect(toggleEquip(s, 'cap').equipped).toBe('cap');
    expect(toggleEquip({ ...s, equipped: 'cap' }, 'cap').equipped).toBeNull();
    expect(toggleEquip(s, 'crown')).toBe(s);
  });

  it('default settings are valid', () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, feedOptions: 7 }).success).toBe(false);
  });
});
