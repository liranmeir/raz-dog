'use server';

import { prisma } from '@/lib/prisma';
import { isParent } from '@/lib/parent-guard';
import { PLAYER_ID, settingsSchema, type GameSettings } from '@/lib/game/state';
import { summarizeEvents, type ProgressSummary } from '@/lib/game/summary';

type Result<T> = { success: boolean; data?: T; error?: string };

const NOT_ALLOWED = { success: false, error: 'Parent area is locked' } as const;

export async function updateSettings(input: GameSettings): Promise<Result<GameSettings>> {
  if (!(await isParent())) return NOT_ALLOWED;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid settings' };
  try {
    await prisma.settings.upsert({
      where: { playerId: PLAYER_ID },
      update: parsed.data,
      create: { playerId: PLAYER_ID, ...parsed.data },
    });
    return { success: true, data: parsed.data };
  } catch (e) {
    console.error('updateSettings failed', e);
    return { success: false, error: 'Could not save settings' };
  }
}

export async function setStars(stars: number): Promise<Result<number>> {
  if (!(await isParent())) return NOT_ALLOWED;
  if (!Number.isInteger(stars) || stars < 0 || stars > 100000) return { success: false, error: 'Invalid value' };
  try {
    await prisma.player.update({ where: { id: PLAYER_ID }, data: { stars } });
    return { success: true, data: stars };
  } catch (e) {
    console.error('setStars failed', e);
    return { success: false, error: 'Could not update stars' };
  }
}

export async function getProgressSummary(days = 14): Promise<Result<ProgressSummary>> {
  if (!(await isParent())) return NOT_ALLOWED;
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.gameEvent.findMany({
      where: { playerId: PLAYER_ID, createdAt: { gte: since } },
      select: { game: true, kind: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: summarizeEvents(events) };
  } catch (e) {
    console.error('getProgressSummary failed', e);
    return { success: false, error: 'Could not load progress' };
  }
}
