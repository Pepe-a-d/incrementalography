// One draft, with no DOM and deterministic (the simulator runs exactly this code).
// Words cross a page of FW logical units from right to left, in LANES lanes.
// createRun(st, seed) → run · stepRun(run, dt, keys) · run.events · botKeys(run, bot) for the simulator.

import { makeWord, makeIlluminated, LEET } from './words.js';

export const FW = 1000; // logical width of the page
export const LANES = 7;
export const CHAR_W = 13; // logical width of one character (the renderer picks a font size to match)
export const ILLUM_SCALE = 1.4;
const MAX_T = 120; // safety cap
const LANE_UNITS = 64; // logical height of a lane (only bugs move vertically)

export function mulberry32(a) {
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRun(st, seed) {
  const rng = mulberry32(seed);
  const run = {
    st,
    rng,
    t: 0,
    words: [],
    nextId: 1,
    target: null,
    focus: st.focus,
    focusMax: st.focus,
    refilled: 0,
    streak: 0,
    bestStreak: 0,
    chars: 0,
    errors: 0,
    caught: 0,
    ink: 0,
    inkBonus: 0,
    firstKeyT: null,
    events: [],
    ended: false,
    dur: 0,
    spawnT: 0.3,
    illumT: st.illumEvery * 0.5,
    bugT: st.bugEvery * 0.6,
    bugs: [],
    nextBug: 1,
    line: { count: 0, ink: 0, bell: 0 },
    lines: 0,
    chain: 0, // Chain: words caught in a row, each less than 1.5 s after the last
    bestChain: 0,
    lastCatchT: -99,
    zone: false, // In the Zone: streak at its cap
    splashes: 0,
    steadyLeft: st.steady,
    page: [],
    speedBase: FW / st.crossTime,
  };
  // Something to type right away: a few words already on the page
  const n0 = 5;
  for (let i = 0; i < n0; i++) spawnWord(run, { x: FW * (0.3 + (0.62 * i) / n0) + rng() * 40, born: -99 });
  return run;
}

export const streakBonus = (run) => Math.min(run.st.streakCap, run.st.streakStart + run.streak * run.st.streakRate);
export const chainBonus = (run) => Math.min(run.st.chainCap, run.st.chainStep * Math.max(0, run.chain - 1));
const inZone = (run) => run.st.zone && streakBonus(run) >= run.st.streakCap - 1e-9;
export const live = (w) => !w.caught && !w.gone;
export const typeable = (w) => live(w) && w.x < FW - CHAR_W * 1.5;
export const wordWidth = (text, kind) => text.length * CHAR_W * (kind === 'illum' ? ILLUM_SCALE : 1);
export const targetWord = (run) => (run.target === null ? null : run.words.find((w) => w.id === run.target && live(w)) || null);

/** 1 = just appeared (faint), 0 = solid. Only in the Future era. */
export function faintness(run, w) {
  if (!run.st.faint) return 0;
  return Math.max(0, Math.min(1, 1 - (run.t - w.born) / run.st.faintTime));
}

function pickLane(run, x, width) {
  const free = [];
  for (let lane = 0; lane < LANES; lane++) {
    let edge = -Infinity;
    let left = Infinity;
    for (const w of run.words) {
      if (!live(w) || w.lane !== lane) continue;
      edge = Math.max(edge, w.x + w.w);
      left = Math.min(left, w.x);
    }
    // room on the right, and the new word won't catch up with the one ahead
    if (edge < x - 50 && !(left < x && edge > x - width - 80)) free.push({ lane, room: x - edge });
  }
  if (!free.length) return -1;
  free.sort((a, b) => b.room - a.room);
  const top = free.slice(0, Math.min(3, free.length));
  return top[Math.floor(run.rng() * top.length)].lane;
}

function spawnWord(run, { x = FW + 4, illum = false, born } = {}) {
  const { st, rng } = run;
  const avoid = new Set(run.words.filter(live).map((w) => w.text[0]));
  let text;
  let theme = false;
  const kind = illum ? 'illum' : 'n';
  if (illum) text = makeIlluminated(rng, avoid);
  else ({ text, theme } = makeWord(st.era, rng, avoid, { themeShare: st.themeShare, minLen: st.minLen }));
  const width = wordWidth(text, kind);
  const lane = pickLane(run, x, width);
  if (lane < 0) return null;
  const long = Math.max(0, text.length - 6);
  const w = {
    id: run.nextId++,
    text,
    kind,
    theme,
    gold: kind === 'n' && rng() < st.gold,
    punct: st.era === 'typewriter' && /[^A-Za-z]/.test(text),
    phrase: text.includes(' '),
    x,
    lane,
    w: width,
    // long words a little slower so they can be finished; illuminated words drift
    speed: run.speedBase * (0.85 + 0.3 * rng()) * (illum ? 0.6 : 1) / (1 + 0.04 * long),
    typed: 0,
    errors: 0,
    bugged: false,
    bugIdx: -1,
    born: born ?? run.t,
  };
  run.words.push(w);
  run.events.push({ type: 'spawn', id: w.id });
  return w;
}

// ── Keys ───────────────────────────────────────────────────────────────────

function press(run, key) {
  if (run.ended) return;
  if (key === 'Escape') {
    const w = targetWord(run);
    if (w) { w.typed = 0; run.target = null; run.events.push({ type: 'release', id: w.id }); }
    return;
  }
  if (key === 'Enter') {
    if (run.line.bell > 0) lineBonus(run);
    return;
  }
  if (key.length !== 1) return;
  if (run.firstKeyT === null) run.firstKeyT = run.t;
  let w = targetWord(run);
  if (!w) {
    if (key === ' ') return; // a space between words is never a mistake
    let best = null;
    for (const c of run.words) if (typeable(c) && c.text[0] === key && (!best || c.x < best.x)) best = c;
    if (!best) { mistake(run, null, key); return; }
    w = best;
    run.target = w.id;
    run.events.push({ type: 'lock', id: w.id });
  }
  if (key === w.text[w.typed]) {
    w.typed += 1;
    run.chars += 1;
    run.streak += 1;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
    run.events.push({ type: 'key', id: w.id, i: w.typed - 1 });
    if (w.typed >= w.text.length) catchWord(run, w);
  } else {
    mistake(run, w, key);
  }
}

function mistake(run, w, key) {
  const st = run.st;
  run.errors += 1;
  if (w) w.errors += 1;
  run.events.push({ type: 'error', id: w ? w.id : null, key, expected: w ? w.text[w.typed] : null });
  if (st.perfect) { finishRun(run); return; }
  if (run.steadyLeft > 0) run.steadyLeft -= 1;
  else run.streak = 0;
  if (!run.freezeFocus) run.focus -= st.errCost;
}

function addFocus(run, s) {
  const room = Math.max(0, run.focusMax * run.st.refillCap - run.refilled); // a draft wins back at most part of what it started with
  const add = Math.min(s, room, run.focusMax - run.focus);
  if (add <= 0) return 0;
  run.focus += add;
  run.refilled += add;
  return add;
}

/** Ink a word is worth right now. */
export function wordValue(run, w) {
  const st = run.st;
  let v = w.text.length * st.eraValue * st.value;
  if (w.kind === 'illum') v *= st.illumMult;
  if (w.theme) v *= st.themeMult;
  if (w.gold) v *= st.goldMult;
  if (w.text.length >= st.longLen) v *= st.longMult;
  if (w.punct) v *= st.punctMult;
  if (w.phrase) v *= st.phraseMult;
  if (w.bugged) v *= st.bugMult;
  if (faintness(run, w) > 0.25) v *= st.faintMult;
  v *= (1 + streakBonus(run)) * (run.zone ? st.zoneMult : 1);
  return v;
}

function catchWord(run, w, splash = false) {
  const st = run.st;
  const faint = faintness(run, w) > 0.25;
  if (!splash && st.chain) {
    run.chain = run.t - run.lastCatchT <= st.chainWindow ? run.chain + 1 : 1;
    run.lastCatchT = run.t;
    if (run.chain > run.bestChain) run.bestChain = run.chain;
  }
  const v = wordValue(run, w) * (1 + chainBonus(run));
  w.caught = true;
  run.ink += v;
  run.caught += 1;
  let focus = 0;
  if (splash) {
    run.splashes += 1;
  } else {
    run.target = null;
    if (w.errors === 0) focus += st.refill;
    if (w.kind === 'illum') focus += st.illumFocus;
    if (w.bugged) focus += st.bugFocus;
    focus = addFocus(run, focus);
    if (st.line) {
      run.line.count += 1;
      run.line.ink += v;
      if (run.line.count >= st.lineWords && run.line.bell === 0) {
        run.line.bell = st.lineWindow;
        run.events.push({ type: 'bell' });
      }
    }
  }
  run.page.push(w.text);
  if (run.page.length > 40) run.page.shift();
  run.events.push({ type: 'catch', id: w.id, text: w.text, x: w.x, lane: w.lane, kind: w.kind, amount: v, gold: w.gold, theme: w.theme, bugged: w.bugged, faint, perfect: w.errors === 0, focus, chain: splash ? 0 : run.chain, splash, long: w.text.length >= st.longLen });
  // Ink Splash: the word splashes onto the nearest short word and catches it too
  if (!splash && st.splash && run.rng() < st.splash) {
    let best = null;
    let bd = Infinity;
    for (const o of run.words) {
      if (!typeable(o) || o.id === run.target || o.kind !== 'n' || o.text.length > 7) continue;
      const d = Math.abs(o.x - w.x) + Math.abs(o.lane - w.lane) * 90;
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      run.events.push({ type: 'splash', from: { x: w.x + w.w / 2, lane: w.lane }, to: { x: best.x + best.w / 2, lane: best.lane } });
      catchWord(run, best, true);
    }
  }
}

function lineBonus(run) {
  const st = run.st;
  const bonus = run.line.ink * st.lineBonus;
  run.ink += bonus;
  run.inkBonus += bonus;
  run.lines += 1;
  const focus = addFocus(run, st.lineFocus);
  run.events.push({ type: 'line', amount: bonus, focus });
  run.line = { count: 0, ink: 0, bell: 0 };
}

// ── Bugs (Computer era) ────────────────────────────────────────────────────

function bugSpot(w) {
  // a letter at index ≥ 1 that has a look-alike symbol and is not typed yet
  const from = Math.max(1, w.typed);
  const spots = [];
  for (let i = from; i < w.text.length; i++) if (LEET[w.text[i]]) spots.push(i);
  return spots;
}

function bugTargetOk(run, w) {
  return w && typeable(w) && !w.bugged && w.kind === 'n' && w.id !== run.target && bugSpot(w).length > 0;
}

function spawnBug(run) {
  const cands = run.words.filter((w) => bugTargetOk(run, w) && w.x > FW * 0.35);
  if (!cands.length) return;
  const w = cands[Math.floor(run.rng() * cands.length)];
  run.bugs.push({ id: run.nextBug++, x: FW + 20, y: run.rng() * (LANES - 1) * LANE_UNITS, target: w.id, speed: 330 });
}

function stepBugs(run, dt) {
  for (const b of run.bugs) {
    let w = run.words.find((x) => x.id === b.target);
    if (!bugTargetOk(run, w)) {
      const cands = run.words.filter((x) => bugTargetOk(run, x));
      w = cands.length ? cands[Math.floor(run.rng() * cands.length)] : null;
      if (!w) { b.dead = true; continue; }
      b.target = w.id;
    }
    const tx = w.x + w.w * 0.5;
    const ty = w.lane * LANE_UNITS;
    const dx = tx - b.x;
    const dy = ty - b.y;
    const d = Math.hypot(dx, dy);
    const stepLen = b.speed * dt;
    if (d <= stepLen + 6) {
      const spots = bugSpot(w);
      const i = spots[Math.floor(run.rng() * spots.length)];
      w.text = w.text.slice(0, i) + LEET[w.text[i]] + w.text.slice(i + 1);
      w.bugged = true;
      w.bugIdx = i;
      b.dead = true;
      run.events.push({ type: 'bug', id: w.id, x: w.x + i * CHAR_W, lane: w.lane });
    } else {
      b.x += (dx / d) * stepLen;
      b.y += (dy / d) * stepLen;
    }
  }
  run.bugs = run.bugs.filter((b) => !b.dead);
}

// ── Step ───────────────────────────────────────────────────────────────────

export function stepRun(run, dt, keys = []) {
  if (run.ended) return;
  const st = run.st;
  for (const k of keys) press(run, k);
  if (run.ended) return;
  run.t += dt;
  const zone = inZone(run);
  if (zone !== run.zone) { run.zone = zone; run.events.push({ type: zone ? 'zone' : 'unzone' }); }
  if (!run.freezeFocus) run.focus -= dt * st.drainMult * (run.zone ? st.zoneDrain : 1);

  for (const w of run.words) {
    if (!live(w)) continue;
    w.x -= w.speed * dt;
    if (w.x + w.w < 0) {
      w.gone = true;
      if (run.target === w.id) run.target = null;
      run.events.push({ type: 'escape', id: w.id });
    }
  }

  const liveCount = run.words.filter((w) => live(w) && w.kind === 'n').length;
  const wanted = st.words;
  run.spawnT -= dt;
  if (!run.noSpawn && run.spawnT <= 0 && liveCount < wanted) run.spawnT = spawnWord(run) ? 0.45 + run.rng() * 0.5 : 0.15;

  if (st.illum && !run.noSpawn) {
    run.illumT -= dt;
    if (run.illumT <= 0 && !run.words.some((w) => live(w) && w.kind === 'illum')) {
      run.illumT = spawnWord(run, { illum: true }) ? st.illumEvery * (0.8 + 0.4 * run.rng()) : 0.3;
    }
  }

  if (st.bugs) {
    run.bugT -= dt;
    if (run.bugT <= 0) { spawnBug(run); run.bugT = st.bugEvery * (0.7 + 0.6 * run.rng()); }
    stepBugs(run, dt);
  }

  if (run.line.bell > 0 && !run.freezeBell) {
    run.line.bell -= dt;
    if (run.line.bell <= 0) {
      run.line = { count: 0, ink: 0, bell: 0 };
      run.events.push({ type: 'bellmiss' });
    }
  }

  run.words = run.words.filter(live);

  if (run.focus <= 0 || run.t >= MAX_T) finishRun(run);
}

// ── Tutorial hooks (tutorial.js): run.noSpawn stops new words, run.freezeFocus stops the drain and the cost of mistakes,
// run.freezeBell keeps the bell ringing until Enter, run.tutMark has render.js box the key to press next,
// placeWord puts a chosen word on the page and sendBug sends a bug to it.

/** A bug that crawls from the right edge into this word (Computer era). */
export function sendBug(run, w) {
  run.bugs.push({ id: run.nextBug++, x: FW + 20, y: (LANES - 1) * LANE_UNITS * 0.5, target: w.id, speed: 330 });
}

export function placeWord(run, text, { x = FW * 0.5, lane = 3, speed = 0, born = -99 } = {}) {
  const w = {
    id: run.nextId++, text, kind: 'n', theme: false, gold: false, punct: run.st.era === 'typewriter' && /[^A-Za-z]/.test(text), phrase: text.includes(' '),
    x, lane, w: wordWidth(text, 'n'), speed, typed: 0, errors: 0, bugged: false, bugIdx: -1, born,
  };
  run.words.push(w);
  run.events.push({ type: 'spawn', id: w.id });
  return w;
}

export function finishRun(run) {
  if (run.ended) return;
  run.ended = true;
  run.focus = Math.max(0, run.focus);
  run.dur = run.t;
  run.target = null;
  run.events.push({ type: 'end' });
}

// ── Bot typist (simulator and smoke test) ──────────────────────────────────

/** bot: { wpm, err, rng } — a person who picks a word, types it at their speed and slips now and then. Returns the keys of this step. */
export function botKeys(run, dt, bot) {
  if (run.ended) return [];
  const rng = bot.rng;
  const keys = [];
  if (run.line.bell > 0) {
    if (bot.bellT === undefined) { bot.bellT = 0.3 + rng() * 0.5; bot.bellHit = rng() < (bot.bell ?? 0.85); }
    bot.bellT -= dt;
    if (bot.bellT <= 0 && bot.bellHit) { keys.push('Enter'); bot.bellHit = false; }
  } else bot.bellT = undefined;

  bot.wait = (bot.wait ?? 0.5) - dt;
  if (bot.wait > 0) return keys;
  const interval = 60 / (bot.wpm * 5);
  let w = targetWord(run);
  if (!w) {
    w = botChoose(run, bot, interval);
    if (!w) { bot.wait = 0.15; return keys; }
    if (!bot.thinking) { bot.thinking = true; bot.wait = 0.32 * Math.sqrt(50 / bot.wpm); return keys; }
  }
  bot.thinking = false;
  const expected = w.text[w.typed];
  keys.push(rng() < bot.err ? wrongKey(expected, rng) : expected);
  bot.wait = interval * (0.6 + 0.8 * rng());
  return keys;
}

function botChoose(run, bot, interval) {
  const rng = bot.rng;
  const cands = run.words.filter((w) => typeable(w) && (w.x + w.w) / w.speed > w.text.length * interval * 1.25 + 0.5);
  if (!cands.length) return null;
  // first letters must be unique for the bot's choice to be the one the game locks
  if (rng() < 0.45) return cands.reduce((a, b) => (a.x < b.x ? a : b));
  const score = (w) => wordValue(run, w) / (w.text.length * interval + 0.35);
  return cands.reduce((a, b) => (score(a) >= score(b) ? a : b));
}

const KEYS = 'abcdefghijklmnopqrstuvwxyz';
function wrongKey(expected, rng) {
  let k;
  do { k = KEYS[Math.floor(rng() * KEYS.length)]; } while (k === expected);
  return k;
}
