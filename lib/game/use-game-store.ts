'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGameState, saveProgress, type GameEventInput } from '@/app/actions/game-actions';
import { DEFAULT_PLAYER, DEFAULT_SETTINGS, addStars, buyItem, toggleEquip, type GameSettings, type PlayerState } from './state';

const LS_KEY = 'raz-dog:v1';
const SYNC_DELAY_MS = 2500;

type Cached = { player: PlayerState; settings: GameSettings; pending: GameEventInput[] };

function readCache(): Cached | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(c: Cached) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable — the server copy still works */
  }
}

/**
 * Local-first game state: every change is applied and cached on the device
 * immediately (so the game never waits on the network), then synced to the
 * server in the background. Unsynced events survive reloads.
 */
export function useGameStore() {
  const [player, setPlayer] = useState<PlayerState>(DEFAULT_PLAYER);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<GameEventInput[]>([]);
  const playerRef = useRef(player);
  const timer = useRef<number | null>(null);
  const syncing = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const persist = useCallback(() => {
    writeCache({ player: playerRef.current, settings: settingsRef.current, pending: pending.current });
  }, []);

  const flush = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    const batch = pending.current;
    pending.current = [];
    const res = await saveProgress(playerRef.current, batch).catch(() => ({ success: false }));
    if (!res.success) pending.current = [...batch, ...pending.current]; // retry next time
    syncing.current = false;
    persist();
  }, [persist]);

  const scheduleSync = useCallback(() => {
    persist();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SYNC_DELAY_MS);
  }, [flush, persist]);

  useEffect(() => {
    async function load() {
      await Promise.resolve(); // read the device cache after hydration
      const cached = readCache();
      if (cached) {
        setPlayer(cached.player);
        playerRef.current = cached.player;
        setSettings(cached.settings);
        pending.current = cached.pending ?? [];
      }
      try {
        const res = await getGameState();
        if (res.success && res.data) {
          setSettings(res.data.settings);
          // server wins unless this device has progress it hasn't sent yet
          if (pending.current.length === 0) {
            setPlayer(res.data.player);
            playerRef.current = res.data.player;
          }
        }
      } catch {
        /* offline — keep the cached copy */
      }
      setLoaded(true);
      if (pending.current.length) void flush();
    }
    void load();
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (next: PlayerState, events: Omit<GameEventInput, 'at'>[]) => {
      playerRef.current = next;
      setPlayer(next);
      const at = Date.now();
      pending.current.push(...events.map((e) => ({ ...e, at })));
      scheduleSync();
    },
    [scheduleSync],
  );

  const award = useCallback(
    (stars: number, game: string, kind: string, detail?: string) => {
      update(addStars(playerRef.current, stars), [{ game, kind, detail }]);
    },
    [update],
  );

  const log = useCallback(
    (game: string, kind: string, detail?: string) => update(playerRef.current, [{ game, kind, detail }]),
    [update],
  );

  const buy = useCallback(
    (itemId: string) => {
      const r = buyItem(playerRef.current, itemId);
      if (r.ok) update(r.state, [{ game: 'shop', kind: 'purchase', detail: itemId }]);
      return r.ok;
    },
    [update],
  );

  const equip = useCallback((itemId: string) => update(toggleEquip(playerRef.current, itemId), []), [update]);

  return { player, settings, loaded, award, log, buy, equip };
}
