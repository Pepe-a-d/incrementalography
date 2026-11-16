// Upgrades as columns that fill with ink. The root upgrade is the inkwell at the bottom; each column is a tube that
// rises from it, with its upgrades stacked bottom to top. Buying one fills the tube with ink up to it; while you save
// for the next one, the ink climbs towards it. Each column has one shape (circle ink, square focus, diamond streak,
// octagon eras, pentagon fame), so a glance tells them apart. The next upgrade of a column is shown
// in full; the ones above it are only outlines until you get there. A column that hasn't opened yet is a dashed '?'.
// Works for both trees: new TreeView(root, { tree: INK | FAME, currency, columns, onBuy, advisor }).

import { COLUMNS } from './data.js';
import { fmt } from './format.js';
import { fmtGain } from './advisor.js';
import { icon, ICONS } from './icons.js';

const ROW = 118; // px between upgrades in a column
const COL_W = 150; // px per column
const ERA_NAME = { scriptorium: 'the Scriptorium', typewriter: 'the Typewriter era', computer: 'the Computer era', future: 'the Future era' };

// shapes in a 48×48 box
export const SHAPE_PATH = {
  circle: 'M24 3A21 21 0 1 1 23.99 3Z',
  square: 'M11 4H37A7 7 0 0 1 44 11V37A7 7 0 0 1 37 44H11A7 7 0 0 1 4 37V11A7 7 0 0 1 11 4Z',
  diamond: 'M24 1.5L46.5 24L24 46.5L1.5 24Z',
  hex: 'M13.5 4.5H34.5L45.5 24L34.5 43.5H13.5L2.5 24Z',
  octagon: 'M16 3H32L45 16V32L32 45H16L3 32V16Z',
  pentagon: 'M24 2.5L45.5 18L37.5 44.5H10.5L2.5 18Z',
};

/** A small shape as inline SVG (column names, card). */
export const shapeIcon = (shape, cls = 'shp-mini') => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><path d="${SHAPE_PATH[shape]}"/></svg>`;

const shapeSVG = (shape, iconName) => `<svg class="shp" viewBox="0 0 48 48" aria-hidden="true">
  <path class="sh-bg" d="${SHAPE_PATH[shape]}"/>
  <path class="sh-line" d="${SHAPE_PATH[shape]}"/>
  <path class="sh-inner" d="${SHAPE_PATH[shape]}" transform="translate(24 24) scale(.8) translate(-24 -24)"/>
  <g class="sh-ic" transform="translate(12 12)" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[iconName] || ''}</g>
  <text class="sh-q" x="24" y="31" text-anchor="middle">?</text>
</svg>`;

export class TreeView {
  constructor(root, { tree, currency, columns, onBuy, advisor }) {
    this.root = root;
    this.tree = tree;
    this.currency = currency; // 'ink' | 'fame'
    this.onBuy = onBuy;
    this.advisor = advisor;
    this.hover = null;
    this.selected = null;
    this.items = new Map();
    this.cols = new Map();
    this.first = true;

    this.board = document.createElement('div');
    this.board.className = 'cols-board';
    root.append(this.board);
    this.colsEl = document.createElement('div');
    this.colsEl.className = 'cols';
    this.board.append(this.colsEl);

    // the inkwell: the root upgrade, under every column
    this.rootNode = tree.nodes.find((n) => !n.req.length);
    this.well = document.createElement('div');
    this.well.className = 'well';
    this.board.append(this.well);
    this.addNode(this.rootNode, this.well, null);

    for (const id of columns) {
      const nodes = tree.nodes.filter((n) => n.branch === id).sort((a, b) => a.row - b.row);
      const c = document.createElement('div');
      c.className = 'col';
      c.style.width = `${COL_W}px`;
      const h = nodes.length * ROW;
      c.innerHTML = `<div class="col-head">${shapeIcon(COLUMNS[id].shape)}<span class="col-name"></span><span class="col-n"></span></div>
        <div class="col-body" style="height:${h}px"><div class="tube"><i class="tube-rise"></i><i class="tube-ink"></i></div></div>`;
      this.colsEl.append(c);
      const body = c.querySelector('.col-body');
      this.cols.set(id, { id, el: c, body, nodes, h, name: c.querySelector('.col-name'), count: c.querySelector('.col-n'), ink: c.querySelector('.tube-ink'), rise: c.querySelector('.tube-rise'), key: '' });
      for (const n of nodes) this.addNode(n, body, h);
    }

    this.card = document.createElement('div');
    this.card.className = 'node-card box';
    this.card.hidden = true;
    root.append(this.card);
    new ResizeObserver(() => this.fit()).observe(root);
    if (advisor) advisor.onUpdate(() => { if (this.state) { this.paintAdvice(); this.card._key = null; this.renderCard(); } });
  }

  addNode(n, parent, h) {
    const shape = n.req.length ? COLUMNS[n.branch].shape : 'circle';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'node';
    if (h !== null) b.style.top = `${h - (n.row + 0.5) * ROW}px`;
    b.innerHTML = `<span class="nb">${shapeSVG(shape, n.icon)}</span><span class="lbl"><b class="nm"></b><i class="ef"></i></span><span class="badge" hidden></span>`;
    b.setAttribute('aria-label', n.name);
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { this.hover = n.id; this.renderCard(); } });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { this.hover = null; this.renderCard(); } });
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) { this.selected = n.id; this.renderCard(); } });
    b.addEventListener('blur', () => { if (this.selected === n.id) { this.selected = null; this.renderCard(); } });
    b.addEventListener('click', () => this.onBuy(n.id, b));
    parent.append(b);
    this.items.set(n.id, { n, b, shape, nm: b.querySelector('.nm'), ef: b.querySelector('.ef'), badge: b.querySelector('.badge'), key: '' });
  }

  /** Scales the board to the window: down when it does not fit, up (to 135 %) when there is room. */
  fit() {
    const r = this.root.getBoundingClientRect();
    if (!r.width) return;
    this.board.style.transform = 'none';
    const w = this.board.scrollWidth;
    const h = this.board.scrollHeight;
    const k = Math.min(1.35, (r.width - 40) / w, (r.height - 84 - 16) / h); // 84: the new draft button under it; a little bigger when there is room
    this.board.style.transform = `scale(${k.toFixed(3)})`;
  }

  center() { this.fit(); }

  /** Repaints the columns; cheap if nothing changed. */
  update(s) {
    const T = this.tree;
    const wallet = T.wallet(s);
    const rootOwned = T.lvl(s, this.rootNode.id) > 0;
    this.paintNode(s, this.items.get(this.rootNode.id), 'full');
    this.well.classList.toggle('full', rootOwned);
    for (const c of this.cols.values()) {
      const first = c.nodes[0];
      const blocked = T.blocked(s, first);
      const open = T.visible(s, first);
      const waiting = !blocked && !open && rootOwned; // shows as a dashed '?' column
      c.el.hidden = blocked || (!open && !waiting);
      if (c.el.hidden) continue;
      const owned = c.nodes.filter((n) => T.lvl(s, n.id) > 0).length;
      const key = `${open}|${owned}`;
      if (key !== c.key) {
        const wasClosed = c.key === '' || c.key.startsWith('false');
        c.key = key;
        c.el.classList.toggle('waiting', !open);
        c.name.textContent = open ? COLUMNS[c.id].name : '?';
        c.count.textContent = open ? `${owned}/${c.nodes.length}` : '';
        if (!this.first && open && wasClosed) { c.el.classList.remove('reveal'); void c.el.offsetWidth; c.el.classList.add('reveal'); }
      }
      // ink up to the highest upgrade you own; above it, ink climbing towards the next one as you save
      const top = owned ? (owned - 0.5) * ROW : 0;
      const next = c.nodes[owned];
      const frac = open && next && T.visible(s, next) ? Math.min(1, wallet / Math.max(1, T.cost(s, next))) : 0;
      const toNext = owned ? ROW : ROW * 0.5;
      const well = rootOwned ? 14 : 0; // the bit of tube between the column and the inkwell
      c.ink.style.height = `${top + well}px`;
      c.rise.style.height = `${top + well + toNext * frac}px`;
      c.nodes.forEach((n, i) => {
        let mode = 'full';
        if (!open) mode = i === 0 ? 'q' : 'hide';
        else if (i > owned) mode = 'ghost'; // further up: just an outline until you get there
        this.paintNode(s, this.items.get(n.id), mode);
      });
    }
    this.first = false;
    this.state = s;
    this.fit();
    this.paintAdvice();
    this.renderCard();
  }

  /** One upgrade: mode 'full' (shown), 'ghost' (outline only), 'q' (a '?'), 'hide'. */
  paintNode(s, it, mode) {
    const T = this.tree;
    const { n, b } = it;
    const l = T.lvl(s, n.id);
    const st = l ? 'own' : T.status(s, n);
    const key = `${mode}|${st}`;
    if (key === it.key) return;
    const wasHidden = it.key === '' || it.key.startsWith('hide') || it.key.startsWith('ghost') || it.key.startsWith('q');
    it.key = key;
    const big = n.keystone || n.id.startsWith('master_') || !n.req.length;
    b.hidden = mode === 'hide';
    b.className = `node s-${st}${mode === 'ghost' ? ' ghost' : ''}${mode === 'q' ? ' teaser' : ''}${big ? ' key' : ''}`;
    it.nm.textContent = mode === 'q' ? '' : n.name;
    it.ef.textContent = mode === 'full' ? n.short : '';
    b.tabIndex = mode === 'full' ? 0 : -1;
    if (!this.first && wasHidden && mode === 'full') { b.classList.remove('reveal'); void b.offsetWidth; b.classList.add('reveal'); }
  }

  /** The best buy, from the advisor: marked in italics above it. */
  paintAdvice() {
    const best = this.advisor && this.currency === 'ink' ? this.advisor.best : null;
    for (const it of this.items.values()) {
      const on = it.n.id === best && !it.b.hidden && !it.b.classList.contains('ghost');
      it.badge.hidden = !on;
      it.b.classList.toggle('best', on);
      if (on) { it.badge.textContent = `best buy · ${fmtGain(this.advisor.get(it.n.id).gain)}`; it.badge.title = 'The most ink per draft for its price'; }
    }
  }

  /** A pop and a ring when you buy; a shake if you can't. */
  flash(id, ok, text = '', big = false) {
    const it = this.items.get(id);
    if (!it) return;
    it.b.classList.remove('bought', 'nope');
    void it.b.offsetWidth;
    it.b.classList.add(ok ? 'bought' : 'nope');
    if (!ok) return;
    const burst = document.createElement('div');
    burst.className = `burst${big ? ' big' : ''}`;
    burst.innerHTML = `<span class="bring"></span>${text ? '<b class="ftxt"></b>' : ''}`;
    if (text) burst.querySelector('.ftxt').textContent = text;
    it.b.append(burst);
    setTimeout(() => burst.remove(), 1500);
  }

  renderCard() {
    const s = this.state;
    const T = this.tree;
    const id = this.hover || this.selected;
    if (!s || !id) { this.card.hidden = true; return; }
    const n = T.byId[id];
    const it = this.items.get(id);
    if (it.b.hidden) { this.card.hidden = true; return; }
    const l = T.lvl(s, n.id);
    const cost = T.cost(s, n);
    const wallet = T.wallet(s);
    const teaser = it.b.classList.contains('teaser');
    const ghost = it.b.classList.contains('ghost');
    const adv = this.advisor ? this.advisor.get(n.id) : null;
    const best = this.advisor ? this.advisor.best : null;
    const key = `${id}|${l}|${teaser}|${ghost}|${Math.floor(wallet)}|${adv ? adv.gain.toFixed(4) : ''}|${best}`;
    if (this.card._key === key && !this.card.hidden) return;
    this.card._key = key;
    this.card.hidden = false;
    const colName = n.req.length ? COLUMNS[n.branch].name : 'the inkwell';
    if (teaser) {
      const wait = T.waiting(s, n);
      this.card.innerHTML = '<span class="legend">? · a new column</span><p class="nc-missing"></p>';
      this.card.querySelector('.nc-missing').textContent = wait ? `it opens after ${wait} more upgrade${wait === 1 ? '' : 's'}.` : 'it opens soon.';
      return;
    }
    const cur = icon(this.currency === 'fame' ? 'star' : 'droplet', 'ic cur');
    let impact = '';
    if (!l && !ghost) {
      if (adv && adv.text) impact = `<p class="nc-impact flat">${adv.text}</p>`;
      else if (adv) impact = `<p class="nc-impact${adv.gain >= 0.005 ? '' : ' flat'}"><b>${fmtGain(adv.gain)}</b> ink per draft, typing like you${best === n.id ? ' — <i>the best buy</i>' : ''}.</p>`;
      else if (this.advisor && this.currency === 'ink') impact = '<p class="nc-impact flat">working out what it does for you…</p>';
    }
    const master = n.id.startsWith('master_');
    const era = n.era && !master ? `<p class="nc-era">works only in ${ERA_NAME[n.era]}.</p>` : '';
    if (n.era && !master && n.era !== s.era) impact = '';
    const below = n.req.length ? T.byId[n.req[0]] : null;
    const missing = T.missing(s, n);
    const need = ghost && below ? `first: ${below.name.toLowerCase()}.` : missing.length ? `first: ${missing.join(', ').toLowerCase()}.` : '';
    this.card.innerHTML = `
      <span class="legend"></span>
      <p class="nc-short">${shapeIcon(it.shape, 'shp-mini big')}<span></span></p>
      <p class="nc-desc"></p>
      ${era}
      ${impact}
      ${need ? '<p class="nc-missing"></p>' : ''}
      <div class="nc-foot">${l ? '<span class="nc-done">bought</span>' : `<span class="nc-cost ${wallet >= cost ? '' : 'poor'}">${cur}${fmt(cost)}</span>${ghost ? '' : wallet < cost ? `<span class="nc-left">${fmt(cost - wallet)} to go</span>` : '<span class="nc-left">click to buy</span>'}`}</div>`;
    this.card.querySelector('.legend').textContent = `${n.name} · ${colName}${n.keystone ? ' keystone' : master ? ' masterwork' : ''}`;
    this.card.querySelector('.nc-short span').textContent = n.short;
    this.card.querySelector('.nc-desc').textContent = n.desc;
    const miss = this.card.querySelector('.nc-missing');
    if (miss) miss.textContent = need;
  }
}
