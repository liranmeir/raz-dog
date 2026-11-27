'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { type DogMood } from '@/components/Dog';
import { DogView } from '@/components/DogView';
import type { AudioKit } from '@/components/GameApp';
import { SHOP_ITEMS, type ShopItem } from '@/lib/game/catalog';
import type { PlayerState } from '@/lib/game/state';

type Props = {
  audio: AudioKit;
  player: PlayerState;
  accessory: { emoji: string; slot: 'head' | 'face' } | null;
  onBuy: (id: string) => boolean;
  onEquip: (id: string) => void;
};

export function Shop({ audio, player, accessory, onBuy, onEquip }: Props) {
  const [mood, setMood] = useState<DogMood>('idle');
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const t = useRef<number | null>(null);

  function flash(m: DogMood, ms: number) {
    setMood(m);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setMood('idle'), ms);
  }

  function tap(item: ShopItem) {
    if (player.owned.includes(item.id)) {
      onEquip(item.id);
      audio.sfx.pop();
      flash('happy', 1000);
      return;
    }
    if (player.stars >= item.price && onBuy(item.id)) {
      audio.sfx.celebrate();
      flash('dance', 3200);
      return;
    }
    setShake((prev) => ({ id: item.id, n: (prev?.n ?? 0) + 1 }));
    audio.sfx.hmm();
    flash('hmm', 1100);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between pb-6">
      <DogView mood={mood} accessory={accessory} className="h-[38dvh] max-w-[70vw]" />
      <div className="grid grid-cols-4 gap-4 px-4">
        {SHOP_ITEMS.map((item) => {
          const owned = player.owned.includes(item.id);
          const worn = player.equipped === item.id;
          const affordable = player.stars >= item.price;
          return (
            <motion.button
              key={item.id + (shake?.id === item.id ? shake.n : '')}
              onClick={() => tap(item)}
              whileTap={{ scale: 0.9 }}
              animate={shake?.id === item.id ? { x: [0, -8, 8, -6, 6, 0] } : {}}
              className={`flex h-32 w-32 flex-col items-center justify-center rounded-3xl shadow-lg ${
                worn ? 'bg-emerald-200 ring-8 ring-emerald-400' : owned ? 'bg-white' : affordable ? 'bg-amber-100' : 'bg-white/50'
              }`}
              aria-label={item.name}
            >
              <span className={`text-6xl ${!owned && !affordable ? 'opacity-40 grayscale' : ''}`}>{item.emoji}</span>
              {!owned && <span className="mt-1 text-2xl font-bold text-amber-600">⭐{item.price}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
