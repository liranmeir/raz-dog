'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dog, type DogMood } from '@/components/Dog';
import { FeedGame } from '@/components/FeedGame';
import { Shop } from '@/components/Shop';
import { EchoEngine } from '@/lib/audio/echo';
import { Sfx } from '@/lib/audio/sfx';
import { findShopItem } from '@/lib/game/catalog';
import { useGameStore } from '@/lib/game/use-game-store';

type Screen = 'start' | 'home' | 'feed' | 'shop' | 'sleep';

export type AudioKit = { ctx: AudioContext; out: GainNode; sfx: Sfx; echo: EchoEngine | null };

const ECHO_STAR_COOLDOWN_MS = 4000;

export function GameApp() {
  const store = useGameStore();
  const { player, settings } = store;
  const [screen, setScreen] = useState<Screen>('start');
  const [mood, setMood] = useState<DogMood>('idle');
  const [mouth, setMouth] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [starBurst, setStarBurst] = useState(0);
  const audio = useRef<AudioKit | null>(null);
  const [kit, setKit] = useState<AudioKit | null>(null);
  const moodTimer = useRef<number | null>(null);
  const lastEchoStar = useRef(0);
  const sessionStart = useRef(0);
  const timeUp = useRef(false);
  const screenRef = useRef<Screen>('start');
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const accessoryItem = player.equipped ? findShopItem(player.equipped) : undefined;
  const accessory = accessoryItem ? { emoji: accessoryItem.emoji, slot: accessoryItem.slot } : null;

  const flashMood = useCallback((m: DogMood, ms: number) => {
    setMood(m);
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms);
  }, []);

  const showStar = useCallback(() => setStarBurst((n) => n + 1), []);

  // keep audio settings in sync with what the parent configured
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.out.gain.value = settings.volume;
    a.echo?.setSensitivity(settings.micSensitivity);
  }, [settings.volume, settings.micSensitivity]);

  useEffect(() => {
    audio.current?.echo?.setEnabled(settings.echoEnabled && screen === 'home');
  }, [settings.echoEnabled, screen]);

  const goSleep = useCallback(() => {
    audio.current?.echo?.stop();
    audio.current?.sfx.yawn();
    setMood('sleep');
    setScreen('sleep');
  }, []);

  const goHome = useCallback(() => {
    if (timeUp.current) return goSleep();
    setMood('idle');
    setScreen('home');
  }, [goSleep]);

  // session time limit → the dog goes to sleep at the next calm moment
  useEffect(() => {
    if (screen === 'start' || !settings.sessionMinutes) return;
    const id = window.setInterval(() => {
      if (Date.now() - sessionStart.current >= settings.sessionMinutes * 60_000) {
        timeUp.current = true;
        if (screenRef.current === 'home') goSleep();
      }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [screen, settings.sessionMinutes, goSleep]);

  async function begin() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    await ctx.resume();
    const out = ctx.createGain();
    out.gain.value = settings.volume;
    out.connect(ctx.destination);
    const sfx = new Sfx(ctx, out);
    let echo: EchoEngine | null = new EchoEngine(ctx, out, settings.micSensitivity, {
      onLevel: (l) => setMicLevel(l),
      onHearStart: () => setMood('listen'),
      onPlaybackStart: () => {
        if (moodTimer.current) window.clearTimeout(moodTimer.current);
        setMood('talk');
      },
      onPlaybackLevel: (l) => setMouth(l),
      onPlaybackEnd: () => {
        setMouth(0);
        flashMood('happy', 1400);
        const now = Date.now();
        if (now - lastEchoStar.current > ECHO_STAR_COOLDOWN_MS) {
          lastEchoStar.current = now;
          store.award(1, 'echo', 'vocalize');
          sfx.star();
          showStar();
        } else {
          store.log('echo', 'vocalize');
        }
      },
    });
    try {
      await echo.start();
      setMicOk(true);
    } catch {
      echo = null;
      setMicOk(false);
    }
    audio.current = { ctx, out, sfx, echo };
    setKit(audio.current);
    // iOS loads voices lazily
    window.speechSynthesis?.getVoices();
    sessionStart.current = Date.now();
    timeUp.current = false;
    sfx.happy();
    flashMood('happy', 1200);
    setScreen('home');
  }

  function tapHead() {
    const a = audio.current;
    if (!a || mood === 'talk') return;
    a.echo?.hold(700);
    a.sfx.happy();
    flashMood('happy', 1300);
  }

  function tapBelly() {
    const a = audio.current;
    if (!a || mood === 'talk') return;
    a.echo?.hold(900);
    a.sfx.giggle();
    flashMood('giggle', 900);
  }

  return (
    <main className="relative flex h-dvh w-full select-none flex-col overflow-hidden bg-gradient-to-b from-sky-100 to-amber-50">
      {screen !== 'start' && screen !== 'sleep' && (
        <TopBar stars={player.stars} burst={starBurst} onHome={screen !== 'home' ? goHome : undefined} />
      )}
      <ParentGear />

      {screen === 'start' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <Dog mood="idle" accessory={accessory} className="h-[55dvh] max-w-[90vw]" />
          <motion.button
            onClick={begin}
            disabled={!store.loaded}
            className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-400 text-6xl shadow-lg disabled:opacity-40"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            aria-label="בוא נשחק"
          >
            ▶
          </motion.button>
        </div>
      )}

      {screen === 'home' && (
        <div className="flex flex-1 flex-col items-center justify-between pb-6">
          <div className="relative flex flex-1 items-center justify-center">
            <Dog
              mood={mood}
              mouthOpen={mouth}
              accessory={accessory}
              onHeadTap={tapHead}
              onBellyTap={tapBelly}
              className="h-[58dvh] max-w-[92vw]"
            />
            {settings.echoEnabled && micOk && <Ear level={micLevel} active={mood === 'listen' || mood === 'talk'} />}
          </div>
          <div className="flex gap-8">
            <BigButton emoji="🍖" label="להאכיל" color="bg-orange-300" onClick={() => setScreen('feed')} />
            <BigButton emoji="🛍️" label="חנות" color="bg-violet-300" onClick={() => setScreen('shop')} />
          </div>
          {micOk === false && (
            <p className="mt-2 text-sm text-slate-500">אין גישה למיקרופון — הכלב לא יחזור על קולות</p>
          )}
        </div>
      )}

      {screen === 'feed' && kit && (
        <FeedGame
          audio={kit}
          settings={settings}
          accessory={accessory}
          onSuccess={(foodId) => {
            store.award(1, 'feed', 'success', foodId);
            showStar();
          }}
          onMiss={(foodId) => store.log('feed', 'miss', foodId)}
          onComplete={() => {
            store.award(3, 'feed', 'round_complete');
            showStar();
          }}
          onExit={goHome}
        />
      )}

      {screen === 'shop' && kit && (
        <Shop
          audio={kit}
          player={player}
          accessory={accessory}
          onBuy={store.buy}
          onEquip={store.equip}
        />
      )}

      {screen === 'sleep' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-indigo-950/80">
          <Dog mood="sleep" accessory={accessory} className="h-[60dvh] max-w-[90vw]" />
          <p className="text-4xl text-indigo-100">לילה טוב 👋</p>
        </div>
      )}
    </main>
  );
}

function TopBar({ stars, burst, onHome }: { stars: number; burst: number; onHome?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4">
      <motion.div
        key={burst}
        initial={{ scale: burst ? 1.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
        className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 text-4xl font-bold text-amber-500 shadow"
      >
        <span>⭐</span>
        <span className="tabular-nums">{stars}</span>
      </motion.div>
      {onHome ? (
        <button onClick={onHome} className="rounded-full bg-white/90 p-3 text-5xl shadow" aria-label="הביתה">
          🏠
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function BigButton({ emoji, label, color, onClick }: { emoji: string; label: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex h-36 w-36 flex-col items-center justify-center rounded-[2rem] ${color} shadow-lg`}
    >
      <span className="text-7xl">{emoji}</span>
      <span className="text-xl font-semibold text-slate-700">{label}</span>
    </motion.button>
  );
}

function Ear({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="absolute bottom-4 left-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow">
      <motion.div
        className="absolute inset-0 rounded-full bg-sky-300"
        animate={{ scale: 1 + level * 0.6, opacity: active ? 0.7 : 0.25 + level * 0.5 }}
        transition={{ duration: 0.08 }}
      />
      <span className="relative text-3xl">👂</span>
    </div>
  );
}

/** Hidden-ish parent entry: hold for 2 seconds to open the parent area. */
function ParentGear() {
  const router = useRouter();
  const t = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const start = () => {
    setHolding(true);
    t.current = window.setTimeout(() => router.push('/parent'), 2000);
  };
  const cancel = () => {
    setHolding(false);
    if (t.current) window.clearTimeout(t.current);
  };
  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute bottom-3 right-3 z-20 h-12 w-12 rounded-full text-2xl opacity-30"
      aria-label="אזור הורים (לחיצה ארוכה)"
    >
      <AnimatePresence>
        {holding && (
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-slate-500"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2 }}
          />
        )}
      </AnimatePresence>
      ⚙️
    </button>
  );
}
