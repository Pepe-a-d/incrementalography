// Start-up and loop: upgrades ⇄ draft ⇄ summary, the book of each era (its boss), the next era, and editions.

import './fonts.js';
import './style.css';
import {
  newState, computeStats, applyDraft, hydrate, TREES, treeOf, owned, bookReady, winBoss, loseBoss, newEdition,
  runWpm, runAcc, lvl, bossMercy, bossScale,
} from './game.js';
import { createBoss, stepBoss, botBossKeys } from './boss.js';
import { BossView } from './bossview.js';
import { music } from './music.js';
import { Advisor, fmtGain } from './advisor.js';
import { themeWords } from './words.js';
import { DraftTutorial, EraTutorial } from './tutorial.js';
import { icon } from './icons.js';
import { InkEnding } from './inkend.js';
import { createRun, stepRun, streakBonus, finishRun, botKeys, mulberry32 } from './run.js';
import { FieldRenderer } from './render.js';
import { TreeView } from './treeview.js';
import { toast, modal, modalOpen, settingsDialog, setText } from './ui.js';
import { sfx, setVolume, setMusicVolume } from './audio.js';
import { fmt, fmtTime, setNotation } from './format.js';
import { GAME, ERAS, ERA_IDS, ERA_NODES, NODE_BY_ID, COLUMNS } from './data.js';

const SAVE_KEY = `${GAME.id}:save`;
const $ = (s) => document.querySelector(s);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n) => ROMAN[n] || String(n);
// streak names: a callout the first time a draft reaches each one
const STREAKS = [[25, 'Steady'], [50, 'Fluent'], [100, 'Unstoppable'], [200, 'Legendary'], [400, 'Mythic']];

const G = {
  state: null,
  screen: 'tree',
  run: null,
  keys: [],
  frozen: false, // don't save (tests, import, delete)
  paused: false, // tests: the draft doesn't move, it only draws
  bot: null, // tests: a bot types for you (game.debug.bot(55))
  save,
  exportCode,
  importCode,
  hardReset,
  sfx,
  refresh: () => refreshTree(),
  advisor: new Advisor(),
  hitstop: 0, // seconds the draft freezes on a big catch (hit-stop)
  buyStep: 0, // buys in a row climb the scale
  lastBuy: 0,
  applySettings() {
    const st = G.state.settings;
    setVolume(st.volume);
    setMusicVolume(st.music);
    setNotation(st.notation);
    if (G.renderer && G.renderer.wordScale !== st.words) { G.renderer.wordScale = st.words; G.renderer.measure(); }
  },
  away: false, // the draft waits because you left the window (Settings → pause when you leave)
};
window.game = G;

// ── Saving ─────────────────────────────────────────────────────────────────

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return hydrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not load the save:', e.message);
    // keep the unreadable save aside, so a new game never wipes it
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) localStorage.setItem(`${SAVE_KEY}:unreadable`, raw); } catch { /* nothing */ }
  }
  return null;
}

function save() {
  if (G.frozen || !G.state) return false;
  G.state.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); return true; } catch { return false; }
}

function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(G.state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function importCode(code) {
  const text = String(code || '').trim();
  if (!text) throw new Error('Paste a code first.');
  let data;
  try {
    data = JSON.parse(text.startsWith('{') ? text : new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s+/g, '')), (c) => c.charCodeAt(0))));
  } catch {
    throw new Error("That code can't be read. Did you copy all of it?");
  }
  const s = hydrate(data);
  G.frozen = true;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  location.reload();
}

function hardReset() {
  G.frozen = true;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing */ }
  location.reload();
}

// ── Era look ───────────────────────────────────────────────────────────────

function applyTheme(era) {
  const e = ERAS[era];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(e.theme)) root.style.setProperty(`--${k}`, v);
  // the page the words cross (in the Typewriter, a sheet of paper on the dark desk)
  for (const [k, v] of Object.entries(e.page || e.theme)) root.style.setProperty(`--page-${k}`, v);
  root.style.setProperty('--era-font', e.font);
  root.style.setProperty('--ui', e.ui);
  root.dataset.ui = e.mode;
  root.dataset.era = era;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', e.theme.bg);
}

// ── Upgrades screen ────────────────────────────────────────────────────────

const chipHTML = (ic, value) => `${icon(ic)}${value}`;
const DROP = () => icon('droplet');

function renderChip(elm, icon, value) {
  const v = fmt(value);
  if (elm._v !== v) {
    if (elm._v !== undefined) { elm.classList.remove('pop'); void elm.offsetWidth; elm.classList.add('pop'); }
    elm._v = v;
    elm.innerHTML = chipHTML(icon, v);
  }
}

/** The tree of the era you are in (a new one when the era changes). */
function ensureTree() {
  const s = G.state;
  if (G.inkTree && G.treeEra === s.era) return;
  G.inkTree?.destroy();
  const box = $('#tree-ink');
  box.innerHTML = '';
  G.treeEra = s.era;
  G.inkTree = new TreeView(box, { tree: TREES[s.era], currency: 'ink', columns: ERAS[s.era].columns, onBuy: onBuyInk, advisor: G.advisor, book: { era: s.era, onClick: startBoss } });
}

function refreshTree() {
  const s = G.state;
  renderChip($('#w-ink'), 'droplet', s.ink);
  ensureTree();
  G.advisor.request(s);
  G.inkTree.update(s);
  const e = ERAS[s.era];
  const ek = `${s.era}|${s.edition}|${Object.keys(s.trophies).join()}`;
  const label = $('#era-name');
  if (label._k !== ek) {
    label._k = ek;
    label.innerHTML = `<b>${e.name.toLowerCase()}</b>${s.edition > 1 ? ` · edition ${roman(s.edition)}` : ''}`
      + `<span class="trophies">${ERA_IDS.filter((x) => s.trophies[x]).map((x) => `<span class="trophy" title="${ERAS[x].trophy.name}: ${ERAS[x].trophy.short}">${icon(ERAS[x].trophy.icon)}</span>`).join('')}</span>`;
  }
  // the goal, always in sight: every upgrade of the era, then its book
  const ready = bookReady(s);
  const total = ERA_NODES[s.era].length;
  const hint = $('#pub-hint');
  hint.innerHTML = ready ? `<b>${e.boss.name}</b> · ${e.boss.rule}`
    : `${owned(s)}/${total} upgrades<span class="pub-bar"><i style="width:${((owned(s) / total) * 100).toFixed(0)}%"></i></span>then the book: <b>${e.boss.name}</b>`;
  const start = $('#start');
  const sk = ready ? `book|${s.era}` : 'draft';
  if (start._k !== sk) {
    start._k = sk;
    start.innerHTML = ready ? `${icon(e.boss.icon)}write the book` : `${icon('file-plus')}new draft`;
    start.classList.toggle('book', ready);
  }
  tutorialTree();
}

function buyPitch() {
  const now = performance.now();
  G.buyStep = now - G.lastBuy < 1300 ? G.buyStep + 1 : 0;
  G.lastBuy = now;
  return G.buyStep;
}

/** A column whose first upgrade was waiting (after: N upgrades) just opened: say so. */
function newBranches(s, before) {
  const T = treeOf(s);
  for (const n of T.nodes) {
    if (n.after && !before.has(n.id) && T.visible(s, n)) {
      toast(`a new column opens: ${COLUMNS[n.branch].name}`);
      sfx.milestone();
    }
  }
}
const shownNow = (s) => new Set(treeOf(s).nodes.filter((n) => treeOf(s).visible(s, n)).map((n) => n.id));

function onBuyInk(id) {
  const s = G.state;
  const node = NODE_BY_ID[id];
  const adv = G.advisor.get(id);
  const before = shownNow(s);
  if (treeOf(s).buy(s, id)) {
    if (!s.flags.tutDone) s.flags.tutBought = true;
    const big = !!node.news;
    const text = adv && !adv.text && adv.gain >= 0.005 ? `${fmtGain(adv.gain)} ink per draft` : node.short;
    G.inkTree.flash(id, true, text, big);
    if (big) sfx.keystone();
    else sfx.buy(buyPitch());
    refreshTree();
    save();
    if (node.news) toast(node.news);
    newBranches(s, before);
    if (bookReady(s)) {
      setTimeout(() => { sfx.keystone(); G.inkTree.flashBook(); toast(`every upgrade is yours: the book is ready. ${ERAS[s.era].boss.name} awaits`); }, 450);
    }
  } else {
    sfx.deny();
    G.inkTree.flash(id, false);
  }
}

// ── The book of the era (its boss) ─────────────────────────────────────────

/** A full-screen card (the boss's name and rule, the trophy, the next era). Space goes on, Esc goes back if allowed. */
function scene(html, { cls = '', go, back = null } = {}) {
  const box = $('#scene');
  box.className = `scene ${cls}`;
  box.innerHTML = `<div class="scene-card box">${html}</div>`;
  box.hidden = false;
  G.sceneKeys = (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) closeScene(go); }
    else if (e.key === 'Escape' && back) { e.preventDefault(); closeScene(back); }
  };
  box.querySelector('[data-go]')?.addEventListener('click', () => closeScene(go));
  box.querySelector('[data-back]')?.addEventListener('click', () => closeScene(back));
}

function closeScene(then) {
  const box = $('#scene');
  if (box.hidden) return;
  box.hidden = true;
  box.innerHTML = '';
  G.sceneKeys = null;
  then?.();
}

/** The book's door: its name, its rule, and space to begin. */
function startBoss() {
  const s = G.state;
  if (!bookReady(s) || modalOpen() || !$('#scene').hidden) return;
  const b = ERAS[s.era].boss;
  const tries = s.cycle.bossTries;
  s.flags.tutBook = true;
  setTutTarget(null);
  sfx.keystone();
  scene(`<span class="scene-k">the book of the ${ERAS[s.era].name.toLowerCase()}</span>
    <h1>${icon(b.icon)}${b.name}</h1>
    <p class="lead">${b.rule}</p>
    ${tries ? `<p class="muted">try ${tries + 1} · it gets a little easier each time</p>` : ''}
    <div class="scene-acts"><button type="button" class="btn" data-back>not yet · esc</button><button type="button" class="btn primary big" data-go>begin · space</button></div>`,
  { cls: 'boss-door', go: fightBoss, back: () => {} });
}

/** The fight: the era's book, with its own rules (boss.js), scene (bossview.js) and music (music.js). */
function fightBoss() {
  const s = G.state;
  const st = computeStats(s);
  G.boss = createBoss(s.era, st, { seed: (s.seed + s.stats.bossTries * 7907 + 11) >>> 0, mercy: bossMercy(s), scale: bossScale(s) });
  G.bossT = 0;
  G.bossDone = false;
  G.keys = [];
  G.away = false;
  $('#away').hidden = true;
  applyTheme(s.era);
  show('boss');
  $('#screen-boss').classList.add('typing');
  G.bossView.set(G.boss);
  $('#boss-name').textContent = ERAS[s.era].boss.name;
  $('#boss-pages').innerHTML = Array.from({ length: G.boss.hpMax }, () => '<i class="pg"></i>').join('');
  bossBanner(ERAS[s.era].boss.name, ERAS[s.era].boss.phases[0]);
  // the first try at a book: how it works, until the first page is written
  const tip = $('#boss-tip');
  tip.textContent = ERAS[s.era].boss.tip;
  tip.hidden = s.bosses[s.era].tries > 0;
  paintBossHud();
  music.play(s.era, 1);
}

function bossBanner(title, sub) {
  const el = $('#boss-banner');
  el.hidden = false;
  el.innerHTML = `<b></b><span></span>`;
  el.querySelector('b').textContent = title;
  el.querySelector('span').textContent = sub;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
}

function paintBossHud() {
  const b = G.boss;
  const s = G.state;
  const done = b.hpMax - b.hp;
  const pages = $('#boss-pages').children;
  for (let i = 0; i < pages.length; i++) {
    const on = i < done;
    if (pages[i].classList.contains('on') !== on) { pages[i].classList.toggle('on', on); if (on) pages[i].classList.add('hit'); }
  }
  setText($('#boss-phase'), ERAS[s.era].boss.phases[b.phase - 1]);
  const f = Math.max(0, b.res / b.resMax);
  const fill = $('#boss-res');
  const fk = f.toFixed(3);
  if (fill._f !== fk) { fill._f = fk; fill.style.transform = `scaleX(${fk})`; fill.parentElement.style.setProperty('--f', fk); fill.parentElement.classList.toggle('low', f < 0.25); }
  setText($('#boss-res-label'), `${ERAS[s.era].resource} ${Math.ceil(Math.max(0, b.res))} s`);
  setText($('#boss-wpm'), `${Math.round(runWpm(b))} wpm · ${Math.round(runAcc(b) * 100)}%`);
}

function bossEvents(b) {
  const s = G.state;
  for (const e of b.events) {
    G.bossView.onEvent(e, s.settings);
    switch (e.type) {
      case 'key': sfx.key(s.era); break;
      case 'error': sfx.error(); break;
      case 'restart': sfx.deny(); break;
      case 'hit': if (s.era === 'typewriter') sfx.ret(); else if (s.era !== 'computer') sfx.gold(); if (b.hpMax - b.hp >= 2) $('#boss-tip').hidden = true; break;
      case 'bell': sfx.bell(); break;
      case 'jam': sfx.deny(); sfx.stamp(); break;
      case 'strike': sfx.splash(); break;
      case 'torn': sfx.pour(); break;
      case 'fixed': sfx.ret(); break;
      case 'break': sfx.bug(); sfx.chain(3); break;
      case 'eat': sfx.error(); sfx.stamp(); break;
      case 'worm': sfx.bug(); break;
      case 'echo': sfx.error(); sfx.deny(); break;
      case 'phase': sfx.keystone(); music.level(e.phase); bossBanner(`part ${roman(e.phase)}`, ERAS[s.era].boss.phases[e.phase - 1]); break;
      case 'gust': sfx.pour(); break;
      case 'win': sfx.publish(); music.stop(1.6); break;
      case 'lose': sfx.end(); music.stop(1.6); break;
      default: break;
    }
  }
  b.events.length = 0;
}

/** After the fight: a won book leaves its trophy and opens the next era; a lost one sends you back to the tree. */
function finishBoss(won, { time = 0, left = 0 } = {}) {
  const s = G.state;
  music.stop(0.8);
  $('#screen-boss').classList.remove('typing');
  if (!won) {
    loseBoss(s);
    save();
    const b = ERAS[s.era].boss;
    scene(`<span class="scene-k">${ERAS[s.era].name.toLowerCase()} · the book is not done</span>
      <h1>${icon(b.icon)}${b.name}</h1>
      <p class="lead">Your ${ERAS[s.era].resource} ran out with ${Math.round(left * 100)}% of the book still to write.</p>
      <p>The next try is a little easier. ${G.result && G.result.ink ? `The ink you wrote is yours: +${fmt(G.result.ink)}.` : ''}</p>
      <div class="scene-acts"><button type="button" class="btn" data-back>back to the tree · esc</button><button type="button" class="btn primary big" data-go>try again · space</button></div>`,
    { cls: 'boss-lost', go: fightBoss, back: () => { show('tree'); refreshTree(); } });
    return;
  }
  const era = s.era;
  const res = winBoss(s, { time });
  save();
  sfx.publish();
  const t = res.trophy;
  if (!res.next) {
    // the last book: the end of this edition
    const tries = ERA_IDS.reduce((a, e) => a + s.bosses[e].tries, 0);
    scene(`<span class="scene-k">edition ${roman(s.edition)} · the end</span>
      <h1>the last page</h1>
      <p class="lead">From the first quill stroke to the last thought, your book is written.</p>
      <div class="scene-trophies">${ERA_IDS.map((e) => `<span title="${ERAS[e].trophy.short}">${icon(ERAS[e].trophy.icon)}<i>${ERAS[e].trophy.name.toLowerCase()}</i></span>`).join('')}</div>
      <div class="scene-stats">
        <div><b>${fmtTime(s.stats.played)}</b><span>writing</span></div>
        <div><b>${fmt(s.stats.words)}</b><span>words caught</span></div>
        <div><b>${Math.round(s.stats.bestWpm)}</b><span>best wpm</span></div>
        <div><b>${fmt(s.stats.totalInk)}</b><span>ink in all</span></div>
        <div><b>${s.drafts}</b><span>drafts</span></div>
        <div><b>${tries}</b><span>tries at the books</span></div>
      </div>
      <p>Begin <b>edition ${roman(s.edition + 1)}</b>: back to the Scriptorium with your trophies and twice the ink, but faster, longer words and longer books.</p>
      <div class="scene-acts"><button type="button" class="btn primary big" data-go>edition ${roman(s.edition + 1)} · space</button></div>`,
    { cls: 'era-end', go: () => { newEdition(s); save(); enterEra(); } });
    return;
  }
  const n = ERAS[res.next];
  scene(`<span class="scene-k">${ERAS[era].name.toLowerCase()} · the book is written</span>
    <h1>${icon(t.icon)}${t.name}</h1>
    <p class="lead">${t.short}, for the rest of the game.</p>
    <p>Next: <b>the ${n.name} era</b>. ${n.keys}, a new tree, and a new book at the end of it.</p>
    <div class="scene-acts"><button type="button" class="btn primary big" data-go>on to the ${n.name.toLowerCase()} · space</button></div>`,
  { cls: 'era-end', go: enterEra });
}

/** Into the era you are in now (after a book, or a new edition): its look, its empty tree. */
function enterEra() {
  const s = G.state;
  applyTheme(s.era);
  show('tree');
  refreshTree();
  sfx.start();
}

// ── Draft ──────────────────────────────────────────────────────────────────

function show(screen) {
  G.screen = screen;
  $('#screen-title').hidden = screen !== 'title';
  $('#screen-tree').hidden = screen !== 'tree';
  $('#screen-run').hidden = screen !== 'run';
  $('#screen-boss').hidden = screen !== 'boss';
  if (screen === 'boss') G.bossView.resize();
}


async function startRun() {
  if (modalOpen() || !$('#scene').hidden) return;
  if (G.screen === 'run' && !G.summaryShown) return;
  const s = G.state;
  if (G.screen === 'tree' && bookReady(s)) { startBoss(); return; } // the whole tree is bought: the next thing is the book
  const st = computeStats(s);
  const seed = (s.seed + s.drafts * 7919) >>> 0;
  G.run = createRun(st, seed);
  G.keys = [];
  G.away = false;
  $('#away').hidden = true;
  G.endT = 0;
  G.endDone = false;
  G.summaryShown = false;
  G.inkEnd.stop();
  G.prevBest = s.cycle.bestDraft;
  G.recShown = false;
  G.firstInEra = !s.flags[`drafted_${s.era}`];
  G.streakSeen = 0;
  G.inkShown = 0;
  G.hbT = 0;
  G.hitstop = 0;
  document.body.classList.remove('zone');
  s.flags[`drafted_${s.era}`] = true;
  applyTheme(s.era);
  show('run');
  $('#screen-run').classList.add('typing'); // the mouse hides while you type
  $('#summary').hidden = true;
  G.renderer.resize();
  G.renderer.setRun(G.run, s.era);
  // the tutorial: the very first draft is a guided one; after it, the next draft closes the tutorial
  setTutTarget(null);
  tutSay(null);
  const ui = { say: tutSay, cue: () => sfx.step() };
  G.tut = null;
  if (!s.flags.tutDone && s.drafts === 0) G.tut = new DraftTutorial(G.run, ui);
  else if (!s.flags.tutDone && (s.flags.tutBought || s.drafts >= 3)) { s.flags.tutDone = true; save(); }
  // the first draft in a new era teaches its keys and its mechanic
  if (!G.tut && G.firstInEra && s.era !== 'scriptorium') G.tut = new EraTutorial(G.run, s.era, ui);
  else if (G.firstInEra && s.drafts > 0) G.renderer.showBanner(ERAS[s.era].name, ERAS[s.era].keys);
  setHint();
  sfx.start();
}

const TUT_PULSE = { ink: '#hud-ink', focus: '.bar.focus', streak: '.bar.streak' };

/**
 * The tutorial box at the top of the page: { task, why, gate, err, lit, pulse, hide, id }. task is the thing to do,
 * in big letters; why, the reason under it (err: a correction, and the box shakes); gate, a line like "press space".
 * lit fades out the HUD except that part ('none', 'ink', 'focus'); pulse outlines a part of the HUD; hide, seconds.
 * The box only fades in when the task changes, so a counter or the keys left can update quietly. say(null) clears it all.
 */
function tutSay(m) {
  const el = $('#tut');
  const sr = $('#screen-run');
  clearTimeout(G.tutSayT);
  if (G.tutPulse) { G.tutPulse.classList.remove('tut-pulse'); G.tutPulse = null; }
  if (!m) { el.hidden = true; el._step = null; delete sr.dataset.tutLit; return; }
  el.innerHTML = (m.task ? `<span class="tut-task">${m.task}</span>` : '')
    + (m.why ? `<span class="tut-why${m.err ? ' err' : ''}">${m.why}</span>` : '')
    + (m.gate ? `<span class="tut-gate">${m.gate}</span>` : '');
  const step = (m.task || m.why || '').replace(/<[^>]+>|[^a-z ]/g, '').split(' ').slice(0, 3).join(' ');
  const fresh = el.hidden || el._step !== step;
  el._step = step;
  el.hidden = false;
  el.classList.remove('in', 'err');
  if (m.err || fresh) { void el.offsetWidth; el.classList.add(m.err ? 'err' : 'in'); }
  if (m.lit) sr.dataset.tutLit = m.lit; else delete sr.dataset.tutLit;
  if (m.pulse) { G.tutPulse = $(TUT_PULSE[m.pulse]); G.tutPulse.classList.add('tut-pulse'); }
  if (m.hide) G.tutSayT = setTimeout(() => tutSay(null), m.hide * 1000);
}

/**
 * Outside the page: a dotted outline around what to do next and a short note above it (kept in place every frame).
 * spot: the elements the spotlight leaves lit (the rest of the screen washes out); none, no spotlight.
 * below: the note goes under the target (when above it would cover something).
 */
function setTutTarget(el, text = '', spot = null, below = false) {
  if (G.tutTarget && G.tutTarget !== el) G.tutTarget.classList.remove('tut-target');
  G.tutTarget = el;
  G.tutSpot = el && spot ? spot : null;
  const tip = $('#tut-tip');
  tip.classList.toggle('below', below); // the note under the target, pointing up
  $('#tut-dim').hidden = !G.tutSpot;
  if (!el) { tip.hidden = true; return; }
  el.classList.add('tut-target');
  if (tip._t !== text) { tip._t = text; tip.textContent = text; }
  tip.hidden = false;
  placeTutTip();
}

function placeTutTip() {
  const el = G.tutTarget;
  const tip = $('#tut-tip');
  const dim = $('#tut-dim');
  if (!el || tip.hidden) return;
  const r = el.getBoundingClientRect();
  if (!r.width || modalOpen() || !$('#scene').hidden || (G.screen !== 'tree' && !el.closest('#summary'))) {
    tip.style.visibility = 'hidden';
    dim.style.visibility = 'hidden';
    return;
  }
  tip.style.visibility = '';
  dim.style.visibility = '';
  const lift = el.classList.contains('nb') ? 40 : 12; // above the best-buy note of a tree node
  const half = tip.offsetWidth / 2 + 10; // keep the whole tip on screen near the edges
  tip.style.left = `${Math.round(Math.min(Math.max(r.left + r.width / 2, half), innerWidth - half))}px`;
  tip.style.top = `${Math.round(tip.classList.contains('below') ? r.bottom + 12 : r.top - lift)}px`;
  if (G.tutSpot) {
    // the hole: around the lit elements and the tip, with some air
    const rs = [...G.tutSpot.filter((x) => x && !x.hidden).map((x) => x.getBoundingClientRect()), tip.getBoundingClientRect()];
    const pad = 10;
    const x0 = Math.min(...rs.map((q) => q.left)) - pad;
    const y0 = Math.min(...rs.map((q) => q.top)) - pad;
    const x1 = Math.max(...rs.map((q) => q.right)) + pad;
    const y1 = Math.max(...rs.map((q) => q.bottom)) + pad;
    dim.style.left = `${Math.round(x0)}px`;
    dim.style.top = `${Math.round(y0)}px`;
    dim.style.width = `${Math.round(x1 - x0)}px`;
    dim.style.height = `${Math.round(y1 - y0)}px`;
  }
}

/** The steps of the tutorial on the upgrades screen: buy your first upgrade, write another draft; later, the book. */
function tutorialTree() {
  const s = G.state;
  let target = null;
  let text = '';
  let spot = null;
  if (G.screen === 'tree' && !modalOpen()) {
    if (!s.flags.tutDone && s.drafts >= 1) {
      if (!s.flags.tutBought) {
        const T = treeOf(s);
        const best = G.advisor.best && T.byId[G.advisor.best] && T.status(s, NODE_BY_ID[G.advisor.best]) === 'buy' ? G.advisor.best : null;
        const cheap = T.nodes.filter((n) => T.status(s, n) === 'buy').sort((a, b) => T.cost(s, a) - T.cost(s, b))[0];
        const id = best || (cheap && cheap.id);
        if (id) {
          const it = G.inkTree.items.get(id);
          target = it.b.querySelector('.nb');
          text = `click ${NODE_BY_ID[id].name.toLowerCase()} to buy it ↓`;
          spot = [target, it.badge];
        } else {
          target = $('#start');
          text = 'write another draft to earn more ink ↓';
          spot = [target];
        }
      } else {
        target = $('#start');
        text = 'upgrades make every draft better. write the next one ↓';
        spot = [target];
      }
    } else if (bookReady(s) && !s.flags.tutBook) {
      target = $('#start');
      text = 'every upgrade is yours: write the book ↓';
    }
  }
  setTutTarget(target, text, spot);
}

function setHint() {
  const s = G.state;
  const hint = $('#run-hint');
  let text = '';
  if (s.drafts === 0) text = ''; // the guided first draft speaks for itself
  else if (s.drafts === 1) text = 'long words and words in italics (of the era) are worth more · esc lets go of a word';
  else if (lvl(s, 'illum') && !s.flags.illumHint && s.era === 'scriptorium') { text = 'Illuminated words: big, slow and worth ×4'; s.flags.illumHint = true; }
  hint.textContent = text;
  hint.hidden = !text;
  G.hintCatches = 0;
}

function onRunEnd() {
  $('#screen-run').classList.remove('typing');
  if (G.tut) { G.tut = null; tutSay(null); }
  const s = G.state;
  const run = G.run;
  G.result = applyDraft(s, run);
  save();
  sfx.end();
  $('#run-hint').hidden = true;
  $('#caps').hidden = true;
}

/** The end of a draft: ink pours into the middle and stains the page; the results are the paper left clean (inkend.js). */
function showSummary() {
  G.summaryShown = true;
  G.summaryAt = performance.now() + 700; // keys wait until the ink has spread
  G.endBtn = false;
  const s = G.state;
  const run = G.run;
  const res = G.result;
  const notes = [];
  if (res.bestDraft) notes.push('best draft');
  if (res.bestWpm) notes.push('new best wpm');
  else if (res.bestEraWpm) notes.push(`best wpm in the ${ERAS[run.st.era].name.toLowerCase()}`);
  $('#summary').hidden = false;
  const btn = $('#to-tree');
  btn.classList.remove('in');
  G.inkEnd.start({ ink: res.ink, wpm: res.wpm, acc: res.acc, streak: run.bestStreak, notes }, {
    pour: () => sfx.pour(),
    splash: () => { sfx.splash(); sfx.stamp(); },
    tick: (e) => sfx.tick(e),
    done: () => { if (notes.length) sfx.record(); },
  });
  btn.style.top = `${Math.round(G.inkEnd.layout.button)}px`;
  G.summaryPrimary = toTree;
}

/** Once the stain has spread: the way to the upgrades (and, in the first draft, the tutorial's pointer to it). */
function showEndButton() {
  G.endBtn = true;
  $('#to-tree').classList.add('in');
  const s = G.state;
  if (!s.flags.tutDone && s.drafts === 1) setTutTarget($('#to-tree'), '↑ spend your ink on upgrades', null, true);
}

function toTree() {
  setTutTarget(null);
  if (G.screen !== 'run' || !G.summaryShown || modalOpen()) return;
  G.run = null;
  G.inkEnd.stop();
  $('#summary').hidden = true;
  show('tree');
  refreshTree();
}

function updateRunHUD(dt = 0) {
  const run = G.run;
  const s = G.state;
  const st = run.st;
  const era = $('#hud-era');
  const ek = `${s.era}|${s.cycle.drafts}`;
  if (era._k !== ek) {
    era._k = ek;
    era.innerHTML = `<b>${ERAS[s.era].name.toLowerCase()}</b> · draft ${s.cycle.drafts + (run.ended ? 0 : 1)}`;
  }
  const ink = $('#hud-ink');
  // the counter rolls up towards the real value instead of jumping
  G.inkShown += (run.ink - G.inkShown) * Math.min(1, dt * 10);
  if (run.ink - G.inkShown < 0.5 || run.ended) G.inkShown = run.ink;
  const iv = fmt(G.inkShown);
  if (ink._v !== iv) {
    if (ink._v !== undefined && run.ink > 0 && !ink.classList.contains('pop')) { ink.classList.add('pop'); setTimeout(() => ink.classList.remove('pop'), 200); }
    ink._v = iv;
    ink.innerHTML = `${DROP()}${iv}`;
  }
  const wpm = Math.round(runWpm(run));
  const acc = Math.round(runAcc(run) * 100);
  setText($('#hud-wpm'), '');
  const wk = `${wpm}|${acc}`;
  const we = $('#hud-wpm');
  if (we._k !== wk) { we._k = wk; we.innerHTML = `<b>${wpm}</b>wpm · ${acc}%`; }
  const f = Math.max(0, run.focus / run.focusMax);
  const fill = $('#focus-fill');
  const fk = f.toFixed(3);
  if (fill._f !== fk) { fill._f = fk; fill.style.transform = `scaleX(${fk})`; fill.parentElement.style.setProperty('--f', fk); fill.parentElement.classList.toggle('low', f < 0.25); }
  const sb = streakBonus(run);
  const sf = $('#streak-fill');
  const sk = (sb / st.streakCap).toFixed(3);
  if (sf._f !== sk) { sf._f = sk; sf.style.transform = `scaleX(${sk})`; }
  const ch = st.chain && !run.ended && run.chain >= 2 && run.t - run.lastCatchT < st.chainWindow ? ` · chain ×${run.chain}` : '';
  setText($('#streak-label'), sb > 0.005 || ch ? `streak +${Math.round(sb * 100)}%${ch}` : '');
  setText($('#focus-label'), `${ERAS[st.era].resource} ${Math.ceil(Math.max(0, run.focus))} s`);
}

// ── Keys ───────────────────────────────────────────────────────────────────

// ── Title screen ───────────────────────────────────────────────────────────

/** The game's name types itself; to start, type the word on the button (or press Enter). */
function showTitle(fresh) {
  const s = G.state;
  const word = fresh ? 'begin' : 'continue';
  const box = $('#screen-title');
  const rng = mulberry32(s.seed + 3);
  // eight different words of the era, shuffled
  const words = [...themeWords(s.era)];
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const drift = Array.from({ length: 8 }, (_, i) => {
    const top = i % 2 ? 6 + rng() * 22 : 74 + rng() * 20; // above and below the title, never across it
    const dur = 26 + rng() * 22;
    return `<span class="drift" style="top:${top.toFixed(1)}%;animation-duration:${dur.toFixed(1)}s;animation-delay:-${(rng() * dur).toFixed(1)}s">${words[i % words.length]}</span>`;
  }).join('');
  box.innerHTML = `${drift}<div class="title-wrap" id="title-wrap">
      <h1 class="title"><span id="title-text"></span><span class="caret"></span></h1>
      <p class="title-sub">a typing incremental</p>
      <div class="title-opts"><div class="tword" id="title-go" aria-label="type ${word} to start"><span class="fill"></span><span class="w">${[...word].map((c) => `<span class="ch">${c}</span>`).join('')}</span></div></div>
    </div>`;
  box.classList.remove('out');
  show('title');
  G.title = { word, typed: 0, fresh, ready: false, i: 0 };
  paintTitleWord();
  const name = 'incrementalography';
  const step = () => {
    const T = G.title;
    if (!T || T.ready) return;
    T.i += 1;
    $('#title-text').textContent = name.slice(0, T.i);
    if (T.i >= name.length) { T.ready = true; $('#title-wrap').classList.add('ready'); return; }
    T.timer = setTimeout(step, 55 + Math.random() * 70); // an uneven hand, like a person typing
  };
  G.title.timer = setTimeout(step, 450);
}

/** The word to type: typed letters underlined, a caret under the next one, the box filling up like A Dark Room's buttons. */
function paintTitleWord() {
  const T = G.title;
  const b = $('#title-go');
  b.classList.toggle('typing', T.typed > 0);
  b.querySelectorAll('.ch').forEach((c, i) => {
    c.classList.toggle('done', i < T.typed);
    c.classList.toggle('next', i === T.typed);
  });
  b.querySelector('.fill').style.width = `${((T.typed / T.word.length) * 100).toFixed(1)}%`;
}

function titleKey(e) {
  const T = G.title;
  if (!T || T.leaving || e.metaKey || e.ctrlKey) return;
  if (!T.ready) {
    // any key finishes the name at once (and a letter of the word still counts)
    clearTimeout(T.timer);
    T.ready = true;
    $('#title-text').textContent = 'incrementalography';
    $('#title-wrap').classList.add('ready');
  }
  // the only way in is to type the word: no click, no Enter
  if (e.key.length !== 1 || e.repeat || e.key === ' ') return;
  e.preventDefault();
  if (e.key.toLowerCase() === T.word[T.typed]) {
    T.typed += 1;
    sfx.key(G.state.era);
    paintTitleWord();
    if (T.typed >= T.word.length) { $('#title-go').classList.add('full'); setTimeout(leaveTitle, 260); }
  } else {
    T.typed = 0;
    sfx.error();
    paintTitleWord();
    const b = $('#title-go');
    b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
  }
}

function leaveTitle() {
  const T = G.title;
  if (!T || T.leaving) return;
  T.leaving = true;
  clearTimeout(T.timer);
  sfx.start();
  $('#screen-title').classList.add('out');
  setTimeout(() => {
    G.title = null;
    show('tree');
    G.inkTree.fitKey = null;
    refreshTree();
    if (T.fresh && !G.state.flags.tutDone) startRun(); // a new game starts with the guided first draft
  }, 450);
}

/** Leaving the window during a draft pauses it (if the setting is on); a key brings it back. */
function setAway(on) {
  if (on === G.away) return;
  const fighting = (G.screen === 'run' && G.run && !G.run.ended) || (G.screen === 'boss' && G.boss && !G.boss.ended);
  if (on && !(fighting && G.state.settings.autoPause && !G.bot)) return;
  G.away = on;
  G.keys.length = 0;
  $('#away').hidden = !on;
}

function bindInput() {
  window.addEventListener('blur', () => setAway(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setAway(true); });
  window.addEventListener('keydown', (e) => {
    if (modalOpen()) return;
    if (G.screen === 'title') { titleKey(e); return; }
    if (G.screen === 'boss' && G.boss && !G.boss.ended && $('#scene').hidden) {
      if ((e.metaKey || e.ctrlKey) && !(e.ctrlKey && e.altKey)) return;
      e.preventDefault();
      if (G.away) { if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) setAway(false); return; }
      if (!e.repeat && !G.bot && (e.key.length === 1 || e.key === 'Enter')) G.keys.push(e.key);
      return;
    }
    const run = G.run;
    if (G.screen === 'run' && run && !run.ended) {
      if ((e.metaKey || e.ctrlKey) && !(e.ctrlKey && e.altKey)) return; // let shortcuts through (AltGr types symbols)
      if (G.away) {
        // back from another window: the first key only wakes the draft up
        e.preventDefault();
        if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) setAway(false);
        return;
      }
      $('#caps').hidden = !(e.getModifierState && e.getModifierState('CapsLock'));
      if (e.key === 'Tab' || e.key === 'Backspace') { e.preventDefault(); return; }
      if (G.tut && G.tut.gate) {
        // the tutorial waits on its explanation: space (or Enter) goes on, other keys do nothing
        e.preventDefault();
        if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) G.tut.go();
        return;
      }
      if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        if (!e.repeat && !G.bot) G.keys.push(e.key);
      }
      return;
    }
    if (!$('#scene').hidden) { G.sceneKeys?.(e); return; }
    if (G.screen === 'run' && G.summaryShown && e.key === 'Enter') {
      e.preventDefault();
      if (performance.now() > G.summaryAt) G.summaryPrimary();
      return;
    }
    if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      // space: a new draft (and never a click on the button that happens to have the focus)
      e.preventDefault();
      if (e.repeat) return;
      const tutSummary = !G.state.flags.tutDone && G.state.drafts === 1; // the first summary teaches the upgrades
      if (G.screen === 'tree' || (G.screen === 'run' && G.summaryShown && !tutSummary && performance.now() > G.summaryAt)) {
        document.activeElement?.blur?.();
        startRun();
      }
      return;
    }
    if (G.screen === 'tree' && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      startRun();
    }
  });
}

// ── Loop ───────────────────────────────────────────────────────────────────

function frame(t) {
  const dt = Math.min(0.05, Math.max(0, (t - G.last) / 1000));
  G.last = t;
  tick(dt);
  requestAnimationFrame(frame);
}

function tick(dt) {
  if (G.state && !document.hidden) G.state.stats.played += dt;
  if (G.tutTarget) placeTutTip();
  if (G.screen === 'boss' && G.boss) { tickBoss(dt); return; }
  if (G.screen === 'run' && G.run) {
    const run = G.run;
    const s = G.state;
    if (G.paused || G.away) {
      // test pause, or you left the window: only draw
    } else if (G.hitstop > 0) {
      // hit-stop: the page freezes for a blink on a big catch (keys wait in the queue)
      G.hitstop -= dt;
    } else if (!run.ended) {
      let left = dt;
      let keys = G.keys.splice(0);
      while (left > 0 && !run.ended) {
        const h = Math.min(1 / 60, left);
        if (G.bot) keys = keys.concat(botKeys(run, h, G.bot));
        stepRun(run, h, keys);
        keys = [];
        left -= h;
      }
      if (G.tut) G.tut.tick(dt);
      handleEvents(run);
    }
    if (run.ended && !G.endDone) {
      // however the draft ended (focus, a Perfectionist mistake, the debug hook), count it once
      handleEvents(run);
      G.endDone = true;
      onRunEnd();
    } else if (run.ended) {
      G.endT += dt;
      if (G.endT > 0.3 && !G.summaryShown) showSummary();
      if (G.summaryShown && !G.paused) {
        G.inkEnd.update(dt);
        if (!G.endBtn && G.inkEnd.t > 1.15) showEndButton();
      }
    }
    if (!run.ended && !G.away && run.focus / run.focusMax < 0.25) {
      G.hbT -= dt;
      if (G.hbT <= 0) { sfx.heartbeat(); G.hbT = 0.85; }
    }
    G.renderer.draw(G.paused || G.away ? 0 : G.hitstop > 0 ? dt * 0.15 : dt, s.settings);
    updateRunHUD(dt);
  }
}

/** A blink of freeze on a big catch, unless the player asked for calm effects. */
function hitstop(t) { if (!G.state.settings.calm) G.hitstop = t; }

function tickBoss(dt) {
  const b = G.boss;
  if (!G.paused && !G.away && !b.ended) {
    let left = dt;
    let keys = G.keys.splice(0);
    while (left > 0 && !b.ended) {
      const h = Math.min(1 / 60, left);
      if (G.bot) keys = keys.concat(botBossKeys(b, h, G.bot));
      stepBoss(b, h, keys);
      keys = [];
      left -= h;
    }
  }
  bossEvents(b);
  G.bossView.draw(G.paused || G.away ? 0 : dt);
  paintBossHud();
  if (b.ended && !G.bossDone) {
    G.bossT += dt;
    if (G.bossT > 1.6) {
      G.bossDone = true;
      G.result = applyDraft(G.state, b, { boss: true }); // its typing counts for records, and its ink is yours
      finishBoss(b.won, { time: b.t, left: b.hp / b.hpMax });
    }
  }
}

function handleEvents(run) {
  const s = G.state;
  for (const e of run.events) {
    if (e.amount !== undefined) e.text_amount = fmt(e.amount, { decimals: e.amount < 10 ? 1 : 0 });
    G.renderer.onEvent(e, s.settings);
    if (G.tut) G.tut.onEvent(e);
    switch (e.type) {
      case 'key': {
        sfx.key(s.era);
        const next = STREAKS[G.streakSeen];
        if (next && run.streak >= next[0]) {
          G.streakSeen += 1;
          G.renderer.callout(next[1], G.renderer.theme.gold, 0.9 + G.streakSeen * 0.08);
          sfx.streak(G.streakSeen);
        }
        break;
      }
      case 'error': {
        sfx.error();
        const bar = $('.bar.streak');
        bar.classList.remove('break'); void bar.offsetWidth; bar.classList.add('break');
        break;
      }
      case 'catch':
        if (e.splash) sfx.splash();
        else if (e.gold) { sfx.gold(); hitstop(0.07); }
        else {
          sfx.catch(streakBonus(run) / run.st.streakCap, e.kind);
          if (e.kind === 'illum') hitstop(0.09);
          if (e.chain >= 2) sfx.chain(e.chain);
        }
        if (++G.hintCatches >= 3 && s.drafts > 0) $('#run-hint').hidden = true;
        if (!G.recShown && G.prevBest > 0 && s.cycle.drafts > 1 && run.ink > G.prevBest) {
          G.recShown = true;
          G.renderer.showBanner('Best draft', 'of this book so far');
          sfx.record();
        }
        break;
      case 'bell': sfx.bell(); break;
      case 'line': sfx.ret(); hitstop(0.06); break;
      case 'bug': sfx.bug(); break;
      case 'zone': sfx.zone(); document.body.classList.add('zone'); break;
      case 'unzone': document.body.classList.remove('zone'); break;
      case 'end': document.body.classList.remove('zone'); break;
      default: break;
    }
  }
  run.events.length = 0;
}

// ── Start-up ───────────────────────────────────────────────────────────────

function boot() {
  const loaded = readSave();
  G.state = loaded || newState();
  G.applySettings();
  applyTheme(G.state.era);
  if (G.state.migrated) {
    // a save from before the eras had their own trees and bosses (game.js, hydrate)
    const e = ERAS[G.state.migrated.era];
    setTimeout(() => toast(`the game has changed: no more fame. each era now has its own tree, and its book to write at the end. you go on in ${e.name === 'Scriptorium' ? 'the Scriptorium' : `the ${e.name} era`}.`), 600);
    delete G.state.migrated;
    save();
  }

  // fonts load lazily: ask for every era's fonts now so the page (canvas) never measures a fallback
  if (document.fonts) {
    const faces = ['EB Garamond', 'Courier Prime', 'IBM Plex Mono', 'Space Grotesk'];
    Promise.all(faces.flatMap((f) => [document.fonts.load(`20px '${f}'`), document.fonts.load(`500 20px '${f}'`)]))
      .then(() => { G.renderer.measure(); }).catch(() => {});
  }
  G.renderer = new FieldRenderer($('#run'), $('#page'));
  G.renderer.wordScale = G.state.settings.words;
  G.renderer.measure();
  G.renderer.hudTarget = () => {
    const r = $('#hud-ink').getBoundingClientRect();
    return { x: r.left + 12, y: r.top + r.height / 2 };
  };
  G.advisor.onUpdate(() => { if (G.screen === 'tree') tutorialTree(); });
  G.inkEnd = new InkEnding($('#ink-end'));
  G.bossView = new BossView($('#boss'));
  $('#to-tree').innerHTML = `${icon('binary-tree-2')}upgrades`;
  $('#to-tree').addEventListener('click', toTree);
  $('#gear').addEventListener('click', () => settingsDialog(G));
  $('#start').addEventListener('click', startRun);
  bindInput();
  // the title screen first (#play in the address skips it, for tests)
  const fresh = !loaded || (G.state.drafts === 0 && !G.state.stats.bosses);
  if (location.hash === '#play') { show('tree'); refreshTree(); } else { refreshTree(); showTitle(fresh); }
  save();
  setInterval(save, 15000);
  window.addEventListener('pagehide', save);
  const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (touchOnly) {
    modal({ title: 'You need a keyboard', body: '<p>Incrementalography is a typing game: it needs a physical keyboard. Open it on a computer for the real thing.</p>', actions: [{ id: 'ok', label: 'Look around anyway', primary: true }] });
  }
  if (import.meta.env.DEV) {
    G.debug = {
      give(n = 1e6) { G.state.ink += n; G.state.cycle.ink += n; refreshTree(); },
      // every upgrade of the era bought (the book is ready)
      book() { for (const n of ERA_NODES[G.state.era]) G.state.levels[n.id] = 1; refreshTree(); },
      win() { finishBoss(true); },
      // jump to an era (with some of its tree bought, to see it)
      era(e = 'typewriter', n = 5) {
        const s = G.state;
        s.era = e;
        s.levels = {};
        const T = TREES[e];
        for (let i = 0; i < n; i++) { const c = T.nodes.filter((x) => T.status(s, x) !== 'hidden' && !lvl(s, x.id)).sort((a, b) => T.cost(s, a) - T.cost(s, b))[0]; if (c) s.levels[c.id] = 1; }
        enterEra();
      },
      lose() { finishBoss(false); },
      endRun() { if (G.run) finishRun(G.run); },
      bot(wpm = 55, err = 0.05) { G.bot = wpm ? { wpm, err, rng: mulberry32(wpm) } : null; },
      // with the pane hidden requestAnimationFrame barely runs: this plays `sec` seconds right away
      step(sec = 1) { for (let i = 0; i < Math.round(sec * 60); i++) tick(1 / 60); },
    };
  }
  G.last = performance.now();
  requestAnimationFrame(frame);
}

boot();
