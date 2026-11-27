'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { DogMood } from '@/components/Dog';

const Dog3D = dynamic(() => import('@/components/Dog3D'), { ssr: false });

const MOODS: DogMood[] = ['idle', 'listen', 'talk', 'happy', 'giggle', 'eat', 'hmm', 'dance', 'sleep'];

/** Dev/tuning page: /dog-preview?mood=happy&mouth=0.6 */
function Preview() {
  const q = useSearchParams();
  const mood = (MOODS.find((m) => m === q.get('mood')) ?? 'idle') as DogMood;
  const mouth = Number(q.get('mouth') ?? 0.6);
  return (
    <main className="flex h-dvh items-center justify-center bg-gradient-to-b from-sky-100 to-amber-50">
      <Dog3D mood={mood} mouthOpen={mouth} className="h-[80dvh]" />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
