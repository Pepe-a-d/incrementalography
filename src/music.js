// Boss music, composed in code with WebAudio (no files): one theme per era, looping, with three intensities that
// follow the fight's phases (each adds parts and speeds up). music.play(era), music.level(2), music.stop().
// A small sequencer schedules notes a little ahead of time, on a grid of steps (4 per beat, or 3 for a swing feel).

import { musicOut } from './audio.js';

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
let cur = null;

// ── Instruments ────────────────────────────────────────────────────────────

/** One note: an oscillator (or two, detuned) with an envelope and an optional low-pass filter and vibrato. */
function note(t, midi, dur, { type = 'sine', vol = 0.04, a = 0.01, r = 0.12, detune = 0, lp = 0, vib = 0, pan = 0 } = {}) {
  const { ctx, bus } = cur;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  let head = g;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(g); head = f; }
  let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  out.connect(bus);
  const oscs = detune ? [-detune, detune] : [0];
  for (const d of oscs) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(mtof(midi), t);
    o.detune.value = d;
    if (vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = 5.5;
      lg.gain.value = vib;
      l.connect(lg).connect(o.detune);
      l.start(t);
      l.stop(t + dur + r + 0.05);
    }
    o.connect(head);
    o.start(t);
    o.stop(t + dur + r + 0.05);
  }
}

/** Filtered noise: hats, snares, brushes, the wind. */
function hiss(t, dur, { vol = 0.03, f = 6000, q = 0.8, type = 'highpass' } = {}) {
  const { ctx, bus, noise } = cur;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(bus);
  src.start(t, Math.random() * 0.3);
  src.stop(t + dur + 0.02);
}

/** A drum: a sine that drops in pitch. */
function thump(t, { from = 150, to = 45, dur = 0.25, vol = 0.12 } = {}) {
  const { ctx, bus } = cur;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// ── Themes: bpm per intensity, steps per beat, and what plays on each step ──
// step(t, i, lvl, len): i counts steps from the start, len is one step in seconds.

const THEMES = {
  // The Abbot's Codex: an organ drone in D dorian, a chant on top; then a frame drum; then bells and a higher voice.
  scriptorium: {
    bpm: [76, 84, 96], beat: 4,
    step(t, i, lvl, len) {
      const bar = Math.floor(i / 16) % 4;
      const s = i % 16;
      const root = [50, 48, 50, 45][bar];
      if (s === 0) for (const n of [root, root + 7, root + 12]) note(t, n, len * 16, { type: 'triangle', vol: 0.018, a: 0.4, r: 0.6, lp: 900 });
      const chant = [0, 2, 3, 4, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 1, 0];
      const scale = [62, 64, 65, 67, 69, 71, 72, 74];
      if (s % 4 === 0) {
        const m = scale[chant[(bar * 4 + s / 4) % 16]];
        note(t, m, len * 3.8, { type: 'triangle', vol: 0.03, a: 0.08, r: 0.2, vib: 8 });
        if (lvl >= 3) note(t, m + 12, len * 3.8, { type: 'sine', vol: 0.012, a: 0.08, r: 0.2, vib: 6 });
      }
      if (lvl >= 2) {
        if (s === 0 || s === 8) thump(t, { from: 110, to: 50, dur: 0.35, vol: 0.13 });
        if (s === 6 || s === 12 || (lvl >= 3 && s === 14)) hiss(t, 0.09, { vol: 0.04, f: 1200, q: 1.2, type: 'bandpass' });
      }
      if (lvl >= 3) {
        if (s === 0 && bar % 2 === 0) { note(t, 86, 1.6, { vol: 0.02, a: 0.002, r: 1.2 }); note(t, 93, 1.2, { vol: 0.01, a: 0.002, r: 1 }); }
        if (s % 2 === 1) hiss(t, 0.04, { vol: 0.008, f: 9000 });
      }
    },
  },
  // The Deadline: swing. A walking bass, ride cymbal and piano; then brushes and typewriter clacks; then brass.
  typewriter: {
    bpm: [128, 140, 156], beat: 3,
    step(t, i, lvl, len) {
      const bar = Math.floor(i / 12) % 4;
      const s = i % 12;
      const chords = [[38, 41, 45, 48], [43, 47, 50, 53], [36, 40, 43, 47], [45, 49, 52, 55]]; // Dm7 G7 Cmaj7 A7
      const ch = chords[bar];
      const nextRoot = chords[(bar + 1) % 4][0];
      if (s % 3 === 0) {
        const walk = [ch[0], ch[1], ch[2], nextRoot - 1][s / 3];
        note(t, walk, len * 2.4, { type: 'triangle', vol: 0.07, a: 0.005, r: 0.15, lp: 700 });
      }
      if ([0, 3, 5, 6, 9, 11].includes(s)) hiss(t, s % 3 === 2 ? 0.06 : 0.12, { vol: 0.012, f: 7000 });
      if (s === 2 || s === 8) for (const n of [ch[1] + 12, ch[3] + 12, ch[0] + 26]) note(t, n, len * 1.5, { type: 'triangle', vol: 0.014, a: 0.005, r: 0.15 });
      if (lvl >= 2) {
        if (s === 3 || s === 9) hiss(t, 0.16, { vol: 0.035, f: 2200, q: 0.7, type: 'bandpass' });
        if ([2, 5, 8, 11].includes(s) && Math.random() < 0.35) { hiss(t, 0.02, { vol: 0.05, f: 2600 }); thump(t, { from: 160, to: 90, dur: 0.05, vol: 0.05 }); }
      }
      if (lvl >= 3) {
        if (s === 11 || (s === 5 && bar % 2 === 1)) for (const n of [ch[1] + 12, ch[2] + 12, ch[3] + 12]) note(t, n, len * 1.2, { type: 'sawtooth', vol: 0.016, a: 0.01, r: 0.08, lp: 1600 });
        if (s === 0 && bar === 0) note(t, 96, 1, { vol: 0.03, a: 0.002, r: 0.8 }); // the bell
      }
    },
  },
  // The Worm: chiptune. Square arpeggios and a triangle bass; then drums; then a lead.
  computer: {
    bpm: [138, 150, 164], beat: 4,
    step(t, i, lvl, len) {
      const bar = Math.floor(i / 16) % 4;
      const s = i % 16;
      const root = [45, 41, 48, 43][bar];
      const tri = bar === 0 ? [0, 3, 7, 12] : [0, 4, 7, 12];
      note(t, root + 24 + tri[s % 4], len * 0.7, { type: 'square', vol: 0.014, a: 0.002, r: 0.03 });
      if (s % 2 === 0) note(t, root + (s % 4 === 0 ? 0 : 12), len * 1.6, { type: 'triangle', vol: 0.06, a: 0.002, r: 0.04 });
      if (lvl >= 2) {
        if (s === 0 || s === 8 || (lvl >= 3 && s === 10)) thump(t, { from: 160, to: 40, dur: 0.18, vol: 0.14 });
        if (s === 4 || s === 12) { hiss(t, 0.12, { vol: 0.05, f: 1800, q: 0.8, type: 'bandpass' }); note(t, 55, 0.05, { type: 'square', vol: 0.02, a: 0.001, r: 0.03 }); }
        if (s % 2 === 0) hiss(t, 0.03, { vol: 0.012, f: 9000 });
      }
      if (lvl >= 3 && s % 2 === 0) {
        const lead = [4, 4, 3, 2, 3, 4, 5, 4, 2, 2, 1, 0, 1, 2, 4, 2, 4, 4, 3, 2, 3, 4, 7, 7, 5, 4, 3, 2, 1, 0, 1, 0];
        const sc = [69, 71, 72, 74, 76, 77, 79, 81];
        note(t, sc[lead[(bar % 2) * 8 + s / 2]] + 12, len * 1.7, { type: 'square', vol: 0.012, a: 0.003, r: 0.05 });
      }
    },
  },
  // The Echo: synthwave. Detuned saw pads and an arpeggiated bass; then a four-on-the-floor kick; then a lead.
  future: {
    bpm: [100, 108, 118], beat: 4,
    step(t, i, lvl, len) {
      const bar = Math.floor(i / 16) % 4;
      const s = i % 16;
      const root = [41, 37, 44, 39][bar]; // Fm Db Ab Eb
      const third = bar === 0 ? 3 : 4;
      if (s === 0) for (const n of [root + 12, root + 12 + third, root + 19, root + 24]) note(t, n, len * 16, { type: 'sawtooth', vol: 0.008, a: 0.6, r: 0.8, lp: 1100, detune: 8 });
      note(t, root + [0, 12, 7, 12][s % 4], len * 0.8, { type: 'sawtooth', vol: 0.02, a: 0.003, r: 0.05, lp: 700 });
      if (lvl >= 2) {
        if (s % 4 === 0) thump(t, { from: 130, to: 42, dur: 0.3, vol: 0.13 });
        if (s === 4 || s === 12) hiss(t, 0.45, { vol: 0.035, f: 1500, q: 0.5, type: 'bandpass' });
        if (s % 4 === 2) hiss(t, 0.05, { vol: 0.012, f: 8000 });
      }
      if (lvl >= 3 && s % 8 === 0) {
        const lead = [72, 68, 70, 67, 72, 75, 73, 70];
        note(t, lead[(bar * 2 + s / 8) % 8], len * 7.5, { type: 'square', vol: 0.012, a: 0.02, r: 0.3, vib: 12, lp: 2600 });
      }
    },
  },
};

// ── The sequencer ──────────────────────────────────────────────────────────

const AHEAD = 0.12;

function pump() {
  if (!cur) return;
  const T = THEMES[cur.theme];
  while (cur.next < cur.ctx.currentTime + AHEAD) {
    const len = 60 / T.bpm[cur.lvl - 1] / T.beat;
    T.step(cur.next, cur.i, cur.lvl, len);
    cur.next += len;
    cur.i += 1;
  }
}

export const music = {
  /** Starts an era's boss theme (from silence, fading in). */
  play(theme, lvl = 1) {
    this.stop(0.2);
    const o = musicOut();
    if (!o || !THEMES[theme]) return;
    const bus = o.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, o.ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, o.ctx.currentTime + 1.2);
    bus.connect(o.out);
    cur = { theme, lvl, ctx: o.ctx, bus, noise: o.noise, i: 0, next: o.ctx.currentTime + 0.1 };
    cur.timer = setInterval(pump, 25);
    pump();
  },
  /** The fight's phase: 1, 2 or 3 (more parts, faster). */
  level(lvl) { if (cur) cur.lvl = Math.max(1, Math.min(3, lvl)); },
  /** Fades out and stops. */
  stop(fade = 1.2) {
    if (!cur) return;
    const c = cur;
    cur = null;
    clearInterval(c.timer);
    const t = c.ctx.currentTime;
    c.bus.gain.cancelScheduledValues(t);
    c.bus.gain.setValueAtTime(c.bus.gain.value, t);
    c.bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => c.bus.disconnect(), fade * 1000 + 300);
  },
  get playing() { return cur ? cur.theme : null; },
};
