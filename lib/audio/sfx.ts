'use client';

/**
 * Soft synthesized sound effects. Deliberately quiet, low-pitched-ish and
 * short — the child is sensitive to noise, so nothing harsh or sudden.
 */
export class Sfx {
  constructor(private ctx: AudioContext, private out: GainNode) {}

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, endFreq?: number) {
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  star() {
    this.tone(660, 0, 0.18);
    this.tone(880, 0.1, 0.22);
    this.tone(1175, 0.2, 0.35, 'sine', 0.18);
  }

  giggle() {
    [0, 0.09, 0.18, 0.27].forEach((s, i) => this.tone(520 + i * 40, s, 0.08, 'triangle', 0.18, 700 + i * 40));
  }

  happy() {
    this.tone(440, 0, 0.15, 'triangle', 0.18, 660);
  }

  crunch() {
    [0, 0.14, 0.28].forEach((s) => this.noise(s, 0.08, 0.12));
  }

  /** gentle "hmm?" for a wrong pick — not a buzzer */
  hmm() {
    this.tone(330, 0, 0.25, 'sine', 0.15, 280);
  }

  pop() {
    this.tone(500, 0, 0.12, 'sine', 0.18, 900);
  }

  celebrate() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.3, 'triangle', 0.16));
  }

  yawn() {
    this.tone(300, 0, 0.9, 'sine', 0.12, 180);
  }

  private noise(start: number, dur: number, vol: number) {
    const t0 = this.ctx.currentTime + start;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start(t0);
  }
}

/** Speak a Hebrew word if the device has a Hebrew voice. Returns ms estimate, 0 if not spoken. */
export function speakHebrew(text: string, volume: number): number {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 0;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang?.toLowerCase().startsWith('he') || v.lang?.toLowerCase().startsWith('iw'));
  if (!voice) return 0;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  u.pitch = 1.2;
  u.volume = Math.max(0, Math.min(1, volume));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return 600 + text.length * 120;
}
