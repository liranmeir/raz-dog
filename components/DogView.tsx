'use client';

import dynamic from 'next/dynamic';
import { createContext, useContext } from 'react';
import { Dog, type DogMood } from '@/components/Dog';
import type { DogStyle } from '@/lib/game/state';

// three.js only loads when the 3D dog is actually chosen
const Dog3D = dynamic(() => import('@/components/Dog3D'), { ssr: false });

export const DogStyleContext = createContext<DogStyle>('3d');

type Props = {
  mood: DogMood;
  mouthOpen?: number;
  accessory?: { emoji: string; slot: 'head' | 'face' } | null;
  onHeadTap?: () => void;
  onBellyTap?: () => void;
  className?: string;
};

/** Renders the 2D SVG dog or the 3D dog, per the parent setting. */
export function DogView(props: Props) {
  const style = useContext(DogStyleContext);
  return style === '3d' ? <Dog3D {...props} /> : <Dog {...props} />;
}
