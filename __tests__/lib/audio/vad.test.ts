import { describe, expect, it } from 'vitest';
import { createVad, rms, thresholdFor } from '@/lib/audio/vad';

const F = 40; // ms per frame

function run(vad: ReturnType<typeof createVad>, levels: number[]) {
  return levels.map((l) => vad.step(l, F)).filter(Boolean);
}

describe('vad', () => {
  it('higher sensitivity means a lower threshold', () => {
    expect(thresholdFor(1)).toBeLessThan(thresholdFor(0.5));
    expect(thresholdFor(0.5)).toBeLessThan(thresholdFor(0));
  });

  it('detects a sound and its end after the quiet hangover', () => {
    const vad = createVad({ sensitivity: 0.5, hangoverMs: 200, minSpeechMs: 100 });
    const events = run(vad, [0, 0.2, 0.2, 0.2, 0.2, 0.2, 0, 0, 0, 0, 0, 0]);
    expect(events[0]).toEqual({ type: 'start' });
    expect(events[1]?.type).toBe('end');
    expect(vad.speaking).toBe(false);
  });

  it('ignores a single loud click', () => {
    const vad = createVad({ sensitivity: 0.5 });
    expect(run(vad, [0, 0.5, 0, 0, 0])).toEqual([]);
  });

  it('drops segments shorter than minSpeechMs', () => {
    const vad = createVad({ sensitivity: 0.5, hangoverMs: 120, minSpeechMs: 400 });
    const events = run(vad, [0.2, 0.2, 0, 0, 0, 0]);
    expect(events.at(-1)).toEqual({ type: 'drop' });
  });

  it('force-ends very long sounds', () => {
    const vad = createVad({ sensitivity: 0.5, maxSpeechMs: 400 });
    const events = run(vad, Array(30).fill(0.3));
    expect(events.filter((e) => e?.type === 'end').length).toBeGreaterThan(0);
  });

  it('computes rms', () => {
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array([]))).toBe(0);
  });
});
