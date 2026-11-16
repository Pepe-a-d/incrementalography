// A bot typist plays drafts, buys upgrades, publishes and opens eras, to measure the pace before touching prices.
// Usage: npm run sim  (or node sim/balance.mjs <max min> <wpm list> → node sim/balance.mjs 150 35,55,80)
// SNAP=600 how often to log; SEEDS=2 seeds per typist; ERR=0.06 share of mistakes.

import { newState, computeStats, applyDraft, INK, FAME, fameGain, publish, editorBuy, fl, runWpm, runAcc, canPublish, startChallenge, challengeGoal } from '../src/game.js';
import { createRun, stepRun, botKeys, mulberry32 } from '../src/run.js';
import { NODES, FAME_NODES, ERA_IDS, CHALLENGES } from '../src/data.js';
import { fmt, fmtTime } from '../src/format.js';

const MAX_MIN = Number(process.argv[2] || 150);
const WPMS = String(process.argv[3] || '35,55,80').split(',').map(Number);
const SEEDS = Number(process.env.SEEDS || 1);
const ERR = Number(process.env.ERR || 0.06);
const SNAP = Number(process.env.SNAP || 600);
const QUIET = !!process.env.QUIET;
const OVERHEAD = 6; // s between drafts (summary + upgrades)

function play(wpm, seed0) {
  const s = newState(0);
  const bot = { wpm, err: ERR, rng: mulberry32(seed0 * 7 + wpm) };
  let time = 0;
  let seed = seed0;
  let snap = SNAP;
  let lastBuy = 0;
  let maxGap = 0;
  let gapAt = 0;
  const log = [];
  const milestones = {};
  const note = (msg) => log.push([time, msg]);
  const durs = [];
  while (time < MAX_MIN * 60) {
    const run = createRun(computeStats(s), seed++);
    const dt = 1 / 60;
    while (!run.ended) {
      stepRun(run, dt, botKeys(run, dt, bot));
      run.events.length = 0;
    }
    const res = applyDraft(s, run);
    durs.push(run.dur);
    time += run.dur + OVERHEAD;
    const bought = editorBuy(s);
    for (;;) {
      const opts = NODES.filter((n) => INK.status(s, n) === 'buy').sort((a, b) => INK.cost(s, a) - INK.cost(s, b));
      if (!opts.length) break;
      INK.buy(s, opts[0].id);
      bought.push(opts[0].id);
    }
    if (bought.length) {
      if (time - lastBuy > maxGap) { maxGap = time - lastBuy; gapAt = time; }
      lastBuy = time;
      if (!milestones.firstBuy) { milestones.firstBuy = time; note(`first upgrade after draft ${s.drafts}: ${bought.join(', ')}`); }
      for (const id of bought) {
        if (id.startsWith('master_') && !milestones[id]) { milestones[id] = time; note(`${id}`); }
        if (id === 'illum' && !milestones.illum) { milestones.illum = time; note('illumination'); }
      }
    }
    if (s.drafts <= 4 && !QUIET) note(`draft ${s.drafts} (${s.era}): ${run.dur.toFixed(1)} s · ${Math.round(runWpm(run))} wpm · ${Math.round(runAcc(run) * 100)}% · +${fmt(res.ink)} · caught ${run.caught}${bought.length ? ` · buys ${bought.join(', ')}` : ''}`);

    // Publish when the book has slowed down and the fame is worth it
    const pending = fameGain(s);
    const next = FAME_NODES.find((n) => n.eraUnlock && !fl(s, n.id));
    const wantsEra = next && pending + s.fame >= FAME.cost(s, next);
    const stalled = time - lastBuy > 60;
    if (!process.env.NOPUB && canPublish(s) && (wantsEra || (stalled && pending >= Math.max(2, s.stats.fame * 0.8)) || time - lastBuy > 180)) {
      const era = s.era;
      const cycleMin = (time - (milestones.cycleStart || 0)) / 60;
      const g = publish(s, 0);
      time += 10;
      milestones.cycleStart = time;
      const fb = [];
      for (;;) {
        const nx = FAME_NODES.find((n) => n.eraUnlock && !fl(s, n.id));
        if (nx && FAME.status(s, nx) === 'buy') { FAME.buy(s, nx.id); fb.push(nx.id); continue; }
        if (FAME.status(s, FAME_NODES.find((n) => n.id === 'opus')) === 'buy') { FAME.buy(s, 'opus'); fb.push('opus'); continue; }
        const opts = FAME_NODES.filter((n) => FAME.status(s, n) === 'buy' && !n.eraUnlock && n.id !== 'opus').sort((a, b) => FAME.cost(s, a) - FAME.cost(s, b));
        if (!opts.length) break;
        // keep saving for the next era if it is close
        if (nx && s.fame - FAME.cost(s, opts[0]) < FAME.cost(s, nx) && s.fame >= FAME.cost(s, nx) * 0.6) break;
        FAME.buy(s, opts[0].id);
        fb.push(opts[0].id);
      }
      lastBuy = time;
      note(`PUBLISH #${s.publishes} in ${era} after ${cycleMin.toFixed(1)} min: +${g} fame (have ${s.fame})${fb.length ? ` · buys ${fb.join(', ')}` : ''} → ${s.era}`);
      if (fl(s, 'opus')) { note('MAGNUM OPUS'); playChallenges(s, bot, time, seed, note); break; }
    }
    if (time >= snap) {
      snap += SNAP;
      const lv = Object.values(s.levels).reduce((a, b) => a + b, 0);
      note(`· ${s.era} · ink ${fmt(s.ink)} · book ${fmt(s.cycle.ink)} · pending fame ${fameGain(s)} · fame ${s.fame} · levels ${lv} · draft ${run.dur.toFixed(0)} s +${fmt(res.ink)}`);
    }
  }
  const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
  note(`END ${fmtTime(time)} · drafts ${s.drafts} (avg ${avg.toFixed(1)} s, min ${Math.min(...durs).toFixed(1)}, max ${Math.max(...durs).toFixed(1)}) · longest gap without buying ${fmtTime(maxGap)} (at ${fmtTime(gapAt)})`);
  return log;
}

// After the Magnum Opus: challenges in turn (CHAL_MIN minutes), each until cleared or 25 min
function playChallenges(s, bot, time0, seed, note) {
  let time = time0;
  const end = time0 + Number(process.env.CHAL_MIN || 0) * 60;
  let k = 0;
  while (time < end) {
    const c = CHALLENGES[k++ % CHALLENGES.length];
    startChallenge(s, c.id, 0);
    spendFame(s);
    const goal = challengeGoal(s, c.id);
    const t0 = time;
    let cleared = false;
    const err = c.id === 'perfect' ? 0.02 : bot.err;
    while (time - t0 < 25 * 60 && !cleared) {
      const run = createRun(computeStats(s), seed++);
      const b = { ...bot, err };
      while (!run.ended) { stepRun(run, 1 / 60, botKeys(run, 1 / 60, b)); run.events.length = 0; }
      const res = applyDraft(s, run);
      time += run.dur + OVERHEAD;
      for (;;) {
        const opts = NODES.filter((n) => INK.status(s, n) === 'buy').sort((a, b2) => INK.cost(s, a) - INK.cost(s, b2));
        if (!opts.length) break;
        INK.buy(s, opts[0].id);
      }
      if (res.challenge) cleared = true;
    }
    note(`  ${c.id} tier ${s.chal[c.id] + (cleared ? 0 : 1)}: ${cleared ? 'cleared' : 'NOT cleared'} in ${((time - t0) / 60).toFixed(1)} min (goal ${fmt(goal)})`);
  }
}

function spendFame(s) {
  for (;;) {
    const opts = FAME_NODES.filter((n) => FAME.status(s, n) === 'buy').sort((a, b) => FAME.cost(s, a) - FAME.cost(s, b));
    if (!opts.length) break;
    FAME.buy(s, opts[0].id);
  }
}

for (const wpm of WPMS) {
  for (let k = 0; k < SEEDS; k++) {
    console.log(`\n── ${wpm} wpm · seed ${k + 1}`);
    for (const [t, msg] of play(wpm, 1000 * (k + 1))) console.log(`${fmtTime(t).padStart(12)}  ${msg}`);
  }
}
void ERA_IDS;
