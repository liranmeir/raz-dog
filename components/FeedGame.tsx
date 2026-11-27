'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DogMood } from '@/components/Dog';
import { DogView } from '@/components/DogView';
import type { AudioKit } from '@/components/GameApp';
import { speakHebrew } from '@/lib/audio/sfx';
import { FOODS, type Food } from '@/lib/game/catalog';
import { makeFeedRound, ROUNDS_PER_GAME, type FeedRound } from '@/lib/game/feed';
import type { GameSettings } from '@/lib/game/state';

type Props = {
  audio: AudioKit;
  settings: GameSettings;
  accessory: { emoji: string; slot: 'head' | 'face' } | null;
  onSuccess: (foodId: string) => void;
  onMiss: (foodId: string) => void;
  onComplete: () => void;
  onExit: () => void;
};

type Flying = { emoji: string; from: { x: number; y: number }; to: { x: number; y: number } };

/** After this many wrong picks in a round, the right answer gently pulses (errorless learning). */
const HINT_AFTER_MISSES = 2;

export function FeedGame({ audio, settings, accessory, onSuccess, onMiss, onComplete, onExit }: Props) {
  const [round, setRound] = useState<FeedRound>(() => makeFeedRound(FOODS, settings.feedOptions));
  const [roundNo, setRoundNo] = useState(0);
  const [mood, setMood] = useState<DogMood>('idle');
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [flying, setFlying] = useState<Flying | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const dogRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // say what the dog wants at the start of each round
  useEffect(() => {
    if (done) return;
    audio.sfx.pop();
    if (settings.speakNames) later(() => speakHebrew(round.target.name, settings.volume), 350);
  }, [round, done, audio, settings.speakNames, settings.volume, later]);

  function pick(food: Food, el: HTMLElement) {
    if (locked || done) return;
    if (food.id !== round.target.id) {
      setMisses((m) => m + 1);
      setShake((prev) => ({ id: food.id, n: (prev?.n ?? 0) + 1 }));
      setMood('hmm');
      audio.sfx.hmm();
      onMiss(food.id);
      later(() => setMood('idle'), 1100);
      return;
    }

    setLocked(true);
    const from = el.getBoundingClientRect();
    const dog = dogRef.current?.getBoundingClientRect();
    setFlying({
      emoji: food.emoji,
      from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
      to: dog ? { x: dog.left + dog.width / 2, y: dog.top + dog.height * 0.5 } : { x: from.left, y: 100 },
    });
  }

  function landed() {
    setFlying(null);
    setMood('eat');
    audio.sfx.crunch();
    later(() => {
      setMood('happy');
      audio.sfx.star();
      if (settings.speakNames) speakHebrew('יאמי!', settings.volume);
      onSuccess(round.target.id);
    }, 800);

    later(() => {
      const next = roundNo + 1;
      if (next >= ROUNDS_PER_GAME) {
        setDone(true);
        setMood('dance');
        audio.sfx.celebrate();
        onComplete();
        return;
      }
      setRoundNo(next);
      setMisses(0);
      setMood('idle');
      setLocked(false);
      setRound(makeFeedRound(FOODS, settings.feedOptions, round.target.id));
    }, 2200);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between pb-8">
      <Progress total={ROUNDS_PER_GAME} done={done ? ROUNDS_PER_GAME : roundNo} />

      <div className="relative flex items-center justify-center">
        <div ref={dogRef}>
          <DogView mood={mood} accessory={accessory} className="h-[40dvh] max-w-[70vw]" />
        </div>
        {!done && (
          <motion.div
            key={round.target.id + roundNo}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="absolute -top-4 -left-24 flex h-32 w-32 items-center justify-center rounded-full bg-white text-7xl shadow-lg"
            onClick={() => settings.speakNames && speakHebrew(round.target.name, settings.volume)}
          >
            {round.target.emoji}
            <span className="absolute -bottom-3 right-3 h-6 w-6 rounded-full bg-white shadow" />
            <span className="absolute -bottom-8 right-0 h-3 w-3 rounded-full bg-white shadow" />
          </motion.div>
        )}
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-6">
          <motion.div
            className="text-6xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ⭐⭐⭐
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onExit}
            className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-emerald-300 text-7xl shadow-lg"
            aria-label="הביתה"
          >
            🏠
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6 px-4">
          {round.options.map((food) => {
            const hint = misses >= HINT_AFTER_MISSES && food.id === round.target.id;
            return (
              <motion.button
                key={food.id + roundNo + (shake?.id === food.id ? shake.n : '')}
                onClick={(e) => pick(food, e.currentTarget)}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={
                  shake?.id === food.id
                    ? { x: [0, -10, 10, -8, 8, 0], scale: 1, opacity: 1 }
                    : hint
                      ? { scale: [1, 1.12, 1], opacity: 1 }
                      : { scale: 1, opacity: flying ? 0.5 : 1 }
                }
                transition={hint ? { duration: 1, repeat: Infinity } : { duration: 0.45 }}
                className={`flex h-36 w-36 items-center justify-center rounded-[2rem] bg-white text-8xl shadow-lg ${
                  hint ? 'ring-8 ring-amber-300' : ''
                }`}
                aria-label={food.name}
              >
                {food.emoji}
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {flying && (
          <motion.div
            className="pointer-events-none fixed z-30 text-8xl"
            style={{ left: 0, top: 0 }}
            initial={{ x: flying.from.x - 48, y: flying.from.y - 48, scale: 1 }}
            animate={{ x: flying.to.x - 48, y: flying.to.y - 48, scale: 0.5 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            onAnimationComplete={landed}
          >
            {flying.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Progress({ total, done }: { total: number; done: number }) {
  return (
    <div className="mt-2 flex gap-3">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={`h-6 w-6 rounded-full ${i < done ? 'bg-amber-400' : 'bg-white/80'} shadow`}
          animate={{ scale: i === done - 1 ? [1, 1.5, 1] : 1 }}
        />
      ))}
    </div>
  );
}
