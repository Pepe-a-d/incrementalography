// The advisor: how much each upgrade would change YOUR ink per draft.
// It plays a few quick drafts with a bot typing like you (your recent wpm and accuracy),
// with and without the next level of each upgrade, on the same seeds so only the upgrade differs.
// It runs in small chunks so the screen never freezes, and remembers results until something changes.

import { computeStats, treeOf } from './game.js';
import { createRun, stepRun, botKeys, mulberry32 } from './run.js';

const SEEDS = 8;
const DT = 1 / 30;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Bot settings that type like the player (the bot loses ~30% of its speed choosing words). */
export function profile(s) {
  const wpm = s.stats.avgWpm || 40;
  const acc = s.stats.avgAcc || 0.95;
  return { wpm: clamp(wpm / 0.7, 20, 180), err: clamp(1 - acc, 0.01, 0.2) };
}

function draftInk(s, seed, prof) {
  const run = createRun(computeStats(s), seed);
  const bot = { wpm: prof.wpm, err: prof.err, rng: mulberry32(seed * 31 + 7) };
  while (!run.ended) {
    stepRun(run, DT, botKeys(run, DT, bot));
    run.events.length = 0;
  }
  return run.ink;
}

function meanInk(s, prof) {
  let t = 0;
  for (let i = 0; i < SEEDS; i++) t += draftInk(s, 9001 + i * 17, prof);
  return t / SEEDS;
}


export class Advisor {
  constructor() {
    this.key = null;
    this.map = new Map(); // id → { gain, text }
    this.best = null;
    this.timer = null;
    this.listeners = new Set();
  }

  onUpdate(fn) { this.listeners.add(fn); }
  emit() { for (const fn of this.listeners) fn(); }
  get(id) { return this.map.get(id) || null; }

  /** Starts (or keeps) the estimates for the current state. */
  request(s) {
    const prof = profile(s);
    const key = JSON.stringify([s.levels, s.era, s.trophies, s.edition, Math.round(prof.wpm / 3), Math.round(prof.err * 50)]);
    if (key === this.key) return;
    this.key = key;
    clearTimeout(this.timer);
    const snap = structuredClone(s);
    const T = treeOf(snap);
    const todo = T.nodes.filter((n) => { const st = T.status(snap, n); return st === 'buy' || st === 'poor'; });
    const map = new Map();
    let base = null;
    let i = 0;
    const step = () => {
      if (this.key !== key) return;
      const t0 = performance.now();
      if (base === null) base = meanInk(snap, prof);
      while (i < todo.length && performance.now() - t0 < 12) {
        const n = todo[i++];
        if (n.id === 'goldleaf') {
          // golden words are too rare for a few drafts to see: work it out (3% of words ×5 → 6% of words ×15)
          const st = computeStats(snap);
          const before = 1 + (st.goldMult - 1) * st.gold;
          const after = 1 + (st.goldMult * 3 - 1) * st.gold * 2;
          map.set(n.id, { gain: after / before - 1, text: null });
          continue;
        }
        const next = structuredClone(snap);
        next.levels[n.id] = 1;
        const gain = base > 0 ? meanInk(next, prof) / base - 1 : 0;
        map.set(n.id, { gain, text: null });
      }
      if (i < todo.length) { this.timer = setTimeout(step, 0); return; }
      this.map = map;
      this.best = pickBest(snap, map);
      this.emit();
    };
    this.timer = setTimeout(step, 30);
  }
}

/** The ink upgrade that gives the most ink per draft for its price (and is in reach). */
function pickBest(s, map) {
  let best = null;
  let bestScore = 0;
  const T = treeOf(s);
  for (const n of T.nodes) {
    const a = map.get(n.id);
    const st = T.status(s, n);
    if (!a || a.gain < 0.01 || (st !== 'buy' && st !== 'poor')) continue;
    const score = a.gain / T.cost(s, n);
    if (score > bestScore) { bestScore = score; best = n.id; }
  }
  return best;
}

export const fmtGain = (g) => `${g >= 0 ? '+' : '−'}${Math.abs(g * 100) < 10 ? (Math.abs(g) * 100).toFixed(1) : Math.round(Math.abs(g) * 100)}%`;
