/**
 * Tiny energy-based voice activity detector. It does NOT recognise words —
 * it only decides "a sound started" / "the sound ended", which is all the
 * echo game needs (any vocal attempt counts).
 *
 * Pure and frame-driven so it can be unit-tested without audio APIs.
 */
export type VadOptions = {
  /** 0..1 from settings; higher = reacts to quieter sounds */
  sensitivity: number;
  /** frames above threshold needed to start */
  startFrames?: number;
  /** ms of quiet that ends a segment */
  hangoverMs?: number;
  /** segments shorter than this are dropped as clicks/bumps */
  minSpeechMs?: number;
  /** force-end a segment after this long */
  maxSpeechMs?: number;
};

export type VadEvent = { type: 'start' } | { type: 'end'; durationMs: number } | { type: 'drop' } | null;

/** Map sensitivity (0..1) to an RMS threshold. 0.5 ≈ 0.03 RMS. */
export function thresholdFor(sensitivity: number): number {
  const s = Math.min(1, Math.max(0, sensitivity));
  // 0 → 0.09 (only loud sounds), 1 → 0.01 (whispers)
  return 0.09 * Math.pow(0.111, s);
}

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / Math.max(1, frame.length));
}

export function createVad(opts: VadOptions) {
  const startFrames = opts.startFrames ?? 2;
  const hangoverMs = opts.hangoverMs ?? 600;
  const minSpeechMs = opts.minSpeechMs ?? 250;
  const maxSpeechMs = opts.maxSpeechMs ?? 4000;
  let threshold = thresholdFor(opts.sensitivity);

  let speaking = false;
  let loudRun = 0;
  let speechMs = 0;
  let quietMs = 0;

  function reset() {
    speaking = false;
    loudRun = 0;
    speechMs = 0;
    quietMs = 0;
  }

  return {
    get speaking() {
      return speaking;
    },
    setSensitivity(s: number) {
      threshold = thresholdFor(s);
    },
    reset,
    /** Feed one frame's RMS level and its duration. */
    step(level: number, frameMs: number): VadEvent {
      const loud = level >= threshold;
      if (!speaking) {
        loudRun = loud ? loudRun + 1 : 0;
        if (loudRun >= startFrames) {
          speaking = true;
          speechMs = loudRun * frameMs;
          quietMs = 0;
          return { type: 'start' };
        }
        return null;
      }

      speechMs += frameMs;
      quietMs = loud ? 0 : quietMs + frameMs;

      if (quietMs >= hangoverMs || speechMs >= maxSpeechMs) {
        const voiced = speechMs - quietMs;
        reset();
        return voiced >= minSpeechMs ? { type: 'end', durationMs: voiced } : { type: 'drop' };
      }
      return null;
    },
  };
}
