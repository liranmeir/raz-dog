import type { DogMood } from '@/components/Dog';

/**
 * Which animation clip to play for each mood. AI tools (Tripo etc.) name
 * clips inconsistently ("Idle", "idle_01", "Armature|Jump"), so we match by
 * keyword in priority order rather than by exact name.
 */
export const MOOD_CLIP_KEYWORDS: Record<DogMood, string[]> = {
  idle: ['idle', 'stand', 'breath'],
  listen: ['look', 'sniff', 'idle', 'stand'],
  talk: ['bark', 'talk', 'idle', 'stand'],
  happy: ['happy', 'jump', 'celebrate', 'wag', 'idle'],
  giggle: ['happy', 'wag', 'jump', 'idle'],
  eat: ['eat', 'chew', 'bite', 'sniff', 'idle'],
  hmm: ['sit', 'look', 'idle'],
  dance: ['dance', 'spin', 'jump', 'run', 'happy', 'idle'],
  sleep: ['sleep', 'lie', 'lay', 'rest', 'sit', 'idle'],
};

/** Moods whose clip should play once and hold, rather than loop. */
export const ONE_SHOT_MOODS: ReadonlySet<DogMood> = new Set(['happy', 'giggle', 'eat', 'hmm']);

const normalize = (s: string) => s.toLowerCase().replace(/^.*\|/, '');

/** Pick the best clip name for a mood from the model's clips, or null if there are none. */
export function pickClip(mood: DogMood, clipNames: string[]): string | null {
  if (clipNames.length === 0) return null;
  for (const kw of MOOD_CLIP_KEYWORDS[mood]) {
    const hit = clipNames.find((n) => normalize(n).includes(kw));
    if (hit) return hit;
  }
  return clipNames[0];
}

/** Find the head bone (or the closest match) for procedural "talking". */
export function pickHeadBoneName(boneNames: string[]): string | null {
  const order = [/^head$/i, /head(?!.*end)/i, /neck/i];
  for (const re of order) {
    const hit = boneNames.find((n) => re.test(n.replace(/^.*[|:]/, '')));
    if (hit) return hit;
  }
  return null;
}
