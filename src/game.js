// Permanent progress: the era you are in, its tree, trophies, the boss of each era, editions, stats and saving. No DOM.

import { NODE_BY_ID, ERA_NODES, BASE, GAME, ERAS, ERA_IDS, MUL } from './data.js';

export const SAVE_VERSION = 6; // 6: eras with their own trees and bosses (no fame). Older saves move to their newest era.

export function newState(now = Date.now()) {
  return {
    game: GAME.id,
    v: SAVE_VERSION,
    seed: Math.floor(Math.random() * 2 ** 31),
    era: 'scriptorium',
    ink: 0,
    levels: {}, // the current era's tree (starts empty in every era)
    trophies: {}, // era → true once its boss is beaten (they stay for the rest of the game)
    edition: 1, // New Game+: each edition starts over in the Scriptorium, harder and with more ink
    cycle: newCycle(now),
    bosses: Object.fromEntries(ERA_IDS.map((e) => [e, { wins: 0, tries: 0, bestT: 0 }])),
    drafts: 0,
    stats: { bestDraft: 0, totalInk: 0, time: 0, played: 0, words: 0, chars: 0, errors: 0, bestWpm: 0, bestStreak: 0, bestChain: 0, started: now, bought: 0, avgWpm: 0, avgAcc: 0, bosses: 0, bossTries: 0 },
    best: Object.fromEntries(ERA_IDS.map((e) => [e, { wpm: 0, ink: 0 }])),
    last: null,
    flags: {},
    settings: { volume: 0.7, music: 0.6, shake: true, notation: 'short', words: 1, calm: false, autoPause: true },
    lastSave: now,
  };
}

/** What happens in one era: its drafts, the ink they made, and the tries at its boss since you came in. */
function newCycle(now = Date.now()) {
  return { drafts: 0, ink: 0, started: now, bestDraft: 0, bossTries: 0 };
}

export const lvl = (s, id) => s.levels[id] || 0;
export const eraIndex = (era) => ERA_IDS.indexOf(era);

// ── The era's tree ─────────────────────────────────────────────────────────

function makeTree(era) {
  const nodes = ERA_NODES[era];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const getLv = lvl;
  const cost = (s, n) => n.cost.b;
  const bought = (s) => nodes.reduce((a, n) => a + (getLv(s, n.id) > 0 ? 1 : 0), 0);
  // the first upgrade of a column waits for some upgrades (n.after)
  const waiting = (s, n) => (n.after && getLv(s, n.id) === 0 ? Math.max(0, n.after - bought(s)) : 0);
  // the root is always there; any other upgrade shows once the one it hangs from is bought (and its column is open)
  const visible = (s, n) => {
    if (getLv(s, n.id) > 0 || !n.req.length) return true;
    return n.req.some((r) => getLv(s, r) > 0) && !waiting(s, n);
  };
  const missing = () => [];
  const status = (s, n) => {
    if (s.era !== era || !visible(s, n)) return 'hidden';
    if (getLv(s, n.id) >= n.max) return 'max';
    return s.ink >= cost(s, n) ? 'buy' : 'poor';
  };
  const buy = (s, id) => {
    const n = byId[id];
    if (!n || status(s, n) !== 'buy') return false;
    s.ink -= cost(s, n);
    s.levels[id] = getLv(s, id) + 1;
    s.stats.bought += 1;
    return true;
  };
  const affordable = (s) => nodes.filter((n) => status(s, n) === 'buy').length;
  const blocked = () => false;
  const wallet = (s) => s.ink;
  return { era, nodes, byId, lvl: getLv, cost, visible, missing, status, buy, affordable, wallet, blocked, bought, waiting };
}

export const TREES = Object.fromEntries(ERA_IDS.map((e) => [e, makeTree(e)]));
export const treeOf = (s) => TREES[s.era];

/** Upgrades of this era you own. */
export const owned = (s, era = s.era) => ERA_NODES[era].filter((n) => lvl(s, n.id) > 0).length;
/** Every upgrade of the era is bought: its book (the boss) is ready. */
export const bookReady = (s) => owned(s) === ERA_NODES[s.era].length;

// ── Stats of the next draft ────────────────────────────────────────────────

/** The effects of what you own (this era's tree and every trophy), added up: × for MUL keys, + for the rest. */
export function effects(s, era = s.era) {
  const m = {};
  const add = (eff) => {
    for (const [k, v] of Object.entries(eff)) {
      if (typeof v === 'boolean') m[k] = m[k] || v;
      else if (MUL.has(k)) m[k] = (m[k] ?? 1) * v;
      else m[k] = (m[k] ?? 0) + v;
    }
  };
  for (const n of ERA_NODES[era]) if (lvl(s, n.id)) add(n.eff);
  for (const e of ERA_IDS) if (s.trophies[e]) add(ERAS[e].trophy.eff);
  return m;
}

/** Each edition after the first: ×2 ink (and words 10% faster and a letter longer, in computeStats). */
export const editionInk = (s) => 2 ** (s.edition - 1);

export function computeStats(s, era = s.era) {
  const e = ERAS[era];
  const m = effects(s, era);
  const x = (k) => m[k] ?? 1; // a multiplier
  const p = (k) => m[k] ?? 0; // something that adds up
  const ed = s.edition - 1;
  return {
    era,
    eraValue: e.value,
    value: x('value') * editionInk(s),
    longLen: e.longLen || BASE.longLen,
    longMult: x('long'),
    gold: BASE.gold * x('goldRate'),
    goldMult: BASE.goldMult * x('goldMult'),
    themeShare: BASE.themeShare,
    themeMult: BASE.themeMult * x('theme'),
    focus: BASE.focus + p('focus'),
    errCost: BASE.errCost * x('err'),
    refill: BASE.refill + p('refill'),
    refillCap: BASE.refillCap,
    streakRate: BASE.streakRate * x('rate'),
    streakCap: BASE.streakCap * x('cap'),
    streakStart: p('start'),
    steady: p('steady'),
    crossTime: BASE.crossTime / e.speed / x('speed') / 1.1 ** ed,
    words: BASE.words,
    illum: era === 'scriptorium' && !!m.illum,
    illumEvery: BASE.illumEvery / x('illumRate'),
    illumMult: BASE.illumMult * x('illumMult'),
    illumFocus: BASE.illumFocus,
    line: era === 'typewriter',
    lineWords: BASE.lineWords,
    lineWindow: BASE.lineWindow + p('lineWindow'),
    lineBonus: BASE.lineBonus * x('lineBonus'),
    lineFocus: BASE.lineFocus + p('lineFocus'),
    punctMult: x('punct'),
    page: era === 'typewriter' && !!m.page,
    pageEvery: BASE.pageEvery,
    pageTime: BASE.pageTime,
    pageMult: BASE.pageMult,
    carbon: p('carbon'),
    bugs: era === 'computer',
    bugEvery: BASE.bugEvery / x('bugRate'),
    bugMult: BASE.bugMult * x('bugMult'),
    bugFocus: p('bugFocus'),
    faint: era === 'future',
    faintTime: BASE.faintTime + p('faintTime'),
    faintMult: BASE.faintMult * x('faintMult'),
    phraseMult: x('phrase'),
    nova: !!m.nova,
    novaEvery: BASE.novaEvery,
    novaMult: BASE.novaMult,
    chain: !!m.chain,
    chainWindow: BASE.chainWindow,
    chainStep: BASE.chainStep,
    chainCap: BASE.chainCap,
    zone: !!m.zone,
    zoneDrain: BASE.zoneDrain,
    zoneMult: BASE.zoneMult,
    splash: p('splash'),
    // a later edition asks for longer words (from 5 letters in the second one)
    minLen: ed > 0 ? Math.min(7, 4 + ed) : 0,
    drainMult: x('drain'),
    perfect: false,
    blackout: false,
  };
}

// ── After a draft ──────────────────────────────────────────────────────────

export function runWpm(run) {
  const mins = (run.t - (run.firstKeyT ?? run.t)) / 60;
  return mins > 2 / 60 ? run.chars / 5 / mins : 0;
}
export const runAcc = (run) => (run.chars + run.errors ? run.chars / (run.chars + run.errors) : 1);

/** Adds a finished draft (or a boss fight: same typing stats, boss: true) to the save. Returns what changed (records). */
export function applyDraft(s, run, { boss = false } = {}) {
  const ink = run.ink;
  const wpm = runWpm(run);
  const out = { ink, wpm, acc: runAcc(run), bestDraft: false, bestWpm: false, bestEraWpm: false };
  s.ink += ink;
  s.cycle.ink += ink;
  if (!boss) { s.cycle.drafts += 1; s.drafts += 1; }
  const st = s.stats;
  st.totalInk += ink;
  st.time += run.dur;
  st.words += run.caught;
  st.chars += run.chars;
  st.errors += run.errors;
  if (run.bestStreak > st.bestStreak) st.bestStreak = run.bestStreak;
  if (!boss && ink > st.bestDraft) { out.bestDraft = s.drafts > 1; st.bestDraft = ink; }
  const b = s.best[run.st.era];
  if (!boss && ink > b.ink) b.ink = ink;
  if (run.chars >= 25 && !run.tutorial) { // the guided first draft (with its pauses to read) doesn't count for speed
    if (wpm > b.wpm) { out.bestEraWpm = b.wpm > 0; b.wpm = wpm; }
    if (wpm > st.bestWpm) { out.bestWpm = st.bestWpm > 0; st.bestWpm = wpm; }
    // the player's typing profile, for the upgrade estimates (recent drafts weigh more)
    st.avgWpm = st.avgWpm ? st.avgWpm * 0.7 + wpm * 0.3 : wpm;
    st.avgAcc = st.avgAcc ? st.avgAcc * 0.7 + out.acc * 0.3 : out.acc;
  }
  if (run.bestChain > st.bestChain) st.bestChain = run.bestChain;
  if (!boss && ink > s.cycle.bestDraft) s.cycle.bestDraft = ink;
  out.prev = s.last ? s.last.ink : 0;
  if (!boss) s.last = { ink, wpm, acc: out.acc, streak: run.bestStreak, caught: run.caught, dur: run.dur, era: run.st.era, draft: s.drafts, lines: run.lines, record: out.bestDraft || out.bestWpm };
  return out;
}

// ── Bosses, eras and editions ──────────────────────────────────────────────

/** Each lost try at this era's boss makes it 15% easier, down to 55% (the resource burns slower). */
export const bossMercy = (s) => 1 - 0.15 * Math.min(3, s.cycle.bossTries);
/** Later editions: bosses with 20% more to write per edition. */
export const bossScale = (s) => 1.2 ** (s.edition - 1);

function enterEra(s, era, now = Date.now()) {
  s.era = era;
  s.levels = {};
  s.ink = 0;
  s.cycle = newCycle(now);
}

/** The boss is beaten: its trophy stays forever, and you go on to the next era (or, after the last one, the end). */
export function winBoss(s, { time = 0 } = {}, now = Date.now()) {
  const era = s.era;
  const rec = s.bosses[era];
  rec.wins += 1;
  rec.tries += 1;
  if (time > 0 && (!rec.bestT || time < rec.bestT)) rec.bestT = time;
  s.stats.bosses += 1;
  s.stats.bossTries += 1;
  const first = !s.trophies[era];
  s.trophies[era] = true;
  const next = ERAS[era].next;
  if (next) enterEra(s, next, now);
  else s.flags.finished = true; // the ending; a new edition starts from there (newEdition)
  return { era, next, first, trophy: ERAS[era].trophy };
}

/** The boss won: the ink written during the fight is kept (applyDraft), and the next try is a little easier. */
export function loseBoss(s) {
  s.cycle.bossTries += 1;
  s.bosses[s.era].tries += 1;
  s.stats.bossTries += 1;
}

/** New Game+: back to the Scriptorium with every trophy, ×2 ink, and harder words and bosses. */
export function newEdition(s, now = Date.now()) {
  s.edition += 1;
  s.flags.finished = false;
  enterEra(s, 'scriptorium', now);
}

// ── Saving ─────────────────────────────────────────────────────────────────

const num = (x, d = 0) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : d);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

export function hydrate(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || raw.game !== GAME.id) throw new Error(`This doesn't look like a ${GAME.name} save.`);
  if (!(Number.isInteger(raw.v) && raw.v >= 1 && raw.v <= SAVE_VERSION)) throw new Error('This save is from another version of the game and cannot be loaded.');
  const s = newState(now);
  s.seed = Number.isInteger(raw.seed) ? raw.seed : s.seed;
  if (raw.v < 6) {
    // before the eras had their own trees and bosses (fame, publishing): you go on in the newest era you had opened,
    // with the trophies of the eras before it, an empty tree and no ink. Records and stats stay.
    const fameLv = obj(raw.fameLv);
    const opened = ERA_IDS.filter((e, i) => i === 0 || num(fameLv[`era_${e}`]) > 0);
    s.era = opened.at(-1);
    for (const e of ERA_IDS.slice(0, eraIndex(s.era))) s.trophies[e] = true;
    s.migrated = { era: s.era }; // main.js tells the player once
  } else {
    s.era = ERAS[raw.era] ? raw.era : 'scriptorium';
    s.ink = num(raw.ink);
    for (const [id, l] of Object.entries(obj(raw.levels))) if (NODE_BY_ID[id] && NODE_BY_ID[id].era === s.era) s.levels[id] = Math.min(1, Math.floor(num(l)));
    for (const e of ERA_IDS) if (obj(raw.trophies)[e]) s.trophies[e] = true;
    s.edition = Math.max(1, Math.floor(num(raw.edition, 1)));
    const c = obj(raw.cycle);
    s.cycle = { drafts: Math.floor(num(c.drafts)), ink: num(c.ink), started: num(c.started) || now, bestDraft: num(c.bestDraft), bossTries: Math.floor(num(c.bossTries)) };
    for (const e of ERA_IDS) {
      const b = obj(obj(raw.bosses)[e]);
      s.bosses[e] = { wins: Math.floor(num(b.wins)), tries: Math.floor(num(b.tries)), bestT: num(b.bestT) };
    }
  }
  s.drafts = Math.floor(num(raw.drafts));
  for (const k of Object.keys(s.stats)) if (k in obj(raw.stats)) s.stats[k] = num(raw.stats[k]);
  for (const e of ERA_IDS) { const b = obj(obj(raw.best)[e]); s.best[e] = { wpm: num(b.wpm), ink: num(b.ink) }; }
  s.last = raw.last && typeof raw.last === 'object' ? { ...raw.last } : null;
  s.flags = { ...obj(raw.flags) };
  s.settings = { ...s.settings, ...obj(raw.settings) };
  s.settings.volume = Math.min(1, num(s.settings.volume, 0.7));
  s.settings.music = Math.min(1, num(s.settings.music, 0.6));
  s.settings.words = Math.min(1.2, Math.max(0.85, num(s.settings.words, 1)));
  s.lastSave = num(raw.lastSave) || now;
  return s;
}
