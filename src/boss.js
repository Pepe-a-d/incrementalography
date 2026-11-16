// The book of each era: a boss fight with its own rules. No DOM and deterministic, like run.js (the simulator plays it).
// createBoss(era, st, { seed, mercy, scale }) → b · stepBoss(b, dt, keys) · b.events · botBossKeys(b, dt, bot).
// Every boss shares: your resource (b.res: the era's candle, ribbon, battery or signal, from the draft stats, so the
// tree you bought helps), the book's pages (b.hp: what is left to write), three phases that get harder, and the
// typing stats a draft has (chars, errors, ink…), so a fight counts like a draft for records.
// Each era adds its own rules in KINDS[era]: init, key, step, and a bot for the simulator.

import { mulberry32 } from './run.js';
import { makeWord, LEET } from './words.js';

const CHAR_REFILL = 0.18; // seconds of resource back per correct key
const UNIT_REFILL = 1.4; // and per finished verse, headline, piece or phrase

export function createBoss(era, st, { seed = 1, mercy = 1, scale = 1 } = {}) {
  const b = {
    era, st, rng: mulberry32(seed), t: 0, events: [], ended: false, won: false,
    res: st.focus, resMax: st.focus, drain: mercy, mercy, scale,
    hp: 0, hpMax: 0, phase: 1, refill: CHAR_REFILL, unitRefill: UNIT_REFILL,
    chars: 0, errors: 0, caught: 0, ink: 0, streak: 0, bestStreak: 0, bestChain: 0, firstKeyT: null, dur: 0, lines: 0,
  };
  KINDS[era].init(b);
  return b;
}

export function stepBoss(b, dt, keys = []) {
  if (b.ended) return;
  const K = KINDS[b.era];
  for (const k of keys) {
    if (b.ended) break;
    if (k.length === 1 && b.firstKeyT === null) b.firstKeyT = b.t;
    K.key(b, k);
  }
  if (b.ended) return;
  b.t += dt;
  // the resource only burns while there is something to write (not while you wait for the boss)
  if (!K.idle || !K.idle(b)) b.res -= dt * b.drain;
  K.step(b, dt);
  if (b.hp <= 0) end(b, true);
  else if (b.res <= 0) end(b, false);
}

export const botBossKeys = (b, dt, bot) => (b.ended ? [] : KINDS[b.era].bot(b, dt, bot));

// ── Shared pieces ──────────────────────────────────────────────────────────

function end(b, won) {
  if (b.ended) return;
  b.ended = true;
  b.won = won;
  b.res = Math.max(0, b.res);
  b.dur = b.t;
  b.events.push({ type: won ? 'win' : 'lose' });
}

function good(b) {
  b.chars += 1;
  b.streak += 1;
  if (b.streak > b.bestStreak) b.bestStreak = b.streak;
  b.res = Math.min(b.resMax, b.res + b.refill);
}

function bad(b, k, mult = 1) {
  b.errors += 1;
  b.streak = 0;
  b.res -= b.st.errCost * mult;
  b.events.push({ type: 'error', key: k });
}

/** A unit written (a verse…): a page of the book, some ink, some resource back, and maybe the next phase. */
function hit(b, text) {
  b.hp -= 1;
  b.caught += 1;
  const ink = text.replace(/ /g, '').length * b.st.eraValue * b.st.value * 2;
  b.ink += ink;
  b.res = Math.min(b.resMax, b.res + b.unitRefill);
  const phase = Math.min(3, 1 + Math.floor((b.hpMax - b.hp) / (b.hpMax / 3)));
  b.events.push({ type: 'hit', text, ink, hp: b.hp });
  if (phase !== b.phase && b.hp > 0) { b.phase = phase; b.events.push({ type: 'phase', phase }); KINDS[b.era].onPhase?.(b); }
}

const pick = (rng, list, used) => {
  const free = list.filter((x) => !used.has(x));
  const x = (free.length ? free : list)[Math.floor(rng() * (free.length ? free : list).length)];
  used.add(x);
  return x;
};

/** A bot that types a fixed text at its speed, with slips (the Codex and the Deadline). */
function botType(b, dt, bot, expected, { extraErr = 0 } = {}) {
  bot.wait = (bot.wait ?? 0.6) - dt;
  if (bot.wait > 0 || expected === null) return [];
  bot.wait = (60 / (bot.wpm * 5)) * (0.6 + 0.8 * bot.rng());
  if (bot.rng() < bot.err + extraErr) {
    const k = 'etaoinshrdlu'[Math.floor(bot.rng() * 12)];
    return [k === expected ? 'z' : k];
  }
  return [expected];
}

// ── The Abbot's Codex (Scriptorium) ───────────────────────────────────────
// The Abbot dictates verses, a word at a time; you copy them. The page is dark but for your candle, which burns down
// (and shrinks the light). Phase 2: each verse opens with an illuminated word that must be written without a slip
// (a slip starts the word over). Phase 3: the wind blows the candle and the verse goes dark now and then.

const VERSES = [
  ['the candle burns low tonight', 'ink is the blood of the book', 'copy each line with care', 'the abbot speaks and we write',
    'a quiet hand makes no blot', 'the bell calls the brothers', 'slow hands and patient eyes', 'one page and then another'],
  ['illuminated letters shine in gold', 'parchment remembers every mistake', 'the library keeps what the world forgets',
    'lapis blue for the evening sky', 'brothers copy psalms until dawn', 'every margin hides a little dragon'],
  ['the wind is cold and the flame is thin', 'write from memory when the light goes out', 'a book outlives the hand that wrote it',
    'darkness falls but the words remain', 'finish the codex before the candle dies', 'the last verse is always the hardest'],
];
const DICTATE_WPM = [44, 52, 60]; // how fast the Abbot speaks, per phase

const codex = {
  init(b) {
    b.hpMax = b.hp = Math.min(14, Math.round(9 * b.scale));
    b.used = new Set();
    b.gust = 0; // > 0: the verse is dark (phase 3)
    b.gustT = 3;
    nextVerse(b);
  },
  key(b, k) {
    if (k.length !== 1) return;
    const v = b.verse;
    if (v.typed >= v.shown) revealWord(v); // you caught up with the Abbot: he says the next word at once
    const want = v.text[v.typed];
    if (k === want) {
      v.typed += 1;
      good(b);
      b.events.push({ type: 'key', i: v.typed - 1 });
      if (v.typed >= v.text.length) {
        hit(b, v.text);
        if (b.hp > 0) nextVerse(b);
      }
    } else {
      const inIllum = v.illum && v.typed < v.illum;
      bad(b, k, inIllum ? 1.5 : 1);
      if (inIllum) { v.typed = 0; b.events.push({ type: 'restart' }); } // the illuminated word must be clean
    }
  },
  step(b, dt) {
    const v = b.verse;
    // the Abbot dictates: letters appear a word at a time, at his pace
    v.say += dt * (DICTATE_WPM[b.phase - 1] * 5) / 60;
    while (v.shown < v.text.length && v.say >= 1) {
      v.say -= 1;
      v.shown += 1;
      // a whole word at once: jump to the end of the word that just started
      if (v.text[v.shown - 1] !== ' ') { const sp = v.text.indexOf(' ', v.shown); const to = sp < 0 ? v.text.length : sp; v.say -= to - v.shown; v.shown = to; }
    }
    if (b.phase === 3) {
      if (b.gust > 0) { b.gust -= dt; if (b.gust <= 0) b.events.push({ type: 'calm' }); }
      b.gustT -= dt;
      if (b.gustT <= 0) {
        b.gust = 1.1 + b.rng() * 0.5;
        b.gustT = b.gust + 2.2 + b.rng() * 1.6;
        b.events.push({ type: 'gust' });
      }
    }
  },
  idle: (b) => b.verse.typed >= b.verse.shown,
  bot(b, dt, bot) {
    const v = b.verse;
    const expected = v.typed < v.shown ? v.text[v.typed] : null;
    return botType(b, dt, bot, expected, { extraErr: b.gust > 0 ? 0.03 : 0 });
  },
};

/** The Abbot says the next word (with the space before it). */
function revealWord(v) {
  if (v.shown >= v.text.length) return;
  const sp = v.text.indexOf(' ', v.shown + 1);
  v.shown = sp < 0 ? v.text.length : sp;
  v.say = 0;
}

function nextVerse(b) {
  const text = pick(b.rng, VERSES[b.phase - 1], b.used);
  const first = text.indexOf(' ');
  // the first word is dictated at once; phase 2 makes it an illuminated word
  b.verse = { text, typed: 0, shown: first < 0 ? text.length : first, say: 0, illum: b.phase === 2 ? first : 0 };
  b.events.push({ type: 'verse', text });
}

// ── The Deadline (Typewriter) ─────────────────────────────────────────────
// The front page, line by line, before the press starts (your ribbon is the clock to midnight). Each line ends with
// the bell: hit Enter in time or the carriage jams. Phase 2: the editor's red pencil strikes a word you wrote, and
// you type it again. Phase 3: the press drags the paper up: a line you don't finish in time is torn off and lost.

const NEWS = [
  ['MAYOR RESIGNS AT DAWN', 'RIVER FLOODS THE OLD TOWN', 'STRIKE ENDS AFTER TEN DAYS', 'NEW BRIDGE OPENS ON MONDAY',
    'FIRE AT THE PAPER MILL', 'LOCAL TEAM WINS THE CUP', 'SNOW CLOSES THE MOUNTAIN ROAD'],
  ['The council met at nine, and voted.', 'Witnesses say the lights went out.', 'Police have not named a suspect.',
    'The bakery will open again on Friday.', 'Readers wrote in all week to complain.', "Tickets are sold out; more are coming."],
  ['Stop the press! The vote was a tie.', 'Late news: the mayor changed his mind.', 'Our reporter was there when it happened.',
    'More on page two, if there is a page two.', 'Midnight. The presses roll. Good night.', 'Extra! Extra! Read all about it!'],
];
const PRESS_CPS = 3.4;
const DEADLINE_REFILL = 0.22; // phase 3: the paper waits this many letters a second, plus a little

const deadline = {
  init(b) {
    b.refill = DEADLINE_REFILL;
    b.hpMax = b.hp = Math.min(14, Math.round(9 * b.scale));
    b.used = new Set();
    b.page = []; // lines on the sheet, oldest first: { text, struck: [from, to] | null, torn }
    b.lines = 0;
    nextLine(b);
  },
  key(b, k) {
    const L = b.line;
    if (L.bell > 0) {
      if (k === 'Enter') { returnCarriage(b); return; }
      bad(b, k); // the line is done: only Enter now
      return;
    }
    if (k === 'Enter') { bad(b, k); return; }
    if (k.length !== 1) return;
    if (k === L.text[L.typed]) {
      L.typed += 1;
      good(b);
      b.events.push({ type: 'key', i: L.typed - 1 });
      if (L.typed >= L.text.length) { L.bell = b.st.lineWindow; b.events.push({ type: 'bell' }); }
    } else bad(b, k);
  },
  step(b, dt) {
    const L = b.line;
    if (L.bell > 0) {
      L.bell -= dt;
      if (L.bell <= 0) { b.res -= b.st.errCost * 2; b.events.push({ type: 'jam' }); returnCarriage(b, true); }
      return;
    }
    if (L.press > 0) {
      L.press -= dt;
      if (L.press <= 0) {
        // the press tore the unfinished line off: it is lost, and so is some ribbon
        b.page.push({ text: L.text.slice(0, L.typed), torn: true });
        b.res -= 2;
        b.events.push({ type: 'torn' });
        nextLine(b);
      }
    }
  },
  idle: () => false,
  bot(b, dt, bot) {
    const L = b.line;
    if (L.bell > 0) {
      if (bot.bellT === undefined) bot.bellT = 0.25 + bot.rng() * 0.45;
      bot.bellT -= dt;
      if (bot.bellT <= 0) { bot.bellT = undefined; bot.wait = 0.3; return ['Enter']; }
      return [];
    }
    return botType(b, dt, bot, L.text[L.typed] ?? null);
  },
};

function returnCarriage(b, jammed = false) {
  const L = b.line;
  b.lines += 1;
  if (L.fix) {
    // a correction typed: the struck word is fixed (it is not a new line of the page)
    b.events.push({ type: 'fixed' });
  } else {
    const entry = { text: L.text, struck: null };
    b.page.push(entry);
    hit(b, L.text);
    // phase 2: the editor's red pencil strikes a word you just wrote; you type it again
    if (b.phase === 2 && b.hp > 0 && b.rng() < 0.6) {
      const words = [...L.text.matchAll(/[A-Za-z']{4,}/g)];
      if (words.length) {
        const w = words[Math.floor(b.rng() * words.length)];
        entry.struck = [w.index, w.index + w[0].length];
        b.line = { text: w[0], typed: 0, bell: 0, press: 0, fix: true, jammed };
        b.events.push({ type: 'strike', word: w[0] });
        return;
      }
    }
  }
  if (b.hp > 0) nextLine(b);
}

function nextLine(b) {
  const text = pick(b.rng, NEWS[b.phase - 1], b.used);
  // phase 3: the press gives each line a little time, and less as the fight goes on (more with mercy)
  const press = b.phase === 3 ? (text.length / PRESS_CPS + 1.5) / b.mercy : 0;
  b.line = { text, typed: 0, bell: 0, press, pressMax: press, fix: false };
  b.events.push({ type: 'line', text });
}

// ── The Worm (Computer) ───────────────────────────────────────────────────
// A virus made of pieces of code snakes down the screen towards your files. Type a piece to break it off (its first
// character picks it, as in a draft). If its head reaches the files it eats one (battery lost) and comes in again
// from the top. Phase 2: it comes in two halves at once. Phase 3: its letters are corrupted (type them as you see them).

export const FW = 1000; // the field, in logical units (bossview.js scales it to the screen)
export const FH = 600;
const FILES_Y = 548;
const GAP = 46; // logical units between two pieces of a worm
const WORM_V = [34, 40, 48]; // how fast it comes down, per phase
const WORM_REFILL = 0.18;
export const FILE_NAMES = ['book.doc', 'notes.txt', 'thesis.pdf', 'photos', 'save.dat'];

const worm = {
  init(b) {
    b.refill = WORM_REFILL;
    b.unitRefill = 0.4;
    b.hpMax = b.hp = Math.min(44, Math.round(30 * b.scale));
    b.worms = [];
    b.files = FILE_NAMES.map(() => true);
    b.target = null;
    b.nextId = 1;
    b.toSpawn = b.hp;
    spawnWorms(b);
  },
  key(b, k) {
    if (k === 'Escape') { if (b.target) { b.target.typed = 0; b.target = null; } return; }
    if (k.length !== 1) return;
    let seg = b.target;
    if (!seg) {
      // the first character picks a piece: the one nearest your files
      const cands = alivePieces(b).filter((p) => p.text[0] === k && p.y > -10);
      if (!cands.length) { bad(b, k); return; }
      seg = cands.reduce((a, c) => (c.y > a.y ? c : a));
      b.target = seg;
      b.events.push({ type: 'lock', id: seg.id });
    }
    if (k === seg.text[seg.typed]) {
      seg.typed += 1;
      good(b);
      b.events.push({ type: 'key', id: seg.id });
      if (seg.typed >= seg.text.length) {
        seg.dead = true;
        b.target = null;
        b.events.push({ type: 'break', id: seg.id, x: seg.x, y: seg.y });
        hit(b, seg.text);
        for (const w of b.worms) w.pieces = w.pieces.filter((p) => !p.dead);
        b.worms = b.worms.filter((w) => w.pieces.length);
        if (!b.worms.length && b.hp > 0) spawnWorms(b);
      }
    } else bad(b, k);
  },
  step(b, dt) {
    const v = WORM_V[b.phase - 1] * b.mercy;
    for (const w of b.worms) {
      w.u += v * dt;
      placePieces(w);
      const front = w.pieces.reduce((a, p) => (p.y > a.y ? p : a));
      if (front.y >= FILES_Y) {
        // it reached your files: one is eaten (the nearest left), and the worm comes in again from the top
        let best = -1;
        let bd = Infinity;
        b.files.forEach((alive, i) => { const d = Math.abs(fileX(i) - front.x); if (alive && d < bd) { bd = d; best = i; } });
        if (best >= 0) b.files[best] = false;
        else b.files = b.files.map(() => true); // backups restored: there is always something to eat
        b.res -= 5;
        b.events.push({ type: 'eat', file: best, x: front.x });
        w.u = -front.off * GAP + 40; // the front piece starts again just under the top
        placePieces(w);
      }
    }
  },
  idle: () => false,
  /** Phase 2: every worm splits in two, and the halves go their own ways. Phase 3: what is left gets corrupted. */
  onPhase(b) {
    if (b.phase === 2) {
      const out = [];
      for (const w of b.worms) {
        const alive = [...w.pieces].sort((a, c) => a.off - c.off);
        if (alive.length < 2) { out.push(w); continue; }
        const half = Math.ceil(alive.length / 2);
        const front = alive.slice(0, half);
        const back = alive.slice(half);
        front.forEach((p, i) => { p.off = i; });
        back.forEach((p, i) => { p.off = i; });
        const w1 = { ...w, pieces: front, x0: FW * 0.3 };
        const w2 = { ...w, id: b.nextId++, pieces: back, u: w.u - half * GAP, x0: FW * 0.7, ph: w.ph + 2 };
        placePieces(w1);
        placePieces(w2);
        out.push(w1, w2);
      }
      b.worms = out;
      b.events.push({ type: 'split' });
    } else if (b.phase === 3) {
      for (const p of alivePieces(b)) if (p.typed === 0 && b.target !== p) p.text = corrupt(p.text, b.rng);
    }
  },
  bot(b, dt, bot) {
    bot.wait = (bot.wait ?? 0.6) - dt;
    if (bot.wait > 0) return [];
    let seg = b.target;
    if (!seg) {
      const cands = alivePieces(b).filter((p) => p.y > 20);
      if (!cands.length) { bot.wait = 0.15; return []; }
      seg = cands.reduce((a, c) => (c.y > a.y ? c : a));
      if (!bot.thinking) { bot.thinking = true; bot.wait = 0.3 * Math.sqrt(50 / bot.wpm); return []; }
    }
    bot.thinking = false;
    bot.wait = (60 / (bot.wpm * 5)) * (0.6 + 0.8 * bot.rng());
    const want = seg.text[seg.typed];
    return [bot.rng() < bot.err ? (want === 'z' ? 'q' : 'z') : want];
  },
};

export const fileX = (i) => FW * (0.12 + 0.19 * i);
const alivePieces = (b) => b.worms.flatMap((w) => w.pieces);

/** Where each piece is: along a wave that comes down the screen (off: its place behind the front of the worm). */
function placePieces(w) {
  for (const p of w.pieces) {
    const u = w.u - p.off * GAP;
    p.y = u;
    p.x = w.x0 + w.amp * Math.sin(u / w.lambda + w.ph);
  }
}

function spawnWorms(b) {
  const n = b.phase === 1 ? 1 : 2;
  const per = Math.max(1, Math.min(b.toSpawn, b.phase === 1 ? 9 : 5));
  const avoid = new Set();
  for (let k = 0; k < n && b.toSpawn > 0; k++) {
    const len = Math.min(per, b.toSpawn);
    b.toSpawn -= len;
    const w = { id: b.nextId++, u: 30 - k * 120, x0: FW * (n === 1 ? 0.5 : 0.3 + 0.4 * k) + (b.rng() - 0.5) * 80, amp: 180 + b.rng() * 120, lambda: 60 + b.rng() * 30, ph: b.rng() * 6, pieces: [] };
    for (let i = 0; i < len; i++) {
      let { text } = makeWord('computer', b.rng, avoid);
      if (b.phase === 3) text = corrupt(text, b.rng);
      avoid.add(text[0]);
      w.pieces.push({ id: b.nextId++, text, typed: 0, off: i, x: 0, y: 0 });
    }
    placePieces(w);
    b.worms.push(w);
  }
  b.events.push({ type: 'worm', n });
}

/** Phase 3: one or two letters of a piece turn into look-alike symbols. */
function corrupt(text, rng) {
  const spots = [...text].map((c, i) => (i > 0 && LEET[c] ? i : -1)).filter((i) => i >= 0);
  let t = text;
  for (let k = 0; k < Math.min(2, spots.length); k++) {
    const i = spots.splice(Math.floor(rng() * spots.length), 1)[0];
    t = t.slice(0, i) + LEET[t[i]] + t.slice(i + 1);
  }
  return t;
}

// ── The Echo (Future) ─────────────────────────────────────────────────────
// A machine writes the same phrase as you, with its own cursor. Finish first and the phrase is yours (a page of the
// book); if the Echo finishes first, the phrase is lost and so is some signal. It gets faster each phase.
// Phase 2: the words you haven't reached yet are scrambled until you get to them. Phase 3: a phrase shows for a
// moment and then vanishes; only what you have typed stays.

const ECHO_WPM = [44, 52, 60]; // how fast the Echo writes, per phase (slower after lost tries: mercy)
const ECHO_REFILL = 0.18;
export const ECHO_SHOW = 1.3; // phase 3: seconds a phrase stays visible

const echo = {
  init(b) {
    b.refill = ECHO_REFILL;
    b.hpMax = b.hp = Math.min(14, Math.round(9 * b.scale));
    b.echoWins = 0;
    b.used = new Set();
    nextPhrase(b);
  },
  key(b, k) {
    if (k.length !== 1) return;
    const P = b.phrase;
    if (k === P.text[P.typed]) {
      P.typed += 1;
      good(b);
      b.events.push({ type: 'key', i: P.typed - 1 });
      if (P.typed >= P.text.length) {
        hit(b, P.text);
        if (b.hp > 0) nextPhrase(b);
      }
    } else bad(b, k);
  },
  step(b, dt) {
    const P = b.phrase;
    P.t += dt;
    if (P.t > P.delay) {
      P.echo += dt * (ECHO_WPM[b.phase - 1] * 5 / 60) * b.mercy * (0.9 + 0.2 * Math.sin(P.t * 2.3));
      if (P.echo >= P.text.length) {
        // the Echo got there first: the phrase is its, and your signal pays
        b.echoWins += 1;
        b.res -= 3;
        b.events.push({ type: 'echo', text: P.text });
        nextPhrase(b);
      }
    }
  },
  idle: () => false,
  bot(b, dt, bot) {
    const P = b.phrase;
    // phase 2: the next word only makes sense once you reach it (a moment to read it)
    if (b.phase === 2 && (P.typed === 0 || P.text[P.typed - 1] === ' ') && bot.readAt !== `${P.text}|${P.typed}`) { bot.readAt = `${P.text}|${P.typed}`; bot.wait = 0.25; }
    return botType(b, dt, bot, P.text[P.typed] ?? null, { extraErr: b.phase === 3 && P.t > ECHO_SHOW ? 0.03 : 0 });
  },
};

function nextPhrase(b) {
  let text = '';
  while (text.length < 22) text = `${text}${text ? ' ' : ''}${makeWord('future', b.rng).text}`;
  if (b.used.has(text)) text = `${text} ${Math.floor(b.rng() * 90 + 10)}`;
  b.used.add(text);
  // the words scrambled in phase 2 (each keeps its first letter, so the shape is almost right)
  // (only the letters inside a word move: its first and last characters, and any punctuation, stay put)
  const scrambled = text.split(' ').map((w) => {
    const m = w.match(/^(.)([A-Za-z]{2,})(.*)$/);
    if (!m || m[2].length < 3) return w;
    const mid = [...m[2].slice(0, -1)];
    for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(b.rng() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
    return m[1] + mid.join('') + m[2].slice(-1) + m[3];
  }).join(' ');
  b.phrase = { text, scrambled, typed: 0, echo: 0, t: 0, delay: 0.7 };
  b.events.push({ type: 'phrase', text });
}

export const KINDS = { scriptorium: codex, typewriter: deadline, computer: worm, future: echo };
