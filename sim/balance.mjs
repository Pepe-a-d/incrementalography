// A bot typist plays drafts and buys upgrades era by era, to measure the pace before touching prices.
// After the whole tree of an era is bought, the boss is taken as beaten after BOSS_S seconds (the real fights are
// measured in sim/bosses.mjs). Usage: npm run sim  (or node sim/balance.mjs <wpm list> → node sim/balance.mjs 35,55,80)
// SEEDS=2 seeds per typist; ERR=0.06 share of mistakes; EDITIONS=1 how many editions to play; VERBOSE=1 every buy.

import { newState, computeStats, applyDraft, treeOf, bookReady, winBoss, newEdition, runWpm } from '../src/game.js';
import { createRun, stepRun, botKeys, mulberry32 } from '../src/run.js';
import { ERAS } from '../src/data.js';
import { fmt, fmtTime } from '../src/format.js';

const WPMS = String(process.argv[2] || '35,55,80').split(',').map(Number);
const SEEDS = Number(process.env.SEEDS || 1);
const ERR = Number(process.env.ERR || 0.06);
const EDITIONS = Number(process.env.EDITIONS || 1);
const VERBOSE = !!process.env.VERBOSE;
const OVERHEAD = 6; // s between drafts (summary + upgrades)
const BOSS_S = Number(process.env.BOSS_S || 150); // s for the boss (intro, fight, ending)

function play(wpm, seed0) {
  const s = newState(0);
  const bot = { wpm, err: ERR, rng: mulberry32(seed0 * 7 + wpm) };
  let time = 0;
  let seed = seed0;
  const rows = [];
  for (let ed = 1; ed <= EDITIONS; ed++) {
    for (;;) {
      const era = s.era;
      const t0 = time;
      let drafts = 0;
      let maxGap = 0;
      let lastBuy = time;
      const buys = [];
      while (!bookReady(s) && time - t0 < 3 * 3600) {
        const run = createRun(computeStats(s), seed++);
        while (!run.ended) { stepRun(run, 1 / 60, botKeys(run, 1 / 60, bot)); run.events.length = 0; }
        applyDraft(s, run);
        drafts += 1;
        time += run.dur + OVERHEAD;
        const T = treeOf(s);
        for (;;) {
          const opts = T.nodes.filter((n) => T.status(s, n) === 'buy').sort((a, b) => T.cost(s, a) - T.cost(s, b));
          if (!opts.length) break;
          T.buy(s, opts[0].id);
          buys.push([time - t0, opts[0].id]);
          maxGap = Math.max(maxGap, time - lastBuy);
          lastBuy = time;
          if (VERBOSE) console.log(`   ${fmtTime(time - t0).padStart(8)} ${era} buys ${opts[0].id} · draft ${run.dur.toFixed(0)} s +${fmt(run.ink)} · ${Math.round(runWpm(run))} wpm`);
        }
      }
      time += BOSS_S;
      rows.push({ ed, era, min: (time - t0) / 60, drafts, gap: maxGap / 60, first: buys[0] ? buys[0][0] : 0 });
      const won = winBoss(s);
      if (!won.next) break;
    }
    if (ed < EDITIONS) newEdition(s, 0);
  }
  return { rows, time };
}

for (const wpm of WPMS) {
  for (let k = 0; k < SEEDS; k++) {
    const { rows, time } = play(wpm, 1000 * (k + 1));
    console.log(`\n── ${wpm} wpm · seed ${k + 1} · total ${fmtTime(time)}`);
    for (const r of rows) console.log(`  ed ${r.ed} ${ERAS[r.era].name.padEnd(12)} ${r.min.toFixed(1).padStart(5)} min · ${String(r.drafts).padStart(3)} drafts · first buy ${r.first.toFixed(0)} s · longest gap ${r.gap.toFixed(1)} min`);
  }
}
