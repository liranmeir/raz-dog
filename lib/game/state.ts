import { z } from 'zod';
import { findShopItem } from './catalog';

export const PLAYER_ID = 'raz';

export type PlayerState = { stars: number; owned: string[]; equipped: string | null };

export const DEFAULT_PLAYER: PlayerState = { stars: 0, owned: [], equipped: null };

export const settingsSchema = z.object({
  volume: z.number().min(0).max(1),
  micSensitivity: z.number().min(0).max(1),
  feedOptions: z.number().int().min(2).max(4),
  speakNames: z.boolean(),
  echoEnabled: z.boolean(),
  /** 0 = no limit */
  sessionMinutes: z.number().int().min(0).max(120),
});

export type GameSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.6,
  micSensitivity: 0.5,
  feedOptions: 2,
  speakNames: true,
  echoEnabled: true,
  sessionMinutes: 20,
};

export const playerStateSchema = z.object({
  stars: z.number().int().min(0).max(100000),
  owned: z.array(z.string()).max(100),
  equipped: z.string().nullable(),
});

export function addStars(state: PlayerState, amount: number): PlayerState {
  return { ...state, stars: Math.max(0, state.stars + Math.floor(amount)) };
}

export type BuyResult = { ok: true; state: PlayerState } | { ok: false; reason: 'unknown' | 'owned' | 'poor' };

export function buyItem(state: PlayerState, itemId: string): BuyResult {
  const item = findShopItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (state.owned.includes(itemId)) return { ok: false, reason: 'owned' };
  if (state.stars < item.price) return { ok: false, reason: 'poor' };
  return {
    ok: true,
    state: { stars: state.stars - item.price, owned: [...state.owned, itemId], equipped: itemId },
  };
}

/** Wear an owned item, or take it off if it's already worn. */
export function toggleEquip(state: PlayerState, itemId: string): PlayerState {
  if (!state.owned.includes(itemId)) return state;
  return { ...state, equipped: state.equipped === itemId ? null : itemId };
}
