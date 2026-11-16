// Start-up and loop: upgrades ⇄ draft ⇄ summary, publishing, eras, challenges and the Magnum Opus.

import './fonts.js';
import './style.css';
import {
  newState, computeStats, applyDraft, hydrate, INK, FAME, fameGain, nextFameAt, canPublish, publish, editorBuy,
  runWpm, runAcc, challengeGoal, challengesOpen, startChallenge, abandonChallenge, fl, lvl, FAME_K,
} from './game.js';
import { Advisor, fmtGain } from './advisor.js';
import { themeWords } from './words.js';
import { DraftTutorial, EraTutorial } from './tutorial.js';
import { icon } from './icons.js';
import { InkEnding } from './inkend.js';
import { createRun, stepRun, streakBonus, chainBonus, finishRun, botKeys, mulberry32 } from './run.js';
import { FieldRenderer } from './render.js';
import { TreeView } from './treeview.js';
import { toast, modal, modalOpen, settingsDialog, setText } from './ui.js';
import { sfx, setVolume } from './audio.js';
import { fmt, fmtTime, setNotation } from './format.js';
import { GAME, ERAS, ERA_IDS, NODES, NODE_BY_ID, FAME_BY_ID, CHALLENGES, CHALLENGE_BY_ID, INK_COLUMNS, FAME_COLUMNS } from './data.js';

const SAVE_KEY = `${GAME.id}:save`;
const $ = (s) => document.querySelector(s);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n) => ROMAN[n] || String(n);
// streak names: a callout the first time a draft reaches each one
const STREAKS = [[25, 'Steady'], [50, 'Fluent'], [100, 'Unstoppable'], [200, 'Legendary'], [400, 'Mythic']];

const G = {
  state: null,
  screen: 'tree',
  tab: 'ink',
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
  root.style.setProperty('--era-font', e.font);
  root.dataset.ui = e.ui;
  root.dataset.era = era;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', e.theme.bg);
}

// ── Upgrades screen ────────────────────────────────────────────────────────

const chipHTML = (ic, value) => `${icon(ic)}${value}`;
const DROP = () => icon('droplet');
const STAR = () => icon('star');

function renderChip(elm, icon, value) {
  const v = fmt(value);
  if (elm._v !== v) {
    if (elm._v !== undefined) { elm.classList.remove('pop'); void elm.offsetWidth; elm.classList.add('pop'); }
    elm._v = v;
    elm.innerHTML = chipHTML(icon, v);
  }
}

function refreshTree() {
  const s = G.state;
  renderChip($('#w-ink'), 'droplet', s.ink);
  renderChip($('#w-fame'), 'star', s.fame);
  $('#w-fame').hidden = !(s.fame > 0 || s.publishes > 0);

  const showFame = s.publishes > 0 || canPublish(s) || s.fame > 0;
  const tabs = $('#tabs');
  const famTab = tabs.querySelector('[data-tab="fame"]');
  famTab.hidden = !showFame;
  famTab.innerHTML = `${STAR()}fame${FAME.affordable(s) ? '<span class="new">*</span>' : ''}`;
  const chTab = tabs.querySelector('[data-tab="chal"]');
  chTab.hidden = !challengesOpen(s);
  tabs.querySelector('[data-tab="ink"]').innerHTML = `${DROP()}upgrades${G.tab !== 'ink' && INK.affordable(s) ? '<span class="new">*</span>' : ''}`;
  chTab.innerHTML = `${icon('trophy')}challenges`;
  tabs.style.visibility = !showFame && !challengesOpen(s) ? 'hidden' : '';
  if ((G.tab === 'fame' && !showFame) || (G.tab === 'chal' && !challengesOpen(s))) G.tab = 'ink';
  for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === G.tab);
  $('#tree-ink').hidden = G.tab !== 'ink';
  $('#tree-fame').hidden = G.tab !== 'fame';
  $('#chal').hidden = G.tab !== 'chal';
  G.advisor.request(s);
  if (G.tab === 'ink') G.inkTree.update(s);
  if (G.tab === 'fame') G.fameTree.update(s);
  if (G.tab === 'chal') renderChallenges();

  // publishing: the next goal, always in sight
  const gain = fameGain(s);
  const pub = $('#publish');
  const hint = $('#pub-hint');
  if (canPublish(s)) {
    pub.hidden = false;
    pub.innerHTML = `${icon('book-upload')}publish · +${fmt(gain)}${STAR()}`;
    pub.className = `btn${s.publishes === 0 ? ' primary' : ''}`;
    hint.innerHTML = `next ${STAR()} in <b>${fmt(Math.max(0, nextFameAt(s) - s.cycle.ink))}</b>${DROP()}`;
  } else {
    pub.hidden = true;
    if (s.publishes === 0 && s.drafts > 0) {
      const need = FAME_BY_ID.era_typewriter.cost.b;
      // fame grows with the square root of ink, so the bar shows √ of the way there
      const k = Math.min(1, Math.sqrt(s.cycle.ink / (FAME_K * need * need)));
      hint.innerHTML = `your first book can be published at <b>${need}</b>${STAR()}<span class="pub-bar"><i style="width:${(k * 100).toFixed(0)}%"></i></span>${gain} / ${need}`;
    } else if (s.publishes > 0 && gain < 1) {
      hint.innerHTML = `this book's first ${STAR()} at <b>${fmt(nextFameAt(s))}</b>${DROP()}`;
    } else hint.textContent = '';
  }
  tutorialTree();
  if (!$('#start')._k) { $('#start')._k = 1; $('#start').innerHTML = `${icon('file-plus')}new draft`; }
}

function buyPitch() {
  const now = performance.now();
  G.buyStep = now - G.lastBuy < 1300 ? G.buyStep + 1 : 0;
  G.lastBuy = now;
  return G.buyStep;
}

const BRANCH_LABEL = { value: 'ink', focus: 'focus', streak: 'streak', scriptorium: 'the scriptorium' };

/** A branch whose first upgrade was waiting (after: N upgrades) just opened: say so. */
function newBranches(s, before) {
  for (const n of NODES) {
    if (n.after && !before.has(n.id) && INK.visible(s, n)) {
      toast(`a new branch opens: ${BRANCH_LABEL[n.branch] || n.branch}`);
      sfx.milestone();
    }
  }
}
const shownNow = (s) => new Set(NODES.filter((n) => INK.visible(s, n)).map((n) => n.id));

function onBuyInk(id) {
  const s = G.state;
  const node = NODE_BY_ID[id];
  const adv = G.advisor.get(id);
  const before = shownNow(s);
  if (INK.buy(s, id)) {
    if (!s.flags.tutDone) s.flags.tutBought = true;
    const big = !!(node.keystone || id.startsWith('master_'));
    const text = adv && !adv.text && adv.gain >= 0.005 ? `${fmtGain(adv.gain)} ink per draft` : node.short;
    G.inkTree.flash(id, true, text, big);
    if (big) sfx.keystone();
    else sfx.buy(buyPitch());
    refreshTree();
    save();
    if (node.news) toast(node.news);
    newBranches(s, before);
  } else {
    sfx.deny();
    G.inkTree.flash(id, false);
  }
}

function onBuyFame(id) {
  const s = G.state;
  const node = FAME_BY_ID[id];
  const before = s.era;
  if (FAME.buy(s, id)) {
    const big = !!node.eraUnlock || id === 'opus';
    if (big) sfx.keystone(); else sfx.buy(buyPitch());
    G.fameTree.flash(id, true, node.eraUnlock ? 'a new era' : node.short, big);
    if (node.eraUnlock) {
      const e = ERAS[node.eraUnlock];
      toast(s.era === node.eraUnlock ? `The ${e.name} era is open: this book is written in it` : `The ${e.name} era is open: your next book is written in it`);
      if (s.era !== before) applyTheme(s.era);
    } else if (node.news) toast(node.news);
    save();
    refreshTree();
    if (id === 'opus') setTimeout(showOpus, 450);
  } else {
    sfx.deny();
    G.fameTree.flash(id, false);
  }
}

function setTab(tab) {
  G.tab = tab;
  refreshTree();
}

async function publishFlow() {
  const s = G.state;
  if (!canPublish(s)) return;
  const gain = fameGain(s);
  const first = s.publishes === 0;
  const r = await modal({
    title: 'Publish your book?',
    body: `<p>You get <b>${fmt(gain)} ★ fame</b>.</p>
      <p>Your ink and ink upgrades start over with a new book. Fame, fame upgrades, eras and records stay.</p>
      ${first ? '<p>Then open the <b>Typewriter era</b> in the Fame tab.</p>' : ''}`,
    actions: [{ id: 'no', label: 'Not yet' }, { id: 'yes', label: `Publish · +${fmt(gain)} ★`, primary: true }],
  });
  if (r !== 'yes') return;
  s.flags.tutPub = true;
  const g = publish(s);
  if (!g) return;
  G.fameTree.fitKey = null;
  G.inkTree.fitKey = null;
  G.tab = 'fame';
  save();
  refreshTree();
  publishCeremony(g);
}

/** The book closes, the title stamps in and stars fly to your fame. */
function publishCeremony(g) {
  const s = G.state;
  sfx.publish();
  const fx = document.createElement('div');
  fx.className = 'pubfx';
  fx.innerHTML = `<div class="pub-card"><span class="pub-k">Book ${s.publishes}</span><h1>Published</h1><p>+${fmt(g)} ★ fame</p></div>`;
  document.body.append(fx);
  setTimeout(() => sfx.stamp(), 380);
  const chip = $('#w-fame').getBoundingClientRect();
  const n = Math.min(18, 6 + g);
  setTimeout(() => {
    for (let i = 0; i < n; i++) {
      const st = document.createElement('i');
      st.className = 'pub-star';
      st.textContent = '*';
      const x0 = innerWidth / 2 + (Math.random() - 0.5) * 220;
      const y0 = innerHeight / 2 + (Math.random() - 0.5) * 120;
      st.style.left = `${x0}px`;
      st.style.top = `${y0}px`;
      document.body.append(st);
      setTimeout(() => {
        st.style.transform = `translate(${chip.left + chip.width / 2 - x0}px, ${chip.top + chip.height / 2 - y0}px) scale(0.5)`;
        st.style.opacity = '0.2';
      }, 30 + i * 35);
      setTimeout(() => { st.remove(); sfx.tick(i / n); }, 750 + i * 35);
    }
  }, 900);
  setTimeout(() => fx.classList.add('out'), 1700);
  setTimeout(() => { fx.remove(); toast(`Book ${s.publishes} published: +${fmt(g)} ★`); }, 2100);
}

// ── Challenges ─────────────────────────────────────────────────────────────

function renderChallenges() {
  const s = G.state;
  const box = $('#chal');
  const active = s.cycle.chal;
  box.innerHTML = `<p class="chal-intro">A challenge is a book with a special rule. Reach the goal inside that book to clear the tier and keep its reward forever. Tiers never end. Starting one publishes your current book first${canPublish(s) ? ` (+${fmt(fameGain(s))} ★)` : ''}.</p>
    <div class="chal-grid">${CHALLENGES.map((c) => {
      const tier = s.chal[c.id];
      const isOn = active === c.id;
      return `<div class="chal-card box${isOn ? ' active' : ''}">
        <span class="legend">${c.name.toLowerCase()} · ${tier ? `${roman(tier)} cleared` : 'not cleared'}</span>
        <p class="rule">${c.rule}</p>
        <p class="reward">${c.reward}</p>
        <p class="goal">Tier ${roman(tier + 1)}: ${fmt(challengeGoal(s, c.id))} ink in one book${isOn ? ` · ${fmt(s.cycle.ink)} so far` : ''}</p>
        ${isOn ? `<button type="button" class="btn ghost" data-abandon="${c.id}">Drop the rule</button>` : `<button type="button" class="btn" data-start="${c.id}">Start tier ${roman(tier + 1)}</button>`}
      </div>`;
    }).join('')}</div>`;
  box.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => challengeFlow(b.dataset.start)));
  box.querySelectorAll('[data-abandon]').forEach((b) => b.addEventListener('click', () => { abandonChallenge(s); save(); refreshTree(); toast('The rule is gone: this book goes on as normal'); }));
}

async function challengeFlow(id) {
  const s = G.state;
  const c = CHALLENGE_BY_ID[id];
  const gain = canPublish(s) ? fameGain(s) : 0;
  const r = await modal({
    title: `${c.name} ${roman(s.chal[id] + 1)}`,
    body: `<p><b>${c.rule}</b></p><p>Goal: ${fmt(challengeGoal(s, id))} ink in this book. Reward: ${c.reward.toLowerCase()}.</p>
      <p>${gain ? `Your current book is published first (+${fmt(gain)} ★).` : 'Your current book starts over (it gives no fame yet).'}</p>`,
    actions: [{ id: 'no', label: 'Cancel' }, { id: 'yes', label: 'Start', primary: true }],
  });
  if (r !== 'yes') return;
  const g = startChallenge(s, id);
  if (g) sfx.publish(); else sfx.start();
  G.inkTree.fitKey = null;
  G.tab = 'ink';
  save();
  refreshTree();
  toast(`${c.name}: ${c.rule}`);
}

// ── Draft ──────────────────────────────────────────────────────────────────

function show(screen) {
  G.screen = screen;
  $('#screen-title').hidden = screen !== 'title';
  $('#screen-tree').hidden = screen !== 'tree';
  $('#screen-run').hidden = screen !== 'run';
}


async function startRun() {
  if (modalOpen() || !$('#opus').hidden) return;
  if (G.screen === 'run' && !G.summaryShown) return;
  const s = G.state;
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
  if (!r.width || modalOpen() || (G.screen !== 'tree' && !el.closest('#summary'))) {
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

/** The steps of the tutorial on the upgrades screen: buy your first upgrade, write another draft; later, publish. */
function tutorialTree() {
  const s = G.state;
  let target = null;
  let text = '';
  let spot = null;
  if (G.screen === 'tree' && !modalOpen()) {
    if (!s.flags.tutDone && s.drafts >= 1 && G.tab === 'ink') {
      if (!s.flags.tutBought) {
        const best = G.advisor.best && INK.status(s, NODE_BY_ID[G.advisor.best]) === 'buy' ? G.advisor.best : null;
        const cheap = INK.nodes.filter((n) => INK.status(s, n) === 'buy').sort((a, b) => INK.cost(s, a) - INK.cost(s, b))[0];
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
    } else if (s.flags.tutDone && canPublish(s) && s.publishes === 0 && !s.flags.tutPub) {
      target = $('#publish');
      text = 'your book is ready: publish it to earn fame ↓';
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
  G.editor = editorBuy(s);
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
  if (res.challenge) notes.push(`${CHALLENGE_BY_ID[res.challenge.id].name.toLowerCase()} ${roman(res.challenge.tier)} cleared`);
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
  if (res.challenge) toast(`${CHALLENGE_BY_ID[res.challenge.id].name} ${roman(res.challenge.tier)} cleared: ${CHALLENGE_BY_ID[res.challenge.id].reward.toLowerCase()}`);
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
    era.innerHTML = `<b>${ERAS[s.era].name.toLowerCase()}</b> · draft ${s.cycle.drafts + (run.ended ? 0 : 1)}${st.chal ? ` · ${CHALLENGE_BY_ID[st.chal].name}` : ''}`;
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
  if (fill._f !== fk) { fill._f = fk; fill.style.transform = `scaleX(${fk})`; fill.parentElement.classList.toggle('low', f < 0.25); }
  const sb = streakBonus(run);
  const sf = $('#streak-fill');
  const sk = (sb / st.streakCap).toFixed(3);
  if (sf._f !== sk) { sf._f = sk; sf.style.transform = `scaleX(${sk})`; }
  const ch = st.chain && !run.ended && run.chain >= 2 && run.t - run.lastCatchT < st.chainWindow ? ` · chain ×${run.chain}` : '';
  setText($('#streak-label'), sb > 0.005 || ch ? `streak +${Math.round(sb * 100)}%${ch}` : '');
  setText($('#focus-label'), `focus ${Math.ceil(Math.max(0, run.focus))} s`);
}

// ── Magnum Opus ────────────────────────────────────────────────────────────

function showOpus() {
  const s = G.state;
  const box = $('#opus');
  box.innerHTML = `<canvas></canvas><div class="opus-card box">
    <h1>magnum opus</h1>
    <p class="lead">From the first quill stroke to the last thought, your life's book is written.</p>
    <div class="opus-stats">
      <div><b>${fmtTime(s.stats.played)}</b><span>writing</span></div>
      <div><b>${fmt(s.stats.words)}</b><span>words caught</span></div>
      <div><b>${Math.round(s.stats.bestWpm)}</b><span>best wpm</span></div>
      <div><b>${fmt(s.stats.totalInk)}</b><span>ink in total</span></div>
      <div><b>${s.publishes}</b><span>books published</span></div>
      <div><b>${fmt(s.stats.fame)}</b><span>fame earned</span></div>
    </div>
    <button type="button" class="btn primary big" id="opus-go">Keep writing ▶</button>
    <p class="muted" style="margin-top:14px;font-size:13px">Challenges are open: special books with tiers that never end.</p>
  </div>`;
  box.hidden = false;
  sfx.publish();
  const c = box.querySelector('canvas');
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = (c.width = innerWidth * dpr);
  const H = (c.height = innerHeight * dpr);
  const rng = mulberry32(s.seed);
  const pool = ['quill', 'parchment', 'Ribbon,', 'Carriage', 'file_2', '#tag', 'v3.1', 'Neural link.', 'Orbit 77', 'psalter', 'Memo.', 'kernel()', 'Signal 9', 'vellum', "Don't", '~/home'];
  const words = Array.from({ length: 70 }, (_, i) => ({ t: pool[i % pool.length], x: rng() * W, y: rng() * H, v: (12 + rng() * 30) * dpr, era: ERA_IDS[i % 4], a: 0.04 + rng() * 0.08 }));
  let last = performance.now();
  const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  const loop = (now) => {
    if (box.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const w of words) {
      w.y -= w.v * dt;
      if (w.y < -40) { w.y = H + 30; w.x = rng() * W; }
      ctx.globalAlpha = w.a;
      ctx.fillStyle = color;
      ctx.font = `${22 * dpr}px ${ERAS[w.era].font}`;
      ctx.fillText(w.t, w.x, w.y);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const go = box.querySelector('#opus-go');
  go.focus();
  go.addEventListener('click', () => {
    box.hidden = true;
    s.flags.opusSeen = true;
    save();
    G.tab = 'chal';
    refreshTree();
  });
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
  if (on && !(G.screen === 'run' && G.run && !G.run.ended && G.state.settings.autoPause && !G.bot)) return;
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
    if (!$('#opus').hidden) return;
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
  if (G.state.refund !== undefined) {
    // a save from before the new trees: their upgrades were sold back (game.js, hydrate)
    const r = G.state.refund;
    toast(`some upgrades are gone, so what you spent on them is back: ${fmt(r.ink)}${DROP()}${r.fame ? ` and ${fmt(r.fame)}${STAR()}` : ''}.`);
    delete G.state.refund;
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
  G.inkTree = new TreeView($('#tree-ink'), { tree: INK, currency: 'ink', columns: INK_COLUMNS, onBuy: onBuyInk, advisor: G.advisor });
  G.fameTree = new TreeView($('#tree-fame'), { tree: FAME, currency: 'fame', columns: FAME_COLUMNS, onBuy: onBuyFame, advisor: G.advisor });
  G.advisor.onUpdate(() => { if (G.screen === 'tree') tutorialTree(); });
  G.inkEnd = new InkEnding($('#ink-end'));
  $('#to-tree').innerHTML = `${icon('binary-tree-2')}upgrades`;
  $('#to-tree').addEventListener('click', toTree);
  $('#gear').addEventListener('click', () => settingsDialog(G));
  $('#start').addEventListener('click', startRun);
  $('#publish').addEventListener('click', publishFlow);
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) setTab(b.dataset.tab); });
  bindInput();
  // the title screen first (#play in the address skips it, for tests)
  const fresh = !loaded || (G.state.drafts === 0 && G.state.publishes === 0);
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
      fame(n = 100) { G.state.fame += n; refreshTree(); },
      endRun() { if (G.run) finishRun(G.run); },
      bot(wpm = 55, err = 0.05) { G.bot = wpm ? { wpm, err, rng: mulberry32(wpm) } : null; },
      // with the pane hidden requestAnimationFrame barely runs: this plays `sec` seconds right away
      step(sec = 1) { for (let i = 0; i < Math.round(sec * 60); i++) tick(1 / 60); },
    };
  }
  G.last = performance.now();
  requestAnimationFrame(frame);
}

void fl;
boot();
