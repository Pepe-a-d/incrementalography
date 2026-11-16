// Draws a draft on a canvas: the page with its words, the typed letters, bugs, the line you wrote,
// and all the "juice": letters that pop as you type them (a different touch in each era), words that burst into
// letters and fly to your line, "+N" pops with overshoot, callouts ("Perfect", "Golden", "Chain ×5"),
// ink splashes, the In the Zone glow, the low-focus pulse and words that fall when the draft ends.

import { FW, LANES, CHAR_W, ILLUM_SCALE, faintness, live } from './run.js';
import { ERAS } from './data.js';

const HUD_H = 108; // px reserved for the HUD at the top
const PAGE_H = 64; // px for the written line at the bottom
const LANE_UNITS = 64;
const POP_T = 0.17; // seconds a typed letter pops
const UI_FONT = "Georgia, 'Times New Roman', serif";

const easeOutBack = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const easeOut = (k) => 1 - (1 - k) ** 3;

export class FieldRenderer {
  constructor(canvas, pageEl = null) {
    this.c = canvas;
    this.pageEl = pageEl; // the framed page (CSS): words live inside it
    this.ctx = canvas.getContext('2d');
    this.floats = [];
    this.letters = []; // letters of caught words, flying to your line
    this.sparks = []; // little particles (ink drops, glints)
    this.drops = []; // ink drops flying to the counter
    this.splashes = [];
    this.pops = new Map(); // word id → [{ i, t }]
    this.wfx = new Map(); // word id → { shake, flash, bug }
    this.banner = null;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.time = 0;
    this.endT = 0;
    this.era = 'scriptorium';
    this.hudTarget = null; // () => { x, y } of the ink counter
    this.resize();
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(320, r.width);
    this.H = Math.max(320, r.height);
    this.c.width = Math.round(this.W * dpr);
    this.c.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    // the page rectangle, inside its frame; without a page element, the whole screen under the HUD
    const p = this.pageEl ? this.pageEl.getBoundingClientRect() : null;
    if (p && p.width > 50) {
      this.px0 = p.left - r.left;
      this.pw = p.width;
      this.pageTop = p.top - r.top + 6;
      this.pageBottom = p.bottom - r.top - 4;
    } else if (!this.pw || !this.pageEl) {
      this.px0 = 0;
      this.pw = this.W;
      this.pageTop = HUD_H;
      this.pageBottom = this.H;
    }
    this.top = this.pageTop + 8;
    this.bottom = this.pageBottom - PAGE_H;
    this.laneH = (this.bottom - this.top) / LANES;
    this.sx = this.pw / FW;
    this.measure();
  }

  /** Font size so that an average character is CHAR_W logical units wide, whatever the era's font. */
  measure() {
    const e = ERAS[this.era];
    const ctx = this.ctx;
    ctx.font = `100px ${e.font}`;
    const sample = 'etaoinshrdlucmfwyp';
    const ratio = (ctx.measureText(sample).width || sample.length * 55) / sample.length / 100;
    const fit = Math.min(this.laneH * 0.6, (CHAR_W * this.sx) / ratio);
    this.fontPx = Math.max(12, Math.min(this.laneH * 0.75, fit * (this.wordScale || 1))); // × the player's word size
    this.font = e.font;
  }

  setRun(run, era) {
    this.run = run;
    this.era = era;
    this.theme = ERAS[era].page || ERAS[era].theme; // the colours of the page the words cross
    this.floats = [];
    this.letters = [];
    this.sparks = [];
    this.drops = [];
    this.splashes = [];
    this.pops.clear();
    this.wfx.clear();
    this.banner = null;
    this.endT = 0;
    this.zoneT = 0;
    this.measure();
  }

  wx(x) { return this.px0 + x * this.sx; }
  ly(lane) { return this.top + (lane + 0.5) * this.laneH; }

  showBanner(title, sub = '') { this.banner = { title, sub, t: 0 }; }

  /** A short word or two near the top (streak names, In the Zone…). */
  callout(text, color, scale = 1) {
    this.floats.push({ x: this.px0 + this.pw / 2, y: this.top + 30, text, color, scale: 1.5 * scale, t: 0, center: true, life: 1.3, font: this.font });
  }

  shake(amp, t) {
    this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, amp);
    this.shakeT = Math.max(this.shakeT, t);
  }

  /** Letter positions of a word, for bursts and sparks. */
  letterX(text, size, i) {
    const ctx = this.ctx;
    ctx.font = `${Math.round(size)}px ${this.font}`;
    return ctx.measureText(text.slice(0, i)).width;
  }

  onEvent(e, settings = {}) {
    const run = this.run;
    if (!run) return;
    const th = this.theme;
    if (e.type === 'key') {
      const w = run.words.find((x) => x.id === e.id);
      if (!w) return;
      let list = this.pops.get(e.id);
      if (!list) this.pops.set(e.id, (list = []));
      list.push({ i: e.i, t: 0 });
      const size = this.fontPx * (w.kind === 'illum' ? ILLUM_SCALE : 1);
      const x = this.wx(w.x) + this.letterX(w.text, size, e.i) + size * 0.25;
      const y = this.ly(w.lane);
      if (!settings.calm) this.keySpark(x, y, size);
    } else if (e.type === 'catch') {
      const size = this.fontPx * (e.kind === 'illum' ? ILLUM_SCALE : 1);
      const x = this.wx(e.x);
      const y = this.ly(e.lane) + size * 0.32;
      const color = e.gold ? th.gold : th.typed;
      // the word bursts into its letters, which then fly down to the end of your line
      const ctx = this.ctx;
      ctx.font = `${Math.round(size)}px ${this.font}`;
      const burst = e.gold || e.kind === 'illum' ? 1.6 : 1;
      for (let i = 0; i < (settings.calm ? 0 : e.text.length); i++) {
        if (e.text[i] === ' ') continue;
        const lx = x + ctx.measureText(e.text.slice(0, i)).width;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const sp = (60 + Math.random() * 90) * burst;
        this.letters.push({ ch: e.text[i], x: lx, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, vr: (Math.random() - 0.5) * 9, size, t: 0, delay: i * 0.012, color, word: e.id });
      }
      // "+N" with overshoot, bigger for bigger catches
      const big = e.gold || e.kind === 'illum' || e.chain >= 5;
      this.float(x + 6, y - size * 1.05, `+${e.text_amount}`, color, big ? 1.35 : 1.05);
      if (e.focus > 0.05) this.float(x + 6, y - size * 1.9, `+${e.focus.toFixed(1)} s`, th.muted, 0.75);
      // a word that says what just happened (only for the special ones)
      const label = e.nova ? 'Nova ×5' : e.carbon ? 'Carbon copy' : e.kind === 'illum' ? 'Illuminated!' : e.gold ? 'Golden!' : e.bugged ? 'Debugged!' : e.faint ? 'Faint ×' + run.st.faintMult : e.splash ? 'Splash!'
        : e.chain >= 3 ? `Chain ×${e.chain}` : e.perfect && e.long ? 'Perfect' : '';
      if (label) this.float(x + 6, y + size * 0.9, label, e.gold ? th.gold : e.chain >= 3 ? th.gold : th.typed, 0.95, true);
      const n = settings.calm ? 1 : e.gold ? 14 : e.kind === 'illum' ? 16 : 5;
      for (let i = 0; i < n; i++) this.drop(x + Math.random() * 30, y - size * 0.3, e.gold ? th.gold : color);
      if ((e.gold || e.kind === 'illum') && settings.shake) this.shake(5, 0.2);
      else if (e.chain >= 5 && settings.shake) this.shake(2.5, 0.1);
    } else if (e.type === 'error') {
      if (e.id !== null) this.wfx.set(e.id, { shake: 0.22, flash: 0.3 });
      else this.missFlash = 0.25;
    } else if (e.type === 'bug') {
      this.wfx.set(e.id, { shake: 0.15, flash: 0, bug: 0.6 });
    } else if (e.type === 'line') {
      this.float(this.px0 + 20, this.bottom - 10, `+${e.text_amount} line bonus`, th.typed, 1.3);
      if (settings.shake) this.shake(4, 0.15);
    } else if (e.type === 'splash') {
      this.splashes.push({ x0: this.wx(e.from.x), y0: this.ly(e.from.lane), x1: this.wx(e.to.x), y1: this.ly(e.to.lane), t: 0 });
    } else if (e.type === 'page') {
      this.callout('Full page ×2', th.gold, 1.05);
    } else if (e.type === 'zone') {
      this.zoneOn = true;
      this.callout('In the Zone', th.gold, 1.15);
    } else if (e.type === 'unzone') {
      this.zoneOn = false;
    }
  }

  /** Each era answers a keystroke its own way: ink drops, a typebar stamp, a glint, a ripple. */
  keySpark(x, y, size) {
    const th = this.theme;
    if (this.sparks.length > 260) return;
    if (this.era === 'scriptorium') {
      for (let i = 0; i < 2; i++) this.sparks.push({ x: x + (Math.random() - 0.5) * 6, y: y + size * 0.2, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 40, g: 260, r: 1.4 + Math.random() * 1.2, t: 0, life: 0.45, color: th.typed, kind: 'dot' });
    } else if (this.era === 'typewriter') {
      this.sparks.push({ x, y: y + size * 0.38, vx: 0, vy: 0, g: 0, r: size * 0.5, t: 0, life: 0.14, color: th.ink, kind: 'bar' });
    } else if (this.era === 'computer') {
      for (let i = 0; i < 2; i++) this.sparks.push({ x: x + (Math.random() - 0.5) * 10, y: y - size * 0.2 + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 50, g: 0, r: 2, t: 0, life: 0.3, color: th.typed, kind: 'sq' });
    } else {
      this.sparks.push({ x, y: y - size * 0.25, vx: 0, vy: 0, g: 0, r: size * 0.35, t: 0, life: 0.32, color: th.typed, kind: 'ring' });
    }
  }

  float(x, y, text, color, scale = 1, label = false) {
    if (this.floats.length > 40) this.floats.shift();
    this.floats.push({ x, y, text, color, scale, t: 0, life: label ? 0.9 : 1.1, font: label ? this.font : null, label });
  }

  drop(x, y, color) {
    if (this.drops.length > 300) return;
    const tgt = this.hudTarget ? this.hudTarget() : { x: this.W / 2, y: 30 };
    this.drops.push({ x, y, x0: x, y0: y, tx: tgt.x, ty: tgt.y, t: 0, d: 0.45 + Math.random() * 0.3, color, wob: (Math.random() - 0.5) * 120 });
  }

  draw(dt, settings = {}) {
    const ctx = this.ctx;
    const run = this.run;
    const th = this.theme;
    this.time += dt;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H); // the page and the scene behind are CSS
    let ox = 0;
    let oy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.min(1, this.shakeT * 8);
      ox = (Math.random() - 0.5) * 2 * a;
      oy = (Math.random() - 0.5) * 1.6 * a;
    }
    if (run && run.ended) this.endT += dt;
    ctx.save();
    ctx.translate(ox, oy);
    this.drawPaper();
    if (run) {
      // words, bugs and splashes stay inside the page
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.px0 - 6, this.pageTop, this.pw + 12, this.pageBottom - this.pageTop);
      ctx.clip();
      this.drawWords(dt);
      this.drawBugs();
      this.drawSplashes(dt);
      ctx.restore();
      this.drawPage(dt);
      this.drawLine(dt);
    }
    this.drawSparks(dt);
    this.drawFloats(dt);
    this.drawDrops(dt);
    ctx.restore();
    if (run) this.drawVignettes(dt);
    this.drawBanner(dt);
    if (this.missFlash > 0) {
      this.missFlash -= dt;
      ctx.globalAlpha = Math.max(0, this.missFlash) * 0.35;
      ctx.fillStyle = th.bug;
      ctx.fillRect(this.px0, this.bottom + 2, this.pw, 3);
      ctx.globalAlpha = 1;
    }
  }

  drawPaper() {
    const ctx = this.ctx;
    const th = this.theme;
    const era = this.era;
    const x0 = this.px0;
    const x1 = this.px0 + this.pw;
    ctx.globalAlpha = 1;
    if (era === 'scriptorium' || era === 'typewriter') {
      // ruled lines under each lane
      ctx.fillStyle = th.line;
      ctx.globalAlpha = 0.8;
      for (let l = 0; l < LANES; l++) ctx.fillRect(x0, Math.round(this.ly(l) + this.fontPx * 0.42), this.pw, 1);
      ctx.globalAlpha = 1;
    }
    const mx = Math.round(x0 + this.pw * 0.04);
    if (era === 'scriptorium') {
      // the rubric: a double red margin, as in a manuscript
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(mx, this.pageTop + 6, 1, this.pageBottom - this.pageTop - 12);
      ctx.fillRect(mx + 4, this.pageTop + 6, 1, this.pageBottom - this.pageTop - 12);
      ctx.globalAlpha = 1;
    } else if (era === 'typewriter') {
      ctx.fillStyle = th.line;
      ctx.fillRect(mx, this.pageTop + 6, 1, this.pageBottom - this.pageTop - 12);
      // the carriage on its rail (CSS draws the rail): it travels along the line until the bell
      const run = this.run;
      if (run && run.st.line) {
        const k = run.line.bell > 0 ? 1 : Math.min(1, run.line.count / run.st.lineWords);
        this.carriage = (this.carriage ?? k) + (k - (this.carriage ?? k)) * 0.2;
        const cx = x0 + 10 + (this.pw - 50) * this.carriage;
        ctx.fillStyle = '#B9BEC2';
        ctx.fillRect(Math.round(cx), this.pageTop - 18, 30, 12);
        ctx.fillStyle = '#6E7377';
        ctx.fillRect(Math.round(cx + 13), this.pageTop - 6, 4, 6);
      }
    } else if (era === 'computer') {
      // a faint line number gutter, like an editor
      ctx.fillStyle = th.faint;
      ctx.font = `12px ${this.font}`;
      ctx.textBaseline = 'middle';
      for (let l = 0; l < LANES; l++) ctx.fillText(String(l + 1).padStart(2, '0'), x0 + 4, this.ly(l));
    }
    void x1;
  }

  wordColor(w) {
    const th = this.theme;
    if (w.gold) return th.gold;
    if (w.kind === 'illum') return th.ink;
    return w.theme ? th.ink : th.word;
  }

  drawWords(dt) {
    const ctx = this.ctx;
    const run = this.run;
    const th = this.theme;
    const st = run.st;
    ctx.textBaseline = 'alphabetic';
    for (const [id, f] of this.wfx) {
      f.shake -= dt;
      f.flash -= dt;
      if (f.bug !== undefined) f.bug -= dt;
      if (f.shake <= 0 && f.flash <= 0 && !(f.bug > 0)) this.wfx.delete(id);
    }
    for (const [id, list] of this.pops) {
      for (const p of list) p.t += dt;
      const keep = list.filter((p) => p.t < POP_T);
      if (keep.length) this.pops.set(id, keep); else this.pops.delete(id);
    }
    // when the draft ends, the page lets go: words drop and fade
    const fall = run.ended ? this.endT : 0;
    for (const w of run.words) {
      if (!live(w)) continue;
      const size = this.fontPx * (w.kind === 'illum' ? ILLUM_SCALE : 1);
      // era words in italics, golden words in bold: no colour, like a printed page
      const fontStr = `${w.theme && !w.gold ? 'italic ' : ''}${w.gold ? 700 : 400} ${Math.round(size)}px ${this.font}`;
      ctx.font = fontStr;
      let x = this.wx(w.x);
      let y = this.ly(w.lane) + size * 0.32;
      if (fall) y += 420 * fall * fall * (0.6 + ((w.id * 37) % 10) / 20);
      const fx = this.wfx.get(w.id);
      if (fx && fx.shake > 0) x += Math.sin(fx.shake * 70) * 4;
      const right = this.wx(w.x + w.w) - this.px0;
      let alpha = Math.max(0, Math.min(1, right / (this.pw * 0.12)));
      if (st.faint) {
        const f = faintness(run, w);
        alpha *= Math.min(1, 1 - f * (0.82 - st.faintClarity));
      }
      if (run.ended) alpha *= Math.max(0, 0.6 - fall);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      const isTarget = run.target === w.id;
      const text = w.text;
      const widths = [0];
      for (let i = 1; i <= text.length; i++) widths.push(ctx.measureText(text.slice(0, i)).width);
      const total = widths[text.length];
      if (w.gold) {
        ctx.fillStyle = th.muted;
        ctx.fillText('*', x - size * 0.45, y);
      }
      const base = this.wordColor(w);
      const hidden = st.blackout && w.typed > 0;
      const pops = this.pops.get(w.id);
      for (let i = 0; i < text.length; i++) {
        const cx = x + widths[i];
        let color = base;
        if (isTarget) color = i < w.typed ? th.ink : th.muted; // what's left to type goes grey
        ctx.fillStyle = color;
        if (w.bugged && i === w.bugIdx && !(hidden && i >= w.typed)) {
          // a bug: the letter shows inverted, like a misprint
          ctx.fillRect(cx - 1, y - size * 0.78, widths[i + 1] - widths[i] + 2, size * 0.98);
          ctx.fillStyle = th.bg;
        }
        if (hidden && i >= w.typed) {
          ctx.fillRect(cx + 1, y - 2, Math.max(2, widths[i + 1] - widths[i] - 3), 2);
          continue;
        }
        if (text[i] === ' ') continue;
        const p = pops && pops.find((q) => q.i === i);
        if (p) {
          // the letter you just typed pops: bigger and lifted, or stamped down on a typewriter
          const k = p.t / POP_T;
          const amt = (1 - k) * (1 - k);
          const cw = widths[i + 1] - widths[i];
          const sc = 1 + (this.era === 'typewriter' ? 0.12 : 0.5) * amt;
          const dy = this.era === 'typewriter' ? 3 * amt : -6 * amt;
          ctx.save();
          ctx.translate(cx + cw / 2, y + dy);
          ctx.scale(sc, sc);
          ctx.fillText(text[i], -cw / 2, 0);
          ctx.restore();
        } else {
          ctx.fillText(text[i], cx, y);
        }
      }
      if (w.kind === 'illum') {
        // the gold frame around the first letter, like an illuminated capital
        ctx.strokeStyle = th.gold;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 4, y - size * 0.9, widths[1] + 8, size * 1.12);
      }
      if (isTarget && w.typed > 0) {
        // what you have typed is underlined
        ctx.fillStyle = th.ink;
        ctx.fillRect(x, y + size * 0.16, widths[w.typed], 1.5);
      }
      if (isTarget) {
        const i = w.typed;
        const blink = (Math.sin(this.time * 9) + 1) / 2;
        ctx.globalAlpha = alpha * (0.45 + 0.55 * blink);
        ctx.fillStyle = th.ink;
        ctx.fillRect(x + widths[i], y + size * 0.16, Math.max(6, widths[i + 1] - widths[i]), 1.5);
        if (fx && fx.flash > 0) {
          ctx.globalAlpha = Math.min(1, fx.flash * 4) * 0.18;
          ctx.fillStyle = th.ink;
          ctx.fillRect(x + widths[i] - 1, y - size * 0.82, Math.max(6, widths[i + 1] - widths[i]) + 2, size * 1.05);
        }
      }
      if (run.tutMark && !run.ended) {
        // the guided first draft: the key to press next sits in a blinking box
        // (the first letter of every word while you aim; the next letter of the word you are typing)
        const m = isTarget ? w.typed : run.target === null ? 0 : -1;
        if (m >= 0 && m < text.length) {
          const blink = (Math.sin(this.time * 6) + 1) / 2;
          const cw = widths[m + 1] - widths[m];
          const bw = Math.max(cw + 10, size * 0.6); // as wide as a key, even around a thin letter
          const bx = x + widths[m] + cw / 2 - bw / 2;
          ctx.globalAlpha = alpha * (0.35 + 0.65 * blink);
          ctx.strokeStyle = th.ink;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx, y - size * 0.86, bw, size * 1.14, 5);
          else ctx.rect(bx, y - size * 0.86, bw, size * 1.14);
          ctx.stroke();
        }
      }
      if (fx && fx.bug > 0) {
        ctx.globalAlpha = fx.bug;
        ctx.strokeStyle = th.bug;
        ctx.lineWidth = 1;
        const bx = x + widths[w.bugIdx] + (widths[w.bugIdx + 1] - widths[w.bugIdx]) / 2;
        ctx.beginPath();
        ctx.arc(bx, y - size * 0.35, size * (0.9 - fx.bug * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawBugs() {
    const ctx = this.ctx;
    const run = this.run;
    if (!run.bugs.length || run.ended) return;
    ctx.fillStyle = this.theme.bug;
    ctx.strokeStyle = this.theme.bug;
    ctx.lineWidth = 1;
    for (const b of run.bugs) {
      const x = this.wx(b.x);
      const y = this.top + (b.y / LANE_UNITS + 0.5) * this.laneH;
      const wig = Math.sin(this.time * 30 + b.id) * 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(x - 3, y); ctx.lineTo(x - 5, y + s * (5 + wig));
        ctx.moveTo(x, y); ctx.lineTo(x, y + s * (5 - wig));
        ctx.moveTo(x + 3, y); ctx.lineTo(x + 5, y + s * (5 + wig));
      }
      ctx.stroke();
    }
  }

  /** Ink Splash: an arc of ink from the caught word to the one it splashes. */
  drawSplashes(dt) {
    const ctx = this.ctx;
    for (const s of this.splashes) {
      s.t += dt / 0.35;
      const k = Math.min(1, s.t);
      ctx.strokeStyle = this.theme.typed;
      ctx.lineWidth = 3 * (1 - k * 0.6);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      const mx = (s.x0 + s.x1) / 2;
      const my = Math.min(s.y0, s.y1) - 50;
      ctx.moveTo(s.x0, s.y0);
      ctx.quadraticCurveTo(mx, my, s.x0 + (s.x1 - s.x0) * easeOut(k), s.y0 + (s.y1 - s.y0) * easeOut(k));
      ctx.stroke();
      if (k > 0.85 && !s.blob) {
        s.blob = true;
        for (let i = 0; i < 8; i++) this.sparks.push({ x: s.x1, y: s.y1, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, g: 380, r: 2 + Math.random() * 2, t: 0, life: 0.5, color: this.theme.typed, kind: 'dot' });
      }
    }
    ctx.globalAlpha = 1;
    this.splashes = this.splashes.filter((s) => s.t < 1);
  }

  /** The line you're writing, at the bottom: caught words land at its end, letter by letter. */
  drawPage(dt) {
    const ctx = this.ctx;
    const th = this.theme;
    const run = this.run;
    const y = this.bottom + PAGE_H * 0.58;
    ctx.fillStyle = th.line;
    ctx.fillRect(this.px0, this.bottom, this.pw, 1);
    const flyingWords = new Set(this.letters.map((l) => l.word)).size;
    const words = run.page.slice(0, Math.max(0, run.page.length - Math.min(flyingWords, 3)));
    const size = 17;
    ctx.font = `${this.era === 'scriptorium' ? 'italic ' : ''}${size}px ${this.font}`;
    const text = words.join(' ');
    const w = ctx.measureText(text).width;
    const endX = this.px0 + this.pw - 16;
    ctx.textBaseline = 'alphabetic';
    ctx.save();
    ctx.beginPath();
    const left = this.px0 + (run.st.line ? this.lineBoxW() : 0); // the typewriter's line counter sits on the left
    ctx.rect(left, this.bottom + 2, endX + 8 - left, PAGE_H - 4);
    ctx.clip();
    ctx.fillStyle = th.muted;
    ctx.fillText(text, endX - w, y);
    ctx.restore();
    if (this.era === 'computer') {
      // the line you are writing is a prompt, with its block cursor
      ctx.fillStyle = th.ink;
      ctx.fillText('>', this.px0 + 4, y);
      if (Math.floor(this.time * 2) % 2 === 0) ctx.fillRect(endX + 2, y - size * 0.8, size * 0.55, size);
    }
    // letters of caught words: a short burst upwards, then they fly down to the end of the line
    for (const l of this.letters) {
      l.t += dt;
      const tt = l.t - l.delay;
      if (tt < 0) { this.drawLetter(l, l.x, l.y, 1, l.size, 0); continue; }
      if (tt < 0.16) {
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.vy += 300 * dt;
        l.rot += l.vr * dt;
        l.hx = l.x; l.hy = l.y;
        this.drawLetter(l, l.x, l.y, 1, l.size * (1 + 0.25 * Math.sin((tt / 0.16) * Math.PI)), l.rot);
      } else {
        const k = Math.min(1, (tt - 0.16) / 0.36);
        const e = k * k;
        const x = l.hx + (endX - 8 - l.hx) * e;
        const yy = l.hy + (y - l.hy) * e;
        this.drawLetter(l, x, yy, 1 - k * 0.6, l.size * (1 - e) + size * e, l.rot * (1 - e));
        if (k >= 1) l.done = true;
      }
    }
    this.letters = this.letters.filter((l) => !l.done);
  }

  drawLetter(l, x, y, a, size, rot) {
    const ctx = this.ctx;
    ctx.globalAlpha = a;
    ctx.fillStyle = l.color;
    ctx.font = `${Math.round(size)}px ${this.font}`;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.fillText(l.ch, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  lineBoxW() { return this.run.st.lineWords * 12 + 120; }

  /** Typewriter: on the left of the written line, a dot per word of this line and, when the bell rings, the Enter prompt. */
  drawLine() {
    const run = this.run;
    const st = run.st;
    if (!st.line) return;
    const ctx = this.ctx;
    const th = this.theme;
    const y = this.bottom + PAGE_H * 0.5;
    const x0 = this.px0 + 10;
    for (let i = 0; i < st.lineWords; i++) {
      ctx.fillStyle = i < run.line.count ? th.typed : th.line;
      ctx.beginPath();
      ctx.arc(x0 + i * 12, y, i < run.line.count ? 4 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const tx = x0 + st.lineWords * 12 + 8;
    if (run.line.bell > 0) {
      const k = run.line.bell / st.lineWindow;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.time * 14);
      ctx.fillStyle = th.typed;
      ctx.font = `500 18px ${this.font}`;
      ctx.textBaseline = 'middle';
      ctx.fillText('↵ Enter', tx, y - 3);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
      ctx.fillRect(tx, y + 10, 84 * k, 2);
    }
  }

  drawSparks(dt) {
    const ctx = this.ctx;
    for (const p of this.sparks) {
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.t / p.life;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.kind === 'dot') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'sq') {
        ctx.fillRect(p.x, p.y, p.r, p.r);
      } else if (p.kind === 'bar') {
        // the typebar strike: a short dark smudge under the letter
        ctx.globalAlpha = 0.35 * (1 - k);
        ctx.fillRect(p.x - p.r * 0.5, p.y, p.r, 2);
      } else {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.6 + k * 1.2), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    this.sparks = this.sparks.filter((p) => p.t < p.life);
  }

  drawFloats(dt) {
    const ctx = this.ctx;
    ctx.textBaseline = 'alphabetic';
    for (const f of this.floats) {
      f.t += dt;
      const k = f.t / f.life;
      // pop in with an overshoot, hold, then drift up and fade
      const pop = f.t < 0.2 ? easeOutBack(f.t / 0.2) : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t / 0.05) * (1 - Math.max(0, (k - 0.55) / 0.45)));
      ctx.fillStyle = f.color;
      const size = Math.round(14 * f.scale * Math.max(0.2, pop));
      ctx.font = f.font ? `500 ${size + 2}px ${f.font}` : `500 ${size}px ${UI_FONT}`;
      ctx.textAlign = f.center ? 'center' : 'left';
      ctx.fillText(f.text, f.x, f.y - k * (f.center ? 10 : 26));
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
    this.floats = this.floats.filter((f) => f.t < f.life);
  }

  drawDrops(dt) {
    const ctx = this.ctx;
    for (const d of this.drops) {
      d.t += dt;
      const k = Math.min(1, d.t / d.d);
      const e = k * k;
      d.x = d.x0 + (d.tx - d.x0) * e + Math.sin(k * Math.PI) * d.wob;
      d.y = d.y0 + (d.ty - d.y0) * e;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.4 * (1 - e * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.drops = this.drops.filter((d) => d.t < d.d);
  }

  /** Edges of the page: a gold glow In the Zone, a red pulse when focus is low. */
  drawVignettes(dt) {
    const run = this.run;
    const ctx = this.ctx;
    const th = this.theme;
    this.zoneT = Math.max(0, Math.min(1, (this.zoneT || 0) + (run.zone && !run.ended ? dt * 3 : -dt * 3)));
    const low = !run.ended && run.focus / run.focusMax < 0.25;
    this.lowT = Math.max(0, Math.min(1, (this.lowT || 0) + (low ? dt * 3 : -dt * 3)));
    const edge = (color, a) => {
      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      const w = 18;
      const L = this.px0 - 6;
      const R = this.px0 + this.pw + 6;
      const T = this.pageTop;
      const Hh = this.pageBottom - this.pageTop;
      for (const [x, y, ww, hh, x0, y0, x1, y1] of [
        [L, T, w, Hh, L, 0, L + w, 0], [R - w, T, w, Hh, R, 0, R - w, 0],
      ]) {
        const gr = ctx.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, color);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x, y, ww, hh);
      }
      ctx.globalAlpha = 1;
    };
    edge(th.ink, this.zoneT * (0.1 + 0.05 * Math.sin(this.time * 4)));
    edge(th.ink, this.lowT * (0.06 + 0.14 * Math.max(0, Math.sin(this.time * 8.4))));
  }

  drawBanner(dt) {
    const b = this.banner;
    if (!b) return;
    b.t += dt;
    const ctx = this.ctx;
    const th = this.theme;
    const k = b.t;
    const a = k < 0.25 ? k / 0.25 : k > 2.1 ? Math.max(0, 1 - (k - 2.1) / 0.5) : 1;
    if (k > 2.6) { this.banner = null; return; }
    const pop = k < 0.3 ? easeOutBack(k / 0.3) : 1;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = th.ink;
    ctx.font = `500 ${Math.round(Math.min(56, this.pw / 16) * pop)}px ${this.font}`;
    const y = this.top + (this.bottom - this.top) * 0.42;
    const cx = this.px0 + this.pw / 2;
    ctx.fillText(b.title, cx, y);
    if (b.sub) {
      ctx.fillStyle = th.typed;
      ctx.font = `500 16px ${UI_FONT}`;
      ctx.fillText(b.sub, cx, y + 30);
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}
