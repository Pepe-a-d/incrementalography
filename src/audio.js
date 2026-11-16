// Sounds made with WebAudio (no files): each era has its own key sound — quill, typewriter, mechanical keyboard, synth.

let ctx = null;
let master = null;
let musicGain = null;
let noise = null;
let volume = 0.7;
let musicVolume = 0.6;

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

/** The boss music has its own volume (Settings → music). */
export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  if (musicGain) musicGain.gain.value = musicVolume * 0.8;
}

/** The audio context and the music's output (music.js plays into it). */
export function musicOut() {
  const a = audio();
  if (!a) return null;
  if (!musicGain) {
    musicGain = a.createGain();
    musicGain.gain.value = musicVolume * 0.8;
    musicGain.connect(a.destination);
  }
  return { ctx: a, out: musicGain, noise };
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.05, slide = 0, delay = 0, attack = 0.006 } = {}) {
  if (volume <= 0) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function hiss(dur, { freq = 3000, q = 1, vol = 0.05, delay = 0, type = 'bandpass', sweep = 0 } = {}) {
  if (volume <= 0) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.3);
  src.stop(t + dur + 0.02);
}

const KEY = {
  scriptorium() { hiss(0.05 + Math.random() * 0.03, { freq: 2600 + Math.random() * 1800, q: 0.8, vol: 0.05, sweep: 1.4 }); },
  typewriter() {
    hiss(0.025, { freq: 2200, q: 1.5, vol: 0.09, type: 'highpass' });
    tone(120 + Math.random() * 20, 0.05, { type: 'triangle', vol: 0.07, slide: 0.6 });
  },
  computer() {
    hiss(0.018, { freq: 3800, q: 2, vol: 0.06 });
    tone(700 + Math.random() * 80, 0.025, { type: 'square', vol: 0.012 });
  },
  future() { tone(900 + Math.random() * 300, 0.06, { vol: 0.025, slide: 1.2 }); },
};

// pentatonic steps so a long streak climbs a pleasant scale
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const semi = (n) => 2 ** (n / 12);

let lastKey = 0;
export const sfx = {
  key(era) {
    const now = performance.now();
    if (now - lastKey < 18) return;
    lastKey = now;
    (KEY[era] || KEY.scriptorium)();
  },
  error() {
    tone(95, 0.12, { type: 'sine', vol: 0.09, slide: 0.7 });
    hiss(0.05, { freq: 400, q: 0.7, vol: 0.03, type: 'lowpass' });
  },
  catch(streakFrac = 0, kind = 'n') {
    const step = SCALE[Math.min(SCALE.length - 1, Math.floor(streakFrac * (SCALE.length - 1)))];
    const f = 523 * semi(step);
    tone(f, 0.16, { type: 'triangle', vol: 0.035 });
    if (kind === 'illum') { tone(f * 1.5, 0.4, { type: 'triangle', vol: 0.03, delay: 0.06 }); tone(f * 2, 0.5, { vol: 0.02, delay: 0.12 }); }
  },
  gold() { [0, 4, 7, 12].forEach((n, i) => tone(784 * semi(n), 0.22, { vol: 0.03, delay: i * 0.05 })); },
  bell() { tone(2093, 1.1, { vol: 0.05, attack: 0.002 }); tone(4186, 0.6, { vol: 0.015, attack: 0.002 }); },
  ret() {
    hiss(0.35, { freq: 1400, q: 0.6, vol: 0.05, sweep: 0.5 });
    tone(90, 0.12, { type: 'triangle', vol: 0.09, delay: 0.32, slide: 0.7 });
  },
  bug() { tone(1400, 0.08, { type: 'square', vol: 0.01, slide: 0.5 }); },
  /** step: buys in a row climb the scale */
  buy(step = 0) {
    const f = 540 * semi(SCALE[Math.min(SCALE.length - 1, step)]);
    tone(f, 0.07, { type: 'triangle', vol: 0.04 });
    tone(f * 1.5, 0.12, { type: 'triangle', vol: 0.035, delay: 0.05 });
  },
  milestone() { [0, 4, 7, 12, 16].forEach((n, i) => tone(523 * semi(n), 0.4, { type: 'triangle', vol: 0.035, delay: i * 0.06 })); },
  keystone() { [0, 7, 12, 19, 24].forEach((n, i) => tone(392 * semi(n), 0.6, { vol: 0.035, delay: i * 0.07 })); hiss(0.5, { freq: 6000, q: 0.5, vol: 0.02, sweep: 0.5 }); },
  chain(n = 2) { tone(660 * semi(Math.min(19, (n - 1) * 2)), 0.09, { type: 'square', vol: 0.012 }); },
  zone() { [0, 7, 12].forEach((n, i) => tone(784 * semi(n), 0.5, { vol: 0.03, delay: i * 0.05 })); hiss(0.6, { freq: 7000, q: 0.4, vol: 0.015 }); },
  streak(level = 0) { [0, 4, 7].forEach((n, i) => tone(440 * semi(n + level * 2), 0.25, { type: 'triangle', vol: 0.03, delay: i * 0.05 })); },
  splash() { hiss(0.18, { freq: 900, q: 0.8, vol: 0.06, sweep: 2.2 }); tone(300, 0.1, { vol: 0.03, slide: 2 }); },
  heartbeat() { tone(60, 0.12, { vol: 0.12, slide: 0.8 }); tone(55, 0.12, { vol: 0.09, slide: 0.8, delay: 0.16 }); },
  tick(k = 0) { tone(900 + k * 500, 0.03, { type: 'square', vol: 0.008 }); },
  stamp() { tone(80, 0.18, { type: 'triangle', vol: 0.12, slide: 0.6 }); hiss(0.08, { freq: 500, q: 0.7, vol: 0.06, type: 'lowpass' }); },
  deny() { tone(150, 0.08, { type: 'square', vol: 0.015 }); },
  pour() { hiss(1.15, { freq: 700, q: 0.6, vol: 0.05, sweep: 0.45, type: 'lowpass' }); tone(110, 0.9, { type: 'sine', vol: 0.03, slide: 0.7 }); },
  step() { tone(587, 0.12, { type: 'triangle', vol: 0.03 }); tone(880, 0.22, { type: 'triangle', vol: 0.03, delay: 0.08 }); },
  start() { tone(440, 0.08, { type: 'triangle', vol: 0.03 }); tone(660, 0.12, { type: 'triangle', vol: 0.03, delay: 0.06 }); },
  end() { tone(523, 0.2, { type: 'triangle', vol: 0.04 }); tone(392, 0.35, { type: 'triangle', vol: 0.035, delay: 0.12 }); },
  record() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.035, delay: i * 0.08 })); },
  publish() { [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.7, { vol: 0.03, delay: i * 0.09 })); },
};
