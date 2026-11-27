'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SETTINGS,
  PLAYER_ID,
  playerStateSchema,
  type GameSettings,
  type PlayerState,
} from '@/lib/game/state';

type Result<T> = { success: boolean; data?: T; error?: string };

export type GameEventInput = { game: string; kind: string; detail?: string; at: number };

const eventSchema = z.object({
  game: z.string().min(1).max(32),
  kind: z.string().min(1).max(32),
  detail: z.string().max(64).optional(),
  at: z.number().int(),
});

async function ensurePlayer() {
  return prisma.player.upsert({
    where: { id: PLAYER_ID },
    update: {},
    create: { id: PLAYER_ID, name: 'רז' },
  });
}

export async function getGameState(): Promise<Result<{ player: PlayerState; settings: GameSettings }>> {
  try {
    const player = await ensurePlayer();
    const settings = await prisma.settings.findUnique({ where: { playerId: PLAYER_ID } });
    return {
      success: true,
      data: {
        player: { stars: player.stars, owned: player.owned, equipped: player.equipped },
        settings: settings
          ? {
              volume: settings.volume,
              micSensitivity: settings.micSensitivity,
              feedOptions: settings.feedOptions,
              speakNames: settings.speakNames,
              echoEnabled: settings.echoEnabled,
              sessionMinutes: settings.sessionMinutes,
              dogStyle: settings.dogStyle === '2d' ? '2d' : '3d',
            }
          : DEFAULT_SETTINGS,
      },
    };
  } catch (e) {
    console.error('getGameState failed', e);
    return { success: false, error: 'Could not load game state' };
  }
}

/** Saves the local-first player state and flushes queued progress events. */
export async function saveProgress(state: PlayerState, events: GameEventInput[]): Promise<Result<null>> {
  const parsedState = playerStateSchema.safeParse(state);
  const parsedEvents = z.array(eventSchema).max(500).safeParse(events);
  if (!parsedState.success || !parsedEvents.success) {
    return { success: false, error: 'Invalid progress payload' };
  }
  try {
    await ensurePlayer();
    await prisma.$transaction([
      prisma.player.update({
        where: { id: PLAYER_ID },
        data: {
          stars: parsedState.data.stars,
          owned: parsedState.data.owned,
          equipped: parsedState.data.equipped,
        },
      }),
      prisma.gameEvent.createMany({
        data: parsedEvents.data.map((e) => ({
          playerId: PLAYER_ID,
          game: e.game,
          kind: e.kind,
          detail: e.detail ?? null,
          createdAt: new Date(e.at),
        })),
      }),
    ]);
    return { success: true, data: null };
  } catch (e) {
    console.error('saveProgress failed', e);
    return { success: false, error: 'Could not save progress' };
  }
}
