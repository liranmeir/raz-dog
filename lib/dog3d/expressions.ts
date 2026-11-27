import type { DogMood } from '@/components/Dog';

/**
 * Facial/body pose targets for the procedural 3D puppy. The renderer damps
 * the current pose toward these every frame, so moods blend smoothly.
 */
export type Expression = {
  /** 0 open … 1 closed */
  lidTop: number;
  /** 0 hidden … 1 raised (crescent "^^" happy eyes) */
  lidBottom: number;
  /** eyebrow raise, -1 frown … 1 surprised; left/right separately */
  browL: number;
  browR: number;
  /** 0 closed … 1 wide open */
  mouth: number;
  /** ears: 0 floppy … 1 perked */
  earLift: number;
  /** head roll (radians), +right */
  tilt: number;
  /** head pitch (radians), + looks down */
  nod: number;
  /** body bounce amplitude */
  bounce: number;
  /** tail wag speed (rad/s) */
  wag: number;
};

// default is a friendly open grin with slightly smiling eyes
const BASE: Expression = {
  lidTop: 0.04,
  lidBottom: 0.22,
  browL: 0.25,
  browR: 0.25,
  mouth: 0.3,
  earLift: 0,
  tilt: 0,
  nod: 0,
  bounce: 0,
  wag: 5,
};

const MOODS: Record<DogMood, Partial<Expression>> = {
  idle: {},
  listen: { lidTop: 0, lidBottom: 0.1, browL: 0.6, browR: 0.6, mouth: 0.2, earLift: 1, tilt: -0.22, wag: 3 },
  talk: { lidTop: 0.08, browL: 0.3, browR: 0.3, earLift: 0.6, wag: 8 },
  happy: { lidTop: 0, lidBottom: 0.85, browL: 0.7, browR: 0.7, mouth: 0.75, earLift: 0.5, bounce: 0.16, wag: 22 },
  giggle: { lidTop: 0.45, lidBottom: 0.7, browL: 0.4, browR: 0.4, mouth: 0.85, earLift: 0.3, wag: 24 },
  eat: { lidTop: 0.2, lidBottom: 0.5, browL: 0.3, browR: 0.3, nod: 0.18, wag: 18 },
  hmm: { lidTop: 0.2, lidBottom: 0, browL: 0.8, browR: -0.3, mouth: 0.05, tilt: 0.32, wag: 2 },
  dance: { lidTop: 0, lidBottom: 0.85, browL: 0.8, browR: 0.8, mouth: 0.8, earLift: 0.6, bounce: 0.22, wag: 26 },
  sleep: { lidTop: 1, lidBottom: 0, browL: 0, browR: 0, mouth: 0, nod: 0.42, earLift: 0, wag: 0 },
};

export function expressionFor(mood: DogMood): Expression {
  return { ...BASE, ...MOODS[mood] };
}
