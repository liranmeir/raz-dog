'use client';

import { motion, type TargetAndTransition, type Transition } from 'framer-motion';
import { useEffect, useState } from 'react';

export type DogMood = 'idle' | 'listen' | 'talk' | 'happy' | 'giggle' | 'eat' | 'hmm' | 'dance' | 'sleep';

type Props = {
  mood: DogMood;
  /** 0..1, opens the mouth while the dog "talks" */
  mouthOpen?: number;
  accessory?: { emoji: string; slot: 'head' | 'face' } | null;
  onHeadTap?: () => void;
  onBellyTap?: () => void;
  className?: string;
};

const FUR = '#EDB06A';
const FUR_DARK = '#D9944A';
const EAR = '#8A5A2B';
const CREAM = '#FFF1DC';
const INK = '#3A2A20';

const bodyAnim: Record<DogMood, { animate: TargetAndTransition; transition: Transition }> = {
  idle: { animate: { y: [0, -4, 0] }, transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  listen: { animate: { y: [0, -2, 0] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  talk: { animate: { y: [0, -3, 0] }, transition: { duration: 0.35, repeat: Infinity } },
  happy: { animate: { y: [0, -14, 0] }, transition: { duration: 0.45, repeat: 2, ease: 'easeOut' } },
  giggle: { animate: { rotate: [0, -4, 4, -4, 4, 0] }, transition: { duration: 0.7 } },
  eat: { animate: { y: [0, 3, 0, 3, 0] }, transition: { duration: 0.8 } },
  hmm: { animate: { rotate: [0, -7, -7, 0] }, transition: { duration: 1.1 } },
  dance: {
    animate: { rotate: [0, -8, 8, -8, 8, 0], y: [0, -10, 0, -10, 0, 0] },
    transition: { duration: 1.6, repeat: 1, ease: 'easeInOut' },
  },
  sleep: { animate: { scale: [1, 1.025, 1] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
};

export function Dog({ mood, mouthOpen = 0, accessory, onHeadTap, onBellyTap, className }: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2500 + Math.random() * 2500);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  const happyEyes = mood === 'happy' || mood === 'giggle' || mood === 'dance';
  const closedEyes = mood === 'sleep' || blink;
  const open = mood === 'talk' ? mouthOpen : mood === 'eat' ? 0.5 : mood === 'giggle' ? 0.6 : 0;
  const wagFast = mood === 'happy' || mood === 'dance' || mood === 'giggle' || mood === 'eat';
  const earsUp = mood === 'listen' || mood === 'talk';

  const a = bodyAnim[mood];
  const origin = { transformBox: 'fill-box' as const };

  return (
    <svg viewBox="0 0 300 350" className={className} role="img" aria-label="כלבלב">
      <motion.g key={mood} animate={a.animate} transition={a.transition} style={{ ...origin, transformOrigin: '50% 100%' }}>
        {/* tail */}
        <motion.path
          d="M220 270 C 260 260, 270 225, 255 205"
          stroke={FUR_DARK}
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          animate={{ rotate: wagFast ? [-18, 22] : mood === 'sleep' ? 0 : [-6, 8] }}
          transition={{ duration: wagFast ? 0.18 : 0.9, repeat: Infinity, repeatType: 'reverse' }}
          style={{ ...origin, transformOrigin: '0% 100%' }}
        />

        {/* body */}
        <g onPointerDown={onBellyTap} style={{ cursor: onBellyTap ? 'pointer' : undefined }}>
          <ellipse cx="150" cy="262" rx="86" ry="70" fill={FUR} />
          <ellipse cx="150" cy="278" rx="52" ry="44" fill={CREAM} />
          <ellipse cx="112" cy="328" rx="26" ry="15" fill={FUR_DARK} />
          <ellipse cx="188" cy="328" rx="26" ry="15" fill={FUR_DARK} />
        </g>

        {/* head */}
        <motion.g
          onPointerDown={onHeadTap}
          style={{ ...origin, transformOrigin: '50% 90%', cursor: onHeadTap ? 'pointer' : undefined }}
          animate={mood === 'eat' ? { rotate: [0, 4, -4, 4, 0] } : mood === 'listen' ? { rotate: 6 } : { rotate: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* ears */}
          <motion.path
            d="M80 80 C 40 85, 35 160, 62 180 C 80 190, 92 150, 98 105 Z"
            fill={EAR}
            animate={{ rotate: earsUp ? -18 : [0, 4, 0] }}
            transition={earsUp ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity }}
            style={{ ...origin, transformOrigin: '80% 10%' }}
          />
          <motion.path
            d="M220 80 C 260 85, 265 160, 238 180 C 220 190, 208 150, 202 105 Z"
            fill={EAR}
            animate={{ rotate: earsUp ? 18 : [0, -4, 0] }}
            transition={earsUp ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity }}
            style={{ ...origin, transformOrigin: '20% 10%' }}
          />

          <circle cx="150" cy="130" r="82" fill={FUR} />
          <ellipse cx="150" cy="70" rx="30" ry="16" fill={FUR_DARK} opacity="0.35" />

          {/* cheeks */}
          <circle cx="98" cy="155" r="14" fill="#F59AA0" opacity="0.45" />
          <circle cx="202" cy="155" r="14" fill="#F59AA0" opacity="0.45" />

          {/* eyes */}
          {closedEyes ? (
            <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M104 120 Q118 128 132 120" />
              <path d="M168 120 Q182 128 196 120" />
            </g>
          ) : happyEyes ? (
            <g stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M104 124 Q118 106 132 124" />
              <path d="M168 124 Q182 106 196 124" />
            </g>
          ) : (
            <g>
              <circle cx="118" cy="118" r="16" fill={INK} />
              <circle cx="182" cy="118" r="16" fill={INK} />
              <circle cx="123" cy="112" r="5.5" fill="#fff" />
              <circle cx="187" cy="112" r="5.5" fill="#fff" />
              <circle cx="113" cy="124" r="2.5" fill="#fff" opacity="0.8" />
              <circle cx="177" cy="124" r="2.5" fill="#fff" opacity="0.8" />
            </g>
          )}

          {/* muzzle */}
          <ellipse cx="150" cy="163" rx="47" ry="35" fill={CREAM} />
          <ellipse cx="150" cy="146" rx="16" ry="11.5" fill={INK} />
          <ellipse cx="145" cy="142" rx="5" ry="3" fill="#fff" opacity="0.6" />

          {/* mouth */}
          {open > 0.05 ? (
            <g>
              <ellipse cx="150" cy="176" rx={14 + open * 6} ry={4 + open * 16} fill="#6B2D2D" />
              <ellipse cx="150" cy={178 + open * 10} rx={9 + open * 3} ry={3 + open * 6} fill="#F07F8A" />
            </g>
          ) : (
            <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M150 158 L150 168" />
              <path d="M132 168 Q141 178 150 168 Q159 178 168 168" />
            </g>
          )}

          {/* accessory */}
          {accessory?.slot === 'head' && (
            <text x="150" y="68" fontSize="78" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              {accessory.emoji}
            </text>
          )}
          {accessory?.slot === 'face' && (
            <text x="150" y="142" fontSize="84" textAnchor="middle" style={{ pointerEvents: 'none' }}>
              {accessory.emoji}
            </text>
          )}
        </motion.g>

        {mood === 'sleep' && (
          <motion.text
            x="230"
            y="60"
            fontSize="34"
            fill="#7c8db5"
            animate={{ opacity: [0, 1, 0], y: [60, 30, 10] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            z z
          </motion.text>
        )}
      </motion.g>
    </svg>
  );
}
