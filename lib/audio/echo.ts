'use client';

import { createVad, rms } from './vad';

export type EchoCallbacks = {
  /** live mic level 0..1 while listening */
  onLevel?: (level: number) => void;
  onHearStart?: () => void;
  /** a vocalisation was captured and is about to be played back */
  onPlaybackStart?: (durationMs: number) => void;
  /** level of the playback 0..1, for the dog's mouth */
  onPlaybackLevel?: (level: number) => void;
  onPlaybackEnd?: () => void;
};

const PLAYBACK_RATE = 1.5; // higher + faster = funny "dog voice"
const PREROLL_FRAMES = 4;
const HANGOVER_MS = 600;

/**
 * Listens to the mic, detects a vocal sound, and plays it back pitched up —
 * the "talking pet" mechanic. Mic input is ignored while playing back so
 * the dog never hears (and repeats) itself.
 */
export class EchoEngine {
  private ctx: AudioContext;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private output: GainNode;
  private vad;
  private preroll: Float32Array[] = [];
  private captured: Float32Array[] = [];
  private playing = false;
  private enabled = true;
  private cb: EchoCallbacks;

  constructor(ctx: AudioContext, output: GainNode, sensitivity: number, cb: EchoCallbacks) {
    this.ctx = ctx;
    this.output = output;
    this.cb = cb;
    this.vad = createVad({ sensitivity, hangoverMs: HANGOVER_MS });
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    const sink = this.ctx.createGain();
    sink.gain.value = 0; // processor must be connected to run, but stays silent
    this.source.connect(this.processor);
    this.processor.connect(sink);
    sink.connect(this.ctx.destination);
    this.processor.onaudioprocess = (e) => this.onFrame(e.inputBuffer.getChannelData(0));
  }

  setSensitivity(s: number) {
    this.vad.setSensitivity(s);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.vad.reset();
      this.captured = [];
    }
  }

  /** Pause listening (e.g. while another sound/voice is playing). */
  get busy() {
    return this.playing;
  }

  hold(ms: number) {
    this.playing = true;
    this.vad.reset();
    this.captured = [];
    window.setTimeout(() => (this.playing = false), ms);
  }

  stop() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.processor = null;
    this.source = null;
    this.stream = null;
  }

  private onFrame(data: Float32Array) {
    if (this.playing || !this.enabled) return;
    const frame = new Float32Array(data); // the buffer is reused by the browser
    const frameMs = (frame.length / this.ctx.sampleRate) * 1000;
    const level = rms(frame);
    this.cb.onLevel?.(Math.min(1, level * 8));

    const wasSpeaking = this.vad.speaking;
    if (wasSpeaking) this.captured.push(frame);

    const ev = this.vad.step(level, frameMs);
    if (ev?.type === 'start') {
      this.captured = [...this.preroll, frame];
      this.cb.onHearStart?.();
    } else if (ev?.type === 'end') {
      const trimFrames = Math.floor(HANGOVER_MS / frameMs) - 2;
      const frames = this.captured.slice(0, Math.max(1, this.captured.length - trimFrames));
      this.captured = [];
      this.playBack(frames, ev.durationMs);
    } else if (ev?.type === 'drop') {
      this.captured = [];
    }

    this.preroll.push(frame);
    if (this.preroll.length > PREROLL_FRAMES) this.preroll.shift();
  }

  private playBack(frames: Float32Array[], durationMs: number) {
    const length = frames.reduce((n, f) => n + f.length, 0);
    if (length === 0) return;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    let offset = 0;
    let peak = 0;
    for (const f of frames) {
      ch.set(f, offset);
      offset += f.length;
      for (let i = 0; i < f.length; i++) peak = Math.max(peak, Math.abs(f[i]));
    }
    // normalise quiet attempts so the dog is clearly audible, but gently
    const gainValue = peak > 0 ? Math.min(4, 0.7 / peak) : 1;
    // short fades avoid clicks
    const fade = Math.min(400, Math.floor(length / 10));
    for (let i = 0; i < fade; i++) {
      ch[i] *= i / fade;
      ch[length - 1 - i] *= i / fade;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = PLAYBACK_RATE;
    const g = this.ctx.createGain();
    g.gain.value = gainValue;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(g);
    g.connect(analyser);
    analyser.connect(this.output);

    this.playing = true;
    this.cb.onPlaybackStart?.(durationMs);
    const buf = new Float32Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      this.cb.onPlaybackLevel?.(Math.min(1, rms(buf) * 5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    src.onended = () => {
      cancelAnimationFrame(raf);
      this.cb.onPlaybackLevel?.(0);
      this.cb.onPlaybackEnd?.();
      // short pause so the tail of the playback isn't re-captured
      window.setTimeout(() => {
        this.playing = false;
        this.vad.reset();
      }, 350);
    };
    // hand it a fresh preroll after playback
    this.preroll = [];
    src.start();
  }
}
