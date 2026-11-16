// Draws a boss fight (boss.js) on its canvas: each era's book has its own scene. The HUD around it (the boss's name,
// the pages left, your resource bar) is HTML, drawn by main.js with the era's CSS (the candle, the ribbon…).

import { ERAS } from './data.js';
import { FW, FH, FILE_NAMES, fileX, ECHO_SHOW } from './boss.js';

export class BossView {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.b = null;
    this.time = 0;
    this.fx = []; // short effects: { kind, t, life, ... }
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(320, r.width);
    this.H = Math.max(320, r.height);
    this.c.width = Math.round(this.W * dpr);
    this.c.height = Math.round(this.H * dpr);
    this.dpr = dpr;
  }

  set(b) {
    this.b = b;
    this.era = b.era;
    this.theme = ERAS[b.era].page || ERAS[b.era].theme;
    this.font = ERAS[b.era].font;
    this.fx = [];
    this.shakeT = 0;
    this.written = []; // finished lines, rising away
    this.light = 1;
    this.resize();
  }

  onEvent(e, settings = {}) {
    if (e.type === 'error') { this.shakeT = settings.shake === false ? 0 : 0.18; this.fx.push({ kind: 'err', t: 0, life: 0.3 }); }
    else if (e.type === 'restart') this.fx.push({ kind: 'restart', t: 0, life: 0.5 });
    else if (e.type === 'hit') { this.written.push({ text: e.text, t: 0 }); if (this.written.length > 4) this.written.shift(); this.fx.push({ kind: 'hit', t: 0, life: 0.6 }); }
    else if (e.type === 'line' || e.type === 'strike' || e.type === 'torn') this.feed = 1; // the paper moves up a line
    else if (e.type === 'jam') this.fx.push({ kind: 'jam', t: 0, life: 0.9 });
    else if (e.type === 'break') this.fx.push({ kind: 'break', t: 0, life: 0.6, x: e.x, y: e.y, bits: Array.from({ length: 10 }, () => ({ vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.7) * 200 })) });
    else if (e.type === 'eat') this.fx.push({ kind: 'eat', t: 0, life: 1.4, file: e.file });
    else if (e.type === 'echo') this.fx.push({ kind: 'echo', t: 0, life: 1.1, text: e.text });
  }

  draw(dt) {
    const ctx = this.ctx;
    this.time += dt;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (!this.b) return;
    let ox = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; ox = (Math.random() - 0.5) * 8; }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const w of this.written) w.t += dt;
    ctx.save();
    ctx.translate(ox, 0);
    (SCENES[this.era] || SCENES.scriptorium).call(this, ctx, dt);
    ctx.restore();
  }

  /** A line of text, letter by letter: typed in ink, the rest muted (or hidden), with the next letter marked. */
  line(ctx, text, x, y, size, { typed = 0, shown = text.length, hide = 0, ink, muted, mark, font, illum = 0, gold }) {
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const w = ctx.measureText(ch).width;
      if (i < shown) {
        const isIllum = i < illum && i >= typed;
        if (i === 0 && illum) {
          // the illuminated capital: a red box with a gold edge
          ctx.fillStyle = this.theme.accent;
          ctx.fillRect(cx - 3, y - size * 0.82, w + 6, size * 1.02);
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - 3, y - size * 0.82, w + 6, size * 1.02);
          ctx.fillStyle = '#F1E6CC';
        } else if (i < typed) ctx.fillStyle = ink;
        else ctx.fillStyle = isIllum ? gold : muted;
        ctx.globalAlpha = i >= typed && hide > 0 ? Math.max(0.04, 1 - hide) : 1;
        if (ch !== ' ') ctx.fillText(ch, cx, y);
        ctx.globalAlpha = 1;
        if (i === typed && mark) {
          ctx.fillStyle = mark;
          ctx.fillRect(cx, y + size * 0.16, Math.max(w, size * 0.3), 2);
        }
      }
      cx += w;
    }
    return cx - x;
  }
}

// ── Scenes ─────────────────────────────────────────────────────────────────

const SCENES = {
  /** The Echo: the same phrase twice, yours in cyan and the machine's in magenta, racing; a tug bar between you. */
  future(ctx) {
    const b = this.b;
    const th = this.theme;
    const W = this.W;
    const H = this.H;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);
    // rings, slowly breathing
    ctx.strokeStyle = th.line;
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.48, (k * Math.min(W, H) * 0.14) * (1 + 0.02 * Math.sin(this.time * 0.8 + k)), 0, Math.PI * 2);
      ctx.stroke();
    }
    const P = b.phrase;
    if (!P) return;
    const size = Math.max(22, Math.min(44, W / 30));
    const font = `${Math.round(size)}px ${this.font}`;
    ctx.font = font;
    const tw = ctx.measureText(P.text).width;
    const x = W / 2 - tw / 2;
    const y = H * 0.44;
    const cyan = th.accent;
    const magenta = th.gold;
    // what you see of the phrase: phase 2 scrambles the words ahead; phase 3 lets it show only for a moment
    let shown = P.text;
    if (b.phase === 2) {
      const cur = P.text.lastIndexOf(' ', Math.max(0, P.typed - 1));
      const nextSpace = P.text.indexOf(' ', P.typed);
      const end = nextSpace < 0 ? P.text.length : nextSpace;
      shown = P.text.slice(0, end) + P.scrambled.slice(end);
      void cur;
    }
    const hide = b.phase === 3 ? Math.max(0, Math.min(1, (P.t - ECHO_SHOW) * 3)) : 0;
    const err = this.fx.find((f) => f.kind === 'err');
    this.line(ctx, shown, x, y, size, { typed: P.typed, hide, ink: cyan, muted: th.ink, mark: err ? magenta : cyan, font, gold: magenta });
    // the Echo's line, under yours
    ctx.globalAlpha = 0.85;
    const ey = y + size * 1.5;
    let cx = x;
    for (let i = 0; i < P.text.length; i++) {
      const ch = P.text[i];
      const w = ctx.measureText(ch).width;
      // only what the Echo has written shows (the rest would give the phrase away)
      ctx.fillStyle = magenta;
      if (ch !== ' ' && i < Math.floor(P.echo)) ctx.fillText(ch, cx, ey);
      if (i === Math.floor(P.echo)) ctx.fillRect(cx, ey + size * 0.16, Math.max(w, size * 0.3), 2);
      cx += w;
    }
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(size * 0.38)}px ${this.font}`;
    ctx.fillStyle = cyan;
    ctx.fillText('you', x - size * 1.4, y);
    ctx.fillStyle = magenta;
    ctx.fillText('echo', x - size * 1.4, ey);
    // the tug: phrases you won pull right, the Echo's pull left
    const bw = Math.min(W * 0.6, 640);
    const bx = W / 2 - bw / 2;
    const by = H * 0.72;
    const done = b.hpMax - b.hp;
    const k = Math.max(-1, Math.min(1, (done - b.echoWins) / Math.max(4, b.hpMax * 0.6)));
    ctx.fillStyle = magenta;
    ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = cyan;
    ctx.fillRect(bx, by, bw * (0.5 + k / 2), 6);
    ctx.fillStyle = th.ink;
    ctx.fillRect(bx + bw * (0.5 + k / 2) - 1, by - 7, 2, 20);
    ctx.font = `${Math.round(size * 0.38)}px ${this.font}`;
    ctx.fillStyle = cyan;
    ctx.fillText(`${done} yours`, bx, by + 30);
    ctx.fillStyle = magenta;
    const ew = `${b.echoWins} the echo's`;
    ctx.fillText(ew, bx + bw - ctx.measureText(ew).width, by + 30);
    const lost = this.fx.find((f) => f.kind === 'echo');
    if (lost) {
      ctx.globalAlpha = 1 - lost.t / lost.life;
      ctx.fillStyle = magenta;
      ctx.font = `${Math.round(size * 0.55)}px ${this.font}`;
      const m = 'the echo got there first';
      ctx.fillText(m, W / 2 - ctx.measureText(m).width / 2, y - size * 1.4);
      ctx.globalAlpha = 1;
    }
  },

  /** The Worm: pieces of code snaking down a green terminal towards your files. */
  computer(ctx) {
    const b = this.b;
    const th = this.theme;
    const W = this.W;
    const H = this.H;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);
    const top = 84;
    const sx = (W - 60) / FW;
    const sy = (H - top - 70) / FH;
    const X = (x) => 30 + x * sx;
    const Y = (y) => top + y * sy;
    const size = Math.max(13, Math.min(20, W / 64));
    ctx.font = `${size}px ${this.font}`;
    ctx.textBaseline = 'middle';
    // your files, at the bottom
    FILE_NAMES.forEach((name, i) => {
      const x = X(fileX(i));
      const y = Y(575);
      const alive = b.files[i];
      const eat = this.fx.find((f) => f.kind === 'eat' && f.file === i);
      ctx.globalAlpha = alive ? 1 : 0.35;
      ctx.strokeStyle = eat && Math.floor(eat.t * 10) % 2 ? th.accent : th.muted;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 9, y - 12, 18, 22);
      ctx.beginPath(); ctx.moveTo(x - 4, y - 3); ctx.lineTo(x + 4, y - 3); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + 4, y + 2); ctx.stroke();
      ctx.fillStyle = alive ? th.muted : th.faint;
      ctx.font = `${Math.round(size * 0.75)}px ${this.font}`;
      ctx.textAlign = 'center';
      ctx.fillText(alive ? name : `${name} ✕`, x, y + 24);
      if (eat) { ctx.fillStyle = th.accent; ctx.globalAlpha = 1 - eat.t / eat.life; ctx.fillText(`${name} deleted`, x, y - 30); }
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
    // the worms: a dotted body joining their pieces, the front one with its eyes
    ctx.font = `${size}px ${this.font}`;
    for (const w of b.worms) {
      const ps = [...w.pieces].sort((a, c) => a.off - c.off);
      ctx.strokeStyle = th.faint;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ps.forEach((p, k) => { if (k) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); });
      ctx.stroke();
      ctx.setLineDash([]);
      const front = ps.reduce((a, p) => (p.y > a.y ? p : a));
      for (const p of ps) {
        if (p.y < -30) continue;
        const tw = ctx.measureText(p.text).width;
        const x = X(p.x) - tw / 2;
        const y = Y(p.y);
        const target = b.target === p;
        ctx.fillStyle = target ? th.ink : th.bg;
        ctx.fillRect(x - 6, y - size * 0.75, tw + 12, size * 1.5);
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 6, y - size * 0.75, tw + 12, size * 1.5);
        let cx = x;
        for (let i = 0; i < p.text.length; i++) {
          const ch = p.text[i];
          ctx.fillStyle = target ? (i < p.typed ? th.bg : '#0E3A1C') : i < p.typed ? th.typed : th.ink;
          ctx.fillText(ch, cx, y);
          cx += ctx.measureText(ch).width;
        }
        if (p === front) {
          // the head: two eyes that look down at your files
          ctx.fillStyle = th.accent;
          ctx.beginPath(); ctx.arc(x + tw / 2 - 6, y + size * 1.15, 3, 0, Math.PI * 2); ctx.arc(x + tw / 2 + 6, y + size * 1.15, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // pieces breaking into pixels
    for (const f of this.fx) {
      if (f.kind !== 'break') continue;
      ctx.fillStyle = th.typed;
      ctx.globalAlpha = 1 - f.t / f.life;
      for (const p of f.bits) ctx.fillRect(X(f.x) + p.vx * f.t, Y(f.y) + p.vy * f.t + 120 * f.t * f.t, 4, 4);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
  },

  /** The Deadline: the front page on a sheet of paper; the carriage, the bell, the red pencil, the press, the clock. */
  typewriter(ctx, dt) {
    const b = this.b;
    const th = this.theme;
    const W = this.W;
    const H = this.H;
    ctx.fillStyle = '#2B2522';
    ctx.fillRect(0, 0, W, H);
    const pw = Math.min(W - 60, 920);
    const px = (W - pw) / 2;
    const size = Math.max(18, Math.min(32, pw / 30));
    const lh = size * 1.75;
    const baseY = H * 0.62;
    this.feed = Math.max(0, (this.feed || 0) - dt * 5);
    const feedY = this.feed * lh;
    // the sheet, fed from the bottom
    const top = 100;
    ctx.fillStyle = th.bg;
    ctx.fillRect(px, top, pw, H - top);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(px + pw, top + 6, 6, H);
    // the clock on the desk: your ribbon is the time left before the press, at midnight
    const left = Math.max(0, b.res / b.resMax);
    const mins = Math.min(59, Math.floor(60 * (1 - left)));
    const room = W - (px + pw);
    const R = Math.min(34, room * 0.28);
    if (R > 14) {
      const ccx = px + pw + room / 2;
      const ccy = H * 0.34;
      ctx.strokeStyle = left < 0.25 ? '#D2432F' : '#EFE6D2';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ccx, ccy, R, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(ccx + Math.cos(a) * R * 0.82, ccy + Math.sin(a) * R * 0.82); ctx.lineTo(ccx + Math.cos(a) * R * 0.92, ccy + Math.sin(a) * R * 0.92); ctx.stroke(); }
      const ang = -Math.PI / 2 + (mins / 60) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.cos(ang) * R * 0.75, ccy + Math.sin(ang) * R * 0.75); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.cos(-Math.PI / 2 - 0.05) * R * 0.45, ccy + Math.sin(-Math.PI / 2 - 0.05) * R * 0.45); ctx.stroke();
      ctx.fillStyle = left < 0.25 ? '#D2432F' : '#A89C88';
      ctx.font = `14px ${this.font}`;
      ctx.textAlign = 'center';
      ctx.fillText(`11:${String(mins).padStart(2, '0')}`, ccx, ccy + R + 22);
      ctx.font = `12px ${this.font}`;
      ctx.fillText('the press', ccx, ccy + R + 40);
      ctx.fillText('at midnight', ccx, ccy + R + 55);
      ctx.textAlign = 'left';
    }
    // the lines already on the page, moving up as the paper feeds
    const fontFor = (t) => (t === t.toUpperCase() && /[A-Z]/.test(t) ? `700 ${Math.round(size * 1.08)}px ${this.font}` : `${Math.round(size)}px ${this.font}`);
    const tx = px + pw * 0.08;
    const page = b.page.slice(-8);
    page.forEach((p, k) => {
      const y = baseY - (page.length - k) * lh + feedY;
      if (y < top + size) return;
      ctx.font = fontFor(p.text);
      ctx.fillStyle = th.ink;
      ctx.globalAlpha = p.torn ? 0.25 : 1;
      ctx.fillText(p.text, tx, y);
      ctx.globalAlpha = 1;
      if (p.torn) { ctx.fillStyle = th.muted; ctx.font = `italic ${Math.round(size * 0.6)}px ${this.font}`; ctx.fillText('torn off by the press', tx + pw * 0.6, y); }
      if (p.struck) {
        ctx.font = fontFor(p.text);
        const x0 = tx + ctx.measureText(p.text.slice(0, p.struck[0])).width;
        const x1 = tx + ctx.measureText(p.text.slice(0, p.struck[1])).width;
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0 - 3, y - size * 0.3); ctx.lineTo(x1 + 3, y - size * 0.36); ctx.stroke();
      }
    });
    // the line in the machine
    const L = b.line;
    if (!L) return;
    const y = baseY + feedY;
    const err = this.fx.find((f) => f.kind === 'err');
    const font = L.fix ? `italic ${Math.round(size)}px ${this.font}` : fontFor(L.text);
    const w = this.line(ctx, L.text, tx, y, size, { typed: L.typed, ink: L.fix ? th.accent : th.ink, muted: th.muted, mark: err ? th.accent : th.ink, font, gold: th.gold });
    if (L.fix) { ctx.fillStyle = th.accent; ctx.font = `italic ${Math.round(size * 0.6)}px ${this.font}`; ctx.fillText('← the editor wants it again', tx + w + size * 0.8, y); }
    // the carriage on its rail, over the sheet
    ctx.fillStyle = '#8A8F94';
    ctx.fillRect(px - 20, top - 8, pw + 40, 4);
    ctx.font = font;
    const cx = tx + ctx.measureText(L.text.slice(0, L.typed)).width;
    ctx.fillStyle = '#B9BEC2';
    ctx.fillRect(Math.round(cx - 15), top - 18, 30, 12);
    // the bell: Enter, now
    if (L.bell > 0) {
      const blink = Math.floor(this.time * 6) % 2 === 0;
      ctx.fillStyle = th.accent;
      ctx.font = `700 ${Math.round(size * 0.7)}px ${this.font}`;
      if (blink) ctx.fillText('ding! enter ↵', tx + w + size, y);
      ctx.fillRect(tx, y + size * 0.4, (pw * 0.84) * (L.bell / b.st.lineWindow), 3);
    }
    // the press: how long the paper waits for this line
    if (L.press > 0 && L.pressMax) {
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(tx, y + size * 0.55, (pw * 0.84) * (L.press / L.pressMax), 2);
      ctx.globalAlpha = 1;
    }
    const jam = this.fx.find((f) => f.kind === 'jam');
    if (jam) { ctx.fillStyle = th.accent; ctx.font = `700 ${Math.round(size * 0.8)}px ${this.font}`; ctx.globalAlpha = 1 - jam.t / jam.life; ctx.fillText('JAMMED', px + pw / 2 - size * 2, y + size * 2); ctx.globalAlpha = 1; }
  },

  /** The Abbot's Codex: a dark scriptorium, the verse lit by your candle (smaller as it burns, dark in a gust). */
  scriptorium(ctx, dt) {
    const b = this.b;
    const th = this.theme;
    const W = this.W;
    const H = this.H;
    const v = b.verse;
    ctx.fillStyle = '#140D07';
    ctx.fillRect(0, 0, W, H);
    // the light: follows the candle, flickers, and nearly goes out in a gust
    const want = b.ended && !b.won ? 0 : (0.45 + 0.55 * Math.max(0, b.res / b.resMax)) * (b.gust > 0 ? 0.35 : 1);
    this.light += (want - this.light) * Math.min(1, dt * 6);
    const flick = 1 + Math.sin(this.time * 13) * 0.015 + Math.sin(this.time * 7.3) * 0.02;
    const cx = W / 2;
    const cy = H * 0.5;
    const R = Math.max(W, H) * 0.42 * this.light * flick;
    if (R > 4) {
      // an oval of light, wide enough for the verse while the candle is healthy
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.35, 0.8);
      const g = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
      g.addColorStop(0, th.bg);
      g.addColorStop(0.55, '#D9C69B');
      g.addColorStop(0.85, 'rgba(90, 60, 30, 0.35)');
      g.addColorStop(1, 'rgba(20, 13, 7, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      ctx.restore();
    }
    // the verses already written rise and fade above
    const size = Math.max(24, Math.min(46, W / 26));
    const font = `italic ${Math.round(size)}px ${this.font}`;
    const small = `italic ${Math.round(size * 0.6)}px ${this.font}`;
    ctx.textAlign = 'left';
    this.written.forEach((w, k) => {
      const back = this.written.length - k;
      ctx.font = small;
      const tw = ctx.measureText(w.text).width;
      const y = cy - size * 1.4 - back * size * 0.75 - Math.min(1, w.t * 3) * 6;
      ctx.globalAlpha = Math.max(0, 0.45 - back * 0.11) * this.light;
      ctx.fillStyle = th.ink;
      ctx.fillText(w.text, cx - tw / 2, y);
    });
    ctx.globalAlpha = 1;
    if (!v) return;
    // the verse being dictated
    ctx.font = font;
    const tw = ctx.measureText(v.text).width;
    const x = cx - tw / 2;
    const restart = this.fx.find((f) => f.kind === 'restart');
    const err = this.fx.find((f) => f.kind === 'err');
    this.line(ctx, v.text, x, cy + size * 0.3, size, {
      typed: v.typed, shown: v.shown, hide: b.gust > 0 ? Math.min(1, (1.6 - b.gust) * 3) : 0,
      // in the dark, what you already wrote glows like a memory
      ink: this.light < 0.6 ? '#E9D8A6' : th.ink, muted: th.muted, gold: th.gold, mark: err ? th.accent : this.light < 0.6 ? '#E9D8A6' : th.ink, font, illum: v.illum,
    });
    if (restart) {
      ctx.globalAlpha = 1 - restart.t / restart.life;
      ctx.fillStyle = th.accent;
      ctx.font = `${Math.round(size * 0.45)}px ${this.font}`;
      const m = 'the illuminated word starts over';
      ctx.fillText(m, cx - ctx.measureText(m).width / 2, cy + size * 1.5);
      ctx.globalAlpha = 1;
    }
    // where the Abbot is: the words still to come are dots
    if (v.shown < v.text.length) {
      ctx.fillStyle = th.muted;
      ctx.font = font;
      const sx = x + ctx.measureText(v.text.slice(0, v.shown)).width;
      const n = Math.min(3, Math.ceil((v.text.length - v.shown) / 5));
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.3 + 0.4 * ((Math.sin(this.time * 6 - i) + 1) / 2);
        ctx.beginPath();
        ctx.arc(sx + size * 0.4 + i * size * 0.3, cy + size * 0.15, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.font = `${Math.round(size * 0.4)}px ${this.font}`;
    ctx.fillStyle = th.muted;
    ctx.globalAlpha = 0.8 * this.light;
    const cap = b.gust > 0 ? 'the wind! keep writing from memory' : v.shown < v.text.length ? 'the abbot dictates…' : '';
    ctx.fillText(cap, cx - ctx.measureText(cap).width / 2, cy - size * 0.9);
    ctx.globalAlpha = 1;
  },
};
