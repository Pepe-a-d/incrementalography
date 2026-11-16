// The end of a draft: a stream of ink pours from the top of the screen into the middle, splashes and spreads until it
// covers the whole page. The results are the paper left clean: they are painted in the paper's colour only where the
// ink already is (source-atop), so they appear as the ink reaches them. Driven by main.js (update every frame).
//
//   const end = new InkEnding(canvas);
//   end.start({ ink, wpm, acc, streak, notes }, sounds)  → end.update(dt) each frame → end.stop()
//   end.t: seconds since it started · end.covered: the page is all ink · end.layout: where the button goes

import { ICONS } from './icons.js';
import { fmt } from './format.js';

const T_HIT = 0.38; // s: the stream reaches the middle
const T_SPREAD = 1.05; // s: from the splash to the whole page
const T_POUR = 1.25; // s: the stream stops pouring
const easeOut = (k) => 1 - (1 - k) ** 3;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const DROP = new Path2D((ICONS.droplet.match(/d="([^"]+)"/) || [])[1] || '');

export class InkEnding {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.active = false;
    this.t = 0;
  }

  /** res: { ink, wpm, acc, streak, notes: [] } · sfx: { pour, splash, tick, done } (all optional). */
  start(res, sfx = {}) {
    this.res = res;
    this.sfx = sfx;
    this.t = 0;
    this.active = true;
    this.covered = false;
    this.hit = false;
    this.lastTick = 0;
    this.doneSound = false;
    const css = getComputedStyle(document.documentElement);
    this.inkColor = css.getPropertyValue('--ink').trim() || '#000';
    this.paper = css.getPropertyValue('--bg').trim() || '#fff';
    this.font = css.getPropertyValue('--ui').trim() || 'Georgia, serif';
    this.resize();
    // the blob's wobble and its fingers are random each time, so no two stains are the same
    const r = Math.random;
    this.waves = [[5, 0.06, r() * 6.3], [8, 0.04, r() * 6.3], [13, 0.025, r() * 6.3], [21, 0.012, r() * 6.3]];
    this.fingers = Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, len: 0.08 + r() * 0.14, w: 0.05 + r() * 0.06 }));
    this.drops = [];
    this.spots = Array.from({ length: 90 }, () => ({ a: r() * Math.PI * 2, d: 0.08 + r() * 1.05, r: 1.5 + r() ** 2 * 9 }));
    if (this.sfx.pour) this.sfx.pour();
  }

  stop() {
    this.active = false;
    this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth || window.innerWidth;
    const h = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
    this.cx = w / 2;
    this.yHit = h * 0.4; // where the stream lands: the middle of the results
    this.rMax = Math.hypot(Math.max(this.cx, w - this.cx), Math.max(this.yHit, h - this.yHit)) * 1.25;
    // the results, centred on the splash; the button goes under them
    const big = Math.max(64, Math.min(116, h * 0.15));
    const yBig = this.yHit + big * 0.32;
    this.layout = { big, yBig, yStats: yBig + 108, button: yBig + 168 };
  }

  update(dt) {
    if (!this.active) return;
    if (this.cv.clientWidth && Math.abs(this.cv.clientWidth - this.W) > 1) this.resize();
    this.t += dt;
    const t = this.t;
    if (!this.hit && t >= T_HIT) {
      this.hit = true;
      this.splash();
      if (this.sfx.splash) this.sfx.splash();
    }
    for (const d of this.drops) {
      if (d.landed) continue;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 1 - 5 * dt;
      d.vy *= 1 - 5 * dt;
      d.life -= dt;
      if (d.life <= 0) d.landed = true;
    }
    this.covered = t >= T_HIT + T_SPREAD;
    this.draw();
  }

  /** The splash: drops fly out from where the stream lands and stay as stains. */
  splash() {
    for (let i = 0; i < 38; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 380 + Math.random() * 900;
      this.drops.push({ x: this.cx, y: this.yHit, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.85, r: 2.5 + Math.random() * 10, life: 0.08 + Math.random() * 0.3, landed: false });
    }
  }

  draw() {
    const { ctx, W, H, cx, t } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.inkColor;
    if (this.covered) {
      ctx.fillRect(0, 0, W, H);
    } else {
      this.drawStream();
      if (this.hit) {
        const k = clamp01((t - T_HIT) / T_SPREAD);
        this.drawBlob(k);
        const R = this.rMax * (0.06 + 0.94 * easeOut(k));
        for (const p of this.spots) {
          const d = p.d * this.rMax;
          if (d > R * 1.22) continue; // the spots land a little ahead of the stain
          ctx.beginPath();
          ctx.arc(this.cx + Math.cos(p.a) * d, this.yHit + Math.sin(p.a) * d * 0.92, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const d of this.drops) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    this.drawResults();
  }

  /** The stream: a wavy band from the top of the screen down to its head; when it stops pouring, its tail falls too. */
  drawStream() {
    const { ctx, cx, t, yHit } = this;
    const g = (2 * yHit) / (T_HIT * T_HIT); // falls like a thrown liquid: slow, then fast
    const head = Math.min(yHit, 0.5 * g * t * t);
    const tail = t < T_POUR ? 0 : Math.min(yHit, 0.5 * g * (t - T_POUR) ** 2);
    if (tail >= head) return;
    const w0 = 20 + 4 * Math.sin(t * 9);
    const w = (y) => w0 * (0.8 + 0.5 * (y / yHit)); // thin where it leaves, wider where it lands
    const wob = (y) => Math.sin(y * 0.045 - t * 18) * 3 + Math.sin(y * 0.11 + t * 7) * 1.5;
    ctx.beginPath();
    for (let y = tail; y <= head; y += 6) ctx.lineTo(cx - w(y) / 2 + wob(y), y);
    for (let y = head; y >= tail; y -= 6) ctx.lineTo(cx + w(y) / 2 + wob(y), y);
    ctx.closePath();
    ctx.fill();
    if (!this.hit) { ctx.beginPath(); ctx.arc(cx + wob(head), head, w(head) * 0.7, 0, Math.PI * 2); ctx.fill(); }
  }

  /** The stain: a wobbly blob with a few fingers, growing from the splash until it covers the page. */
  drawBlob(k) {
    const { ctx, cx, yHit, t } = this;
    const R = this.rMax * (0.06 + 0.94 * easeOut(k));
    const N = 180;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      let r = 1;
      for (const [f, amp, ph] of this.waves) r += amp * Math.sin(f * a + ph + t * 0.8);
      for (const fg of this.fingers) {
        let d = Math.abs(a - fg.a);
        if (d > Math.PI) d = Math.PI * 2 - d;
        r += fg.len * Math.exp(-((d / fg.w) ** 2));
      }
      const rr = R * r;
      const x = cx + Math.cos(a) * rr;
      const y = yHit + Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** The results in the paper's colour, only where there is ink already: they show up as the stain reaches them. */
  drawResults() {
    const { ctx, cx, t, res, layout: L } = this;
    if (!this.hit) return;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = this.paper;
    ctx.strokeStyle = this.paper;
    ctx.textBaseline = 'alphabetic';
    // +ink, counting up once the splash has landed
    const k = clamp01((t - T_HIT - 0.12) / 0.9);
    const e = easeOut(k);
    if (k > 0 && k < 1 && this.sfx.tick && t - this.lastTick > 0.055) { this.lastTick = t; this.sfx.tick(e); }
    if (k >= 1 && !this.doneSound) { this.doneSound = true; if (this.sfx.done) this.sfx.done(); }
    const big = `+${fmt(res.ink * e)}`;
    ctx.font = `${L.big}px ${this.font}`;
    const bw = ctx.measureText(`+${fmt(res.ink)}`).width; // the width of the final number, so it doesn't jiggle
    const ds = L.big * 0.62; // the drop
    const total = bw + 14 + ds;
    const x0 = cx - total / 2;
    ctx.textAlign = 'left';
    ctx.fillText(big, x0, L.yBig);
    ctx.save();
    ctx.translate(x0 + bw + 14, L.yBig - ds * 0.98);
    ctx.scale(ds / 24, ds / 24);
    ctx.lineWidth = 1.9;
    ctx.lineJoin = 'round';
    ctx.stroke(DROP);
    ctx.restore();
    // what's new this time (records), small, under the number
    ctx.textAlign = 'center';
    if (res.notes && res.notes.length) {
      ctx.font = `italic 17px ${this.font}`;
      ctx.fillText(res.notes.join(' · '), cx, L.yBig + 40);
    }
    // wpm · accuracy · streak
    const cols = [[String(Math.round(res.wpm)), 'wpm'], [`${Math.round(res.acc * 100)}%`, 'accuracy'], [String(res.streak), 'best streak']];
    const gap = Math.min(210, this.W / 3.4);
    cols.forEach(([v, label], i) => {
      const x = cx + (i - 1) * gap;
      ctx.font = `44px ${this.font}`;
      ctx.fillText(v, x, L.yStats);
      ctx.font = `italic 16px ${this.font}`;
      ctx.fillText(label, x, L.yStats + 26);
    });
    ctx.globalCompositeOperation = 'source-over';
  }
}
