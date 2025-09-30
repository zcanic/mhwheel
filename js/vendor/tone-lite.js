// tone-lite.js - 本地降级版 Tone.js，仅覆盖项目所需的 Synth / PluckSynth
// 目的：在 CDN 不可用时仍提供基础音效体验（Web Audio API 简易实现）

const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
let sharedCtx = null;

function getContext(){
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  return sharedCtx;
}

function ensureContext(){
  const ctx = getContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(()=>{});
  }
  return ctx;
}

const SEMITONES_FROM_A4 = {
  'C': -9,
  'C#': -8,
  'Db': -8,
  'D': -7,
  'D#': -6,
  'Eb': -6,
  'E': -5,
  'F': -4,
  'F#': -3,
  'Gb': -3,
  'G': -2,
  'G#': -1,
  'Ab': -1,
  'A': 0,
  'A#': 1,
  'Bb': 1,
  'B': 2
};

function noteToFrequency(note){
  if (typeof note !== 'string') return 440;
  const match = note.trim().match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!match) return 440;
  const [, base, accidentalRaw, octaveRaw] = match;
  const accidental = accidentalRaw || '';
  const key = `${base.toUpperCase()}${accidental}`;
  const octave = parseInt(octaveRaw, 10);
  const semitoneFromA4 = (octave - 4) * 12 + (SEMITONES_FROM_A4[key] ?? 0);
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

function parseDuration(duration, defaultValue = 0.3){
  if (typeof duration === 'number' && duration > 0) return duration;
  if (typeof duration !== 'string') return defaultValue;
  if (duration.endsWith('s')){
    const val = parseFloat(duration.slice(0, -1));
    return Number.isFinite(val) && val > 0 ? val : defaultValue;
  }
  if (duration.endsWith('n')){
    const fraction = parseInt(duration, 10);
    if (Number.isFinite(fraction) && fraction > 0){
      const quarter = 0.5; // 120 BPM 假定
      return (4 / fraction) * quarter;
    }
  }
  return defaultValue;
}

class BaseSynth {
  constructor(options = {}){
    this.options = options;
  }

  toDestination(){
    return this;
  }
}

function scheduleEnvelope(ctx, gainNode, duration){
  const now = ctx.currentTime;
  const attack = 0.01;
  const release = Math.max(0.05, duration * 0.5);
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.4, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
}

export class Synth extends BaseSynth {
  triggerAttackRelease(note, duration){
    const ctx = ensureContext();
    if (!ctx) return;
    const freq = noteToFrequency(note);
    const time = parseDuration(duration, 0.4);
    const osc = ctx.createOscillator();
    osc.type = this.options.oscillator?.type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    const gain = ctx.createGain();
    scheduleEnvelope(ctx, gain, time);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + time + 0.2);
  }
}

export class PluckSynth extends BaseSynth {
  triggerAttackRelease(note, duration){
    const ctx = ensureContext();
    if (!ctx) return;
    const freq = noteToFrequency(note);
    const time = parseDuration(duration, 0.25);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    const gain = ctx.createGain();
    scheduleEnvelope(ctx, gain, time * 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + time);
  }
}

export async function start(){
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume();
}

export default {
  Synth,
  PluckSynth,
  start
};
