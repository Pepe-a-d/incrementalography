// Permanent progress: ink, fame, both trees, publishing, challenges, stats and saving. No DOM.

import { NODES, NODE_BY_ID, FAME_NODES, FAME_BY_ID, BASE, GAME, ERAS, ERA_IDS, CHALLENGES, CHALLENGE_BY_ID, OLD_COSTS, MUL } from './data.js';

export const SAVE_VERSION = 5; // 5: no helpers (older saves get back the ink and fame they spent on what is gone)
export const FAME_K = 120000; // ink in one book for the first point of fame (fame = √(ink / K))
const MASTERS = NODES.filter((n) => n.id.startsWith('master_')).map((n) => n.id);

export function newState(now = Date.now()) {
  return {
    game: GAME.id,
    v: SAVE_VERSION,
    seed: Math.floor(Math.random() * 2 ** 31),
    ink: 0,
    fame: 0,
    levels: {}, // ink tree: resets when you publish (it starts with nothing bought)
    fameLv: { pen: 1 }, // fame tree: permanent
    era: 'scriptorium',
    cycle: newCycle(now),
    drafts: 0,
    publishes: 0,
    chal: Object.fromEntries(CHALLENGES.map((c) => [c.id, 0])), // tiers done
    stats: { bestDraft: 0, totalInk: 0, time: 0, played: 0, words: 0, chars: 0, errors: 0, bestWpm: 0, bestStreak: 0, bestChain: 0, fame: 0, started: now, bought: 0, avgWpm: 0, avgAcc: 0 },
    best: Object.fromEntries(ERA_IDS.map((e) => [e, { wpm: 0, ink: 0 }])),
    last: null,
    flags: {},
    settings: { volume: 0.7, shake: true, notation: 'short', words: 1, calm: false, autoPause: true },
    lastSave: now,
  };
}

function newCycle(now = Date.now()) {
  return { drafts: 0, ink: 0, started: now, chal: null, bestDraft: 0 };
}

export const lvl = (s, id) => s.levels[id] || 0;
export const fl = (s, id) => s.fameLv[id] || 0;
export const eraUnlocked = (s, era) => era === 'scriptorium' || fl(s, `era_${era}`) > 0;
export const unlockedEras = (s) => ERA_IDS.filter((e) => eraUnlocked(s, e));
/** Each book is written in one era: you choose it before its first draft. */
export const canChangeEra = (s) => s.cycle.drafts === 0;
export function setEra(s, era) {
  if (!eraUnlocked(s, era) || !canChangeEra(s) || s.era === era) return false;
  s.era = era;
  return true;
}

// ── Generic tree logic (ink tree and fame tree share it) ───────────────────

function makeTree({ nodes, byId, getLv, setLv, wallet, pay, extraHidden, extraLocked, scale }) {
  const cost = (s, n) => Math.ceil(n.cost.b * n.cost.k ** getLv(s, n.id) * (scale ? scale(s) : 1));
  // upgrades bought in this tree (the free root doesn't count): the first upgrade of a branch waits for some (n.after)
  const bought = (s) => nodes.reduce((a, n) => a + (n.cost.b > 0 && getLv(s, n.id) > 0 ? 1 : 0), 0);
  const waiting = (s, n) => (n.after && getLv(s, n.id) === 0 ? Math.max(0, n.after - bought(s)) : 0);
  // the root is always there; any other upgrade shows once the one it hangs from is bought (and its branch is open)
  const visible = (s, n) => {
    if (extraHidden && extraHidden(s, n)) return false;
    if (getLv(s, n.id) > 0 || !n.req.length) return true;
    return n.req.some((r) => getLv(s, r) > 0) && !waiting(s, n);
  };
  const missing = (s, n) => {
    const m = (n.reqAll || []).filter((r) => getLv(s, r) < 1).map((r) => byId[r].name);
    const extra = extraLocked ? extraLocked(s, n) : null;
    return extra ? [...m, extra] : m;
  };
  const status = (s, n) => {
    if (!visible(s, n)) return 'hidden';
    if (getLv(s, n.id) >= n.max) return 'max';
    if (missing(s, n).length) return 'locked';
    return wallet(s) >= cost(s, n) ? 'buy' : 'poor';
  };
  const buy = (s, id) => {
    const n = byId[id];
    if (!n || status(s, n) !== 'buy') return false;
    pay(s, cost(s, n));
    setLv(s, id, getLv(s, id) + 1);
    s.stats.bought += 1;
    return true;
  };
  const affordable = (s) => nodes.filter((n) => status(s, n) === 'buy').length;
  const blocked = (s, n) => (extraHidden ? extraHidden(s, n) : false);
  return { nodes, byId, lvl: getLv, cost, visible, missing, status, buy, affordable, wallet, blocked, bought, waiting };
}

export const INK = makeTree({
  nodes: NODES,
  byId: NODE_BY_ID,
  getLv: lvl,
  setLv: (s, id, v) => { s.levels[id] = v; if (id.startsWith('master_')) s.flags[id] = true; },
  wallet: (s) => s.ink,
  pay: (s, c) => { s.ink -= c; },
  extraHidden: (s, n) => !!n.era && !eraUnlocked(s, n.era),
  scale: (s) => ERAS[s.era].price, // a book in a later era pays more for the same upgrade
});

export const FAME = makeTree({
  nodes: FAME_NODES,
  byId: FAME_BY_ID,
  getLv: fl,
  setLv: (s, id, v) => { s.fameLv[id] = v; const n = FAME_BY_ID[id]; if (n.eraUnlock && canChangeEra(s)) s.era = n.eraUnlock; },
  wallet: (s) => s.fame,
  pay: (s, c) => { s.fame -= c; },
  extraLocked: (s, n) => (n.needsFlag && !s.flags[n.needsFlag] ? 'the Future Masterwork once' : null),
});

// ── Stats of the next draft ────────────────────────────────────────────────

/** The effects of everything you own (ink tree for this era + fame tree), added up: × for MUL keys, + for the rest. */
export function effects(s, era = s.era) {
  const m = {};
  const add = (eff) => {
    for (const [k, v] of Object.entries(eff)) {
      if (typeof v === 'boolean') m[k] = m[k] || v;
      else if (MUL.has(k)) m[k] = (m[k] ?? 1) * v;
      else m[k] = (m[k] ?? 0) + v;
    }
  };
  for (const n of NODES) if (lvl(s, n.id) && (!n.era || n.allEras || n.era === era)) add(n.eff);
  for (const n of FAME_NODES) if (fl(s, n.id)) add(n.eff);
  return m;
}

export function computeStats(s, era = s.era, chal = s.cycle.chal) {
  const T = s.chal;
  const e = ERAS[era];
  const m = effects(s, era);
  const x = (k) => m[k] ?? 1; // a multiplier
  const p = (k) => m[k] ?? 0; // something that adds up
  return {
    era,
    eraValue: e.value,
    value: x('value') * 1.2 ** T.blackout,
    longLen: BASE.longLen,
    longMult: x('long') * 1.5 ** T.long,
    gold: BASE.gold + p('gold'),
    goldMult: BASE.goldMult,
    themeShare: BASE.themeShare + p('themeShare'),
    themeMult: BASE.themeMult * x('theme'),
    focus: BASE.focus + p('focus') + 2.5 * T.sprint,
    errCost: BASE.errCost * x('err'),
    refill: BASE.refill + p('refill'),
    refillCap: BASE.refillCap,
    streakRate: BASE.streakRate * x('rate'),
    streakCap: BASE.streakCap * x('cap') * (1 + 0.5 * T.perfect),
    streakStart: p('start'),
    steady: p('steady'),
    crossTime: BASE.crossTime / e.speed,
    words: BASE.words,
    illum: era === 'scriptorium' && !!m.illum,
    illumEvery: BASE.illumEvery / x('illumRate'),
    illumMult: BASE.illumMult * x('illumMult'),
    illumFocus: BASE.illumFocus + p('illumFocus'),
    line: era === 'typewriter',
    lineWords: BASE.lineWords + p('lineWords'),
    lineWindow: BASE.lineWindow + p('lineWindow'),
    lineBonus: BASE.lineBonus * x('lineBonus'),
    lineFocus: BASE.lineFocus + p('lineFocus'),
    punctMult: x('punct'),
    bugs: era === 'computer',
    bugEvery: BASE.bugEvery / x('bugRate'),
    bugMult: BASE.bugMult * x('bugMult'),
    bugFocus: p('bugFocus'),
    faint: era === 'future',
    faintTime: BASE.faintTime + p('faintTime'),
    faintMult: BASE.faintMult * x('faintMult'),
    faintClarity: p('clarity'),
    phraseMult: x('phrase'),
    chain: !!m.chain,
    chainWindow: BASE.chainWindow,
    chainStep: BASE.chainStep,
    chainCap: BASE.chainCap,
    zone: !!m.zone,
    zoneDrain: BASE.zoneDrain,
    zoneMult: BASE.zoneMult,
    splash: p('splash'),
    // challenge rules
    chal,
    perfect: chal === 'perfect',
    minLen: chal === 'long' ? 7 : 0,
    drainMult: (chal === 'sprint' ? 2 : 1) * x('drain'),
    blackout: chal === 'blackout',
  };
}

// ── After a draft ──────────────────────────────────────────────────────────

export function runWpm(run) {
  const mins = (run.t - (run.firstKeyT ?? run.t)) / 60;
  return mins > 2 / 60 ? run.chars / 5 / mins : 0;
}
export const runAcc = (run) => (run.chars + run.errors ? run.chars / (run.chars + run.errors) : 1);

/** Adds a finished draft to the save. Returns what changed (records, challenge done). */
export function applyDraft(s, run) {
  const ink = run.ink;
  const wpm = runWpm(run);
  const out = { ink, wpm, acc: runAcc(run), bestDraft: false, bestWpm: false, bestEraWpm: false, challenge: null };
  s.ink += ink;
  s.cycle.ink += ink;
  s.cycle.drafts += 1;
  s.drafts += 1;
  const st = s.stats;
  st.totalInk += ink;
  st.time += run.dur;
  st.words += run.caught;
  st.chars += run.chars;
  st.errors += run.errors;
  if (run.bestStreak > st.bestStreak) st.bestStreak = run.bestStreak;
  if (ink > st.bestDraft) { out.bestDraft = s.drafts > 1; st.bestDraft = ink; }
  const b = s.best[run.st.era];
  if (ink > b.ink) b.ink = ink;
  if (run.chars >= 25 && !run.tutorial) { // the guided first draft (with its pauses to read) doesn't count for speed
    if (wpm > b.wpm) { out.bestEraWpm = b.wpm > 0; b.wpm = wpm; }
    if (wpm > st.bestWpm) { out.bestWpm = st.bestWpm > 0; st.bestWpm = wpm; }
    // the player's typing profile, for the upgrade estimates (recent drafts weigh more)
    st.avgWpm = st.avgWpm ? st.avgWpm * 0.7 + wpm * 0.3 : wpm;
    st.avgAcc = st.avgAcc ? st.avgAcc * 0.7 + out.acc * 0.3 : out.acc;
  }
  if (run.bestChain > st.bestChain) st.bestChain = run.bestChain;
  if (ink > s.cycle.bestDraft) s.cycle.bestDraft = ink;
  out.challenge = checkChallenge(s);
  out.prev = s.last ? s.last.ink : 0;
  s.last = { ink, wpm, acc: out.acc, streak: run.bestStreak, caught: run.caught, dur: run.dur, era: run.st.era, draft: s.drafts, lines: run.lines, record: out.bestDraft || out.bestWpm };
  return out;
}

/** The editor buys the cheapest ink upgrades. */
export function editorBuy(s) {
  if (!effects(s).editor) return [];
  const bought = [];
  for (let i = 0; i < 200; i++) {
    const opts = NODES.filter((n) => INK.status(s, n) === 'buy').sort((a, b) => INK.cost(s, a) - INK.cost(s, b));
    if (!opts.length) break;
    INK.buy(s, opts[0].id);
    bought.push(opts[0].id);
  }
  return bought;
}

// ── Publishing (the reset) ─────────────────────────────────────────────────

export function fameMult(s) {
  const masters = MASTERS.filter((id) => lvl(s, id) > 0).length;
  return (1 + 0.5 * masters) * (effects(s).fame ?? 1) * 1.3 ** s.chal.blackout;
}

export function fameGain(s, ink = s.cycle.ink) {
  return Math.floor(Math.sqrt(Math.max(0, ink) / (FAME_K * ERAS[s.era].price)) * fameMult(s));
}

/** Ink this book needs for one more point of fame. */
export function nextFameAt(s) {
  const g = fameGain(s) + 1;
  return Math.ceil(FAME_K * ERAS[s.era].price * (g / fameMult(s)) ** 2 + 1);
}

/** The first book can only be published once it pays for the Typewriter. */
export function canPublish(s) {
  const g = fameGain(s);
  return g >= 1 && (s.publishes > 0 || s.fame + g >= FAME_BY_ID.era_typewriter.cost.b);
}

/** Ink a new book starts with (the biggest Advance you own). */
export const headStartInk = (s) => FAME_NODES.reduce((a, n) => (fl(s, n.id) && n.eff.startInk ? Math.max(a, n.eff.startInk) : a), 0);

function resetCycle(s, now = Date.now()) {
  s.levels = {};
  s.era = unlockedEras(s).at(-1); // each new book is written in the newest era you have opened
  s.ink = headStartInk(s);
  s.cycle = newCycle(now);
}

export function publish(s, now = Date.now()) {
  if (!canPublish(s)) return 0;
  const g = fameGain(s);
  s.fame += g;
  s.stats.fame += g;
  s.publishes += 1;
  resetCycle(s, now);
  return g;
}

// ── Challenges ─────────────────────────────────────────────────────────────

// the goal is in ink of the book's era (a later era pays more for everything, goals too)
export const challengeGoal = (s, id) => CHALLENGE_BY_ID[id].goal * ERAS[s.era].price * CHALLENGE_BY_ID[id].grow ** s.chal[id];
export const challengesOpen = (s) => fl(s, 'opus') > 0;

/** Starting a challenge publishes the current book (if it gives fame) and starts a new one under the rule. */
export function startChallenge(s, id, now = Date.now()) {
  if (!challengesOpen(s) || !CHALLENGE_BY_ID[id]) return 0;
  const g = publish(s, now);
  if (!g) resetCycle(s, now);
  s.cycle.chal = id;
  return g;
}

export function abandonChallenge(s) { s.cycle.chal = null; }

function checkChallenge(s) {
  const id = s.cycle.chal;
  if (!id || s.cycle.ink < challengeGoal(s, id)) return null;
  s.chal[id] += 1;
  s.cycle.chal = null;
  return { id, tier: s.chal[id] };
}

// ── Saving ─────────────────────────────────────────────────────────────────

const num = (x, d = 0) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : d);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

export function hydrate(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || raw.game !== GAME.id) throw new Error(`This doesn't look like a ${GAME.name} save.`);
  if (!(Number.isInteger(raw.v) && raw.v >= 1 && raw.v <= SAVE_VERSION)) throw new Error('This save is from another version of the game and cannot be loaded.');
  const s = newState(now);
  s.seed = Number.isInteger(raw.seed) ? raw.seed : s.seed;
  s.ink = num(raw.ink);
  s.fame = num(raw.fame);
  for (const [id, l] of Object.entries(obj(raw.fameLv))) if (FAME_BY_ID[id]) s.fameLv[id] = Math.min(FAME_BY_ID[id].max, Math.floor(num(l)));
  s.fameLv.pen = 1;
  s.era = ERAS[raw.era] && eraUnlocked(s, raw.era) ? raw.era : 'scriptorium';
  if (raw.v < SAVE_VERSION) {
    // upgrades that no longer exist are sold back at what they cost: before version 4 the whole ink tree of this book
    // (the new one starts empty), in version 4 only the helpers column; fame upgrades that are gone are sold back for fame
    const price = (table, id, l, scale = 1) => {
      const c = table[id];
      let t = 0;
      if (c) for (let i = 0; i < Math.floor(num(l)); i++) t += Math.ceil(c[0] * c[1] ** i * scale);
      return t;
    };
    let back = 0;
    for (const [id, l] of Object.entries(obj(raw.levels))) {
      if (raw.v >= 4 && NODE_BY_ID[id]) s.levels[id] = Math.min(NODE_BY_ID[id].max, Math.floor(num(l)));
      else back += price(OLD_COSTS[raw.v], id, l, ERAS[s.era].price);
    }
    // Loyal Helper's helper was free: don't pay it back (it was 'apprentice' before version 3)
    if (num(obj(raw.fameLv).loyal) > 0) back = Math.max(0, back - price(OLD_COSTS[raw.v], raw.v < 3 ? 'apprentice' : 'helper1', 1, ERAS[s.era].price));
    let fame = 0;
    for (const [id, l] of Object.entries(obj(raw.fameLv))) fame += price(OLD_COSTS.fame, id, l);
    s.ink += back;
    s.fame += fame;
    s.refund = { ink: back, fame }; // main.js tells the player once
  } else {
    for (const [id, l] of Object.entries(obj(raw.levels))) if (NODE_BY_ID[id]) s.levels[id] = Math.min(NODE_BY_ID[id].max, Math.floor(num(l)));
  }
  const c = obj(raw.cycle);
  s.cycle = { drafts: Math.floor(num(c.drafts)), ink: num(c.ink), started: num(c.started) || now, chal: CHALLENGE_BY_ID[c.chal] ? c.chal : null, bestDraft: num(c.bestDraft) };
  s.drafts = Math.floor(num(raw.drafts));
  s.publishes = Math.floor(num(raw.publishes));
  for (const k of Object.keys(s.chal)) s.chal[k] = Math.floor(num(obj(raw.chal)[k]));
  for (const k of Object.keys(s.stats)) if (k in obj(raw.stats)) s.stats[k] = num(raw.stats[k]);
  for (const e of ERA_IDS) { const b = obj(obj(raw.best)[e]); s.best[e] = { wpm: num(b.wpm), ink: num(b.ink) }; }
  s.last = raw.last && typeof raw.last === 'object' ? { ...raw.last } : null;
  s.flags = { ...obj(raw.flags) };
  s.settings = { ...s.settings, ...obj(raw.settings) };
  s.settings.volume = Math.min(1, num(s.settings.volume, 0.7));
  s.settings.words = Math.min(1.2, Math.max(0.85, num(s.settings.words, 1)));
  s.lastSave = num(raw.lastSave) || now;
  return s;
}
