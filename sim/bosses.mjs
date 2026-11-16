// Plays each era's boss with bot typists (the whole tree of that era bought, the trophies of the eras before it),
// many times, and prints how often each wins and how long it takes. Usage: node sim/bosses.mjs [eras] [wpms]
// → node sim/bosses.mjs scriptorium 35,55,80 · TRIES=40 · ERR=0.06 · MERCY=1 (0.7 = after three lost tries)
import { newState, computeStats } from '../src/game.js';
import { createBoss, stepBoss, botBossKeys, KINDS } from '../src/boss.js';
import { mulberry32 } from '../src/run.js';
import { ERA_IDS, ERA_NODES } from '../src/data.js';

const ERAS_ = (process.argv[2] || Object.keys(KINDS).join(',')).split(',');
const WPMS = String(process.argv[3] || '30,35,45,55,80').split(',').map(Number);
const TRIES = Number(process.env.TRIES || 40);
const ERR = Number(process.env.ERR || 0.06);
const MERCY = Number(process.env.MERCY || 1);

for (const era of ERAS_) {
  const s = newState(0);
  s.era = era;
  for (const n of ERA_NODES[era]) s.levels[n.id] = 1;
  for (const e of ERA_IDS.slice(0, ERA_IDS.indexOf(era))) s.trophies[e] = true;
  const st = computeStats(s);
  console.log(`\n── ${era} · resource ${st.focus.toFixed(0)} s, mistakes cost ${st.errCost.toFixed(2)} s`);
  for (const wpm of WPMS) {
    let wins = 0; let time = 0; let left = 0; let hpLeft = 0;
    for (let k = 0; k < TRIES; k++) {
      const b = createBoss(era, st, { seed: 100 + k, mercy: MERCY });
      const bot = { wpm, err: ERR, rng: mulberry32(k * 31 + wpm) };
      while (!b.ended && b.t < 600) { stepBoss(b, 1 / 60, botBossKeys(b, 1 / 60, bot)); b.events.length = 0; }
      if (b.won) { wins++; time += b.t; left += b.res / b.resMax; } else hpLeft += b.hp / b.hpMax;
    }
    const lost = TRIES - wins;
    console.log(`  ${String(wpm).padStart(3)} wpm: wins ${String(Math.round((wins / TRIES) * 100)).padStart(3)}%`
      + (wins ? ` · ${(time / wins).toFixed(0)} s · ${Math.round((left / wins) * 100)}% left` : '')
      + (lost ? ` · lost with ${Math.round((hpLeft / lost) * 100)}% of the book to go` : ''));
  }
}
