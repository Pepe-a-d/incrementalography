// Works out each era's prices from the pace we want: plays drafts with a bot (55 WPM by default) owning the first i
// upgrades, measures the ink per second (with the time between drafts), and prices upgrade i+1 so that saving for it
// takes GAPS[i] minutes. Prints the ladders to paste into data.js. Usage: node sim/ladder.mjs [wpm]
import { newState, computeStats, winBoss } from '../src/game.js';
import { createRun, stepRun, botKeys, mulberry32 } from '../src/run.js';
import { ERA_IDS, ERA_NODES, ERAS } from '../src/data.js';

const WPM = Number(process.argv[2] || 55);
const GAPS = [0.35, 0.7, 1.0, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.2]; // minutes of saving before each upgrade
const OVERHEAD = 6;
const DRAFTS = 10;

function rate(s) {
  let ink = 0;
  let t = 0;
  for (let k = 0; k < DRAFTS; k++) {
    const run = createRun(computeStats(s), 500 + k * 13);
    const bot = { wpm: WPM, err: 0.06, rng: mulberry32(k * 7 + WPM) };
    while (!run.ended) { stepRun(run, 1 / 60, botKeys(run, 1 / 60, bot)); run.events.length = 0; }
    ink += run.ink;
    t += run.dur + OVERHEAD;
  }
  return ink / t;
}

// the order upgrades are meant to be bought in: root, then the three columns interleaved (see data.js)
const ORDER = [[0, 0], [1, 0], [2, 0], [1, 1], [3, 0], [2, 1], [1, 2], [3, 1], [2, 2], [3, 2]];
const nice = (x) => { const p = 10 ** Math.floor(Math.log10(x)); const m = x / p; return Math.round((m < 2 ? Math.round(m * 10) / 10 : m < 5 ? Math.round(m * 4) / 4 : Math.round(m * 2) / 2) * p); };

const s = newState(0);
for (const era of ERA_IDS) {
  s.era = era;
  s.levels = {};
  const nodes = ERA_NODES[era];
  const cols = ERAS[era].columns;
  const pick = ([c, r]) => (c === 0 ? nodes.find((n) => !n.req.length) : nodes.filter((n) => n.branch === cols[c - 1])[r]);
  const ladder = [];
  const start = rate(s);
  for (let i = 0; i < ORDER.length; i++) {
    const r = rate(s);
    ladder.push(nice(r * GAPS[i] * 60));
    s.levels[pick(ORDER[i]).id] = 1;
  }
  console.log(`  ${era}: [${ladder.join(', ')}],  // ${Math.round(start)}/s at the start, ${Math.round(rate(s))}/s at the end`);
  winBoss(s);
}
