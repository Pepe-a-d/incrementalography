// Smoke test without a browser: a bot types a whole draft in every era (with every mechanic on)
// and it is drawn on a fake canvas, on desktop and on a phone. Flags errors and broken numbers (NaN, Infinity).
// Usage: npm run humo

const bad = [];
const stats = { calls: 0 };

function fakeCtx(name) {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (k === 'measureText') return (s) => ({ width: String(s).length * 50 * (parseFloat(String(t.font).match(/(\d+(\.\d+)?)px/)?.[1] || 10) / 100) });
      return (...args) => {
        stats.calls++;
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}.${String(k)}(${args.join(', ')})`);
      };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function fakeCanvas(w, h) {
  const c = { width: w, height: h, style: {} };
  c.getContext = () => fakeCtx('canvas');
  c.getBoundingClientRect = () => ({ width: w, height: h, left: 0, top: 0 });
  return c;
}

globalThis.window = { devicePixelRatio: 2, innerWidth: 1280, innerHeight: 800, matchMedia: () => ({ matches: false }), addEventListener() {} };
globalThis.document = { createElement: () => fakeCanvas(300, 150) };

const { newState, computeStats } = await import('../src/game.js');
const { createRun, stepRun, botKeys, mulberry32 } = await import('../src/run.js');
const { FieldRenderer } = await import('../src/render.js');
const { ERA_IDS } = await import('../src/data.js');
const { fmt } = await import('../src/format.js');

function play(width, height, era) {
  const s = newState(0);
  // a good part of the tree bought, so all the mechanics show up
  for (const id of ['quill', 'ink1', 'illum', 'goldleaf', 'bell', 'touch', 'debugger', 'swarm', 'foresight', 'lucid', 'splash', 'chain', 'zone']) s.levels[id] = 1;
  s.fameLv.era_typewriter = s.fameLv.era_computer = s.fameLv.era_future = 1;
  s.era = era;
  const r = new FieldRenderer(fakeCanvas(width, height));
  const run = createRun(computeStats(s), 1234);
  r.setRun(run, era);
  r.hudTarget = () => ({ x: width / 2, y: 30 });
  const bot = { wpm: 60, err: 0.05, rng: mulberry32(7) };
  const dt = 1 / 60;
  let frames = 0;
  const seen = {};
  for (let after = 0; after < 60 && frames < 60 * 150; frames++) {
    stepRun(run, dt, botKeys(run, dt, bot));
    for (const e of run.events) {
      seen[e.type] = (seen[e.type] || 0) + 1;
      if (e.amount !== undefined) e.text_amount = fmt(e.amount, { decimals: 1 });
      r.onEvent(e, { shake: true });
    }
    run.events.length = 0;
    r.draw(dt, { shake: true });
    if (run.ended) after++;
  }
  if (!Number.isFinite(run.ink)) bad.push(`${era}: ink ${run.ink}`);
  return { era, s: run.t.toFixed(1), ended: run.ended, ink: fmt(run.ink), caught: run.caught, lines: run.lines, bugs: seen.bug || 0, errors: run.errors };
}

try {
  for (const era of ERA_IDS) console.log('desktop', play(1280, 800, era));
  for (const era of ERA_IDS) console.log('phone  ', play(375, 812, era));
} catch (e) {
  console.error('ERROR while drawing:', e);
  process.exit(1);
}
if (bad.length) {
  console.error(`${bad.length} calls with broken numbers, e.g.:`, bad.slice(0, 5));
  process.exit(1);
}
console.log(`OK: ${stats.calls} draw calls with no errors or NaN.`);
