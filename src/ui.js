// Interface pieces: toasts, dialogs and settings (screen, effects, play, export, import, delete).

const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function setText(e, t) {
  if (e._t !== t) { e._t = t; e.textContent = t; }
}


// ── Toasts and dialogs ─────────────────────────────────────────────────────

/** Something happened: a line on top of the log (A Dark Room's notifications); during a draft, also a short line at the bottom. */
export function toast(html) {
  const log = $('#log');
  if (log) {
    const line = el('p', 'log-line', html);
    log.prepend(line);
    while (log.children.length > 24) log.lastElementChild.remove();
  }
  const runVisible = !$('#screen-run')?.hidden;
  if (!log || runVisible || log.offsetParent === null) {
    const root = $('#toasts');
    const t = el('div', 'toast', html);
    root.append(t);
    while (root.children.length > 3) root.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 420); }, 3400);
  }
}

export const modalOpen = () => !!document.querySelector('.modal-wrap');

export function modal({ title, body, actions = [{ id: 'ok', label: 'OK', primary: true }], onOpen, cls = '' }) {
  return new Promise((resolve) => {
    const wrap = el('div', 'modal-wrap');
    const card = el('div', `modal box ${cls}`);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    const h = el('h2');
    h.textContent = title;
    const bodyEl = el('div', 'modal-body', body);
    const acts = el('div', 'modal-actions');
    card.append(h, bodyEl, acts);
    let closed = false;
    const close = (id) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 160);
      resolve(id);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close('cancel'); }
    };
    let primary = null;
    for (const a of actions) {
      const b = el('button', `btn ${a.primary ? 'primary' : ''}`);
      b.type = 'button';
      b.textContent = a.label;
      b.addEventListener('click', () => {
        if (a.onClick && a.onClick(card) === false) return;
        close(a.id);
      });
      acts.append(b);
      if (a.primary) primary = b;
    }
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close('cancel'); });
    wrap.append(card);
    $('#modal-root').append(wrap);
    if (onOpen) onOpen(card);
    else primary?.focus();
  });
}

// ── Settings and saves ─────────────────────────────────────────────────────

const DESK = typeof window !== 'undefined' ? window.desktop : null; // the desktop app (electron/preload.cjs), or null in a browser
const MOD = DESK?.platform === 'darwin' || /Mac/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
let onDeskPrefs = null; // the open settings dialog follows F11 and Ctrl +/− while it's open
DESK?.onPrefs((p) => onDeskPrefs?.(p));

/** Full screen: the app window in the desktop app, the page in a browser. */
export function isFullScreen() { return !!document.fullscreenElement; }
export async function setFullScreen(on) {
  if (DESK) return DESK.setFullScreen(on);
  try {
    if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
    else if (!on && document.fullscreenElement) await document.exitFullscreen();
  } catch { /* the browser said no */ }
}

export async function settingsDialog(G) {
  const s = G.state;
  const prefs = DESK ? await DESK.getPrefs().catch(() => null) : null;
  const sizes = prefs?.scales || [];
  const opt = (v, label) => `<option value="${v}">${label}</option>`;
  await modal({
    title: 'Settings',
    cls: 'settings',
    body: `<h3 class="set-h">screen</h3>
      <label class="setting"><span>Full screen</span><input type="checkbox" data-k="full"></label>
      ${DESK ? `<label class="setting"><span>Interface size</span><select data-k="scale">${sizes.map((v) => opt(v, `${Math.round(v * 100)}%`)).join('')}</select></label>` : ''}
      <label class="setting"><span>Word size</span><select data-k="words">${opt('0.85', 'small')}${opt('1', 'normal')}${opt('1.2', 'large')}</select></label>
      <label class="setting"><span>Numbers</span><select data-k="notation">${opt('short', '1.23 M')}${opt('sci', '1.23e6')}</select></label>
      <h3 class="set-h">effects</h3>
      <label class="setting"><span>Sounds</span><input type="range" min="0" max="1" step="0.05" data-k="volume"></label>
      <label class="setting"><span>Music<small>in the boss fights</small></span><input type="range" min="0" max="1" step="0.05" data-k="music"></label>
      <label class="setting"><span>Screen shake</span><input type="checkbox" data-k="shake"></label>
      <label class="setting"><span>Calm effects<small>fewer particles, no freeze on big catches</small></span><input type="checkbox" data-k="calm"></label>
      <h3 class="set-h">play</h3>
      <label class="setting"><span>Pause when you leave<small>a draft waits if you switch windows</small></span><input type="checkbox" data-k="autoPause"></label>
      <p class="muted set-keys">${DESK
        ? `<kbd>F11</kbd> full screen · <kbd>${MOD} +</kbd> <kbd>${MOD} −</kbd> interface size · <kbd>${MOD} 0</kbd> normal size`
        : `<kbd>F11</kbd> full screen · <kbd>${MOD} +</kbd> <kbd>${MOD} −</kbd> zoom the page`}<br>Your game saves on its own${DESK ? '.' : ' in this browser.'}</p>`,
    onOpen: (card) => {
      const q = (k) => card.querySelector(`[data-k="${k}"]`);
      const vol = q('volume');
      vol.value = s.settings.volume;
      vol.addEventListener('input', () => { s.settings.volume = Number(vol.value); G.applySettings(); });
      vol.addEventListener('change', () => { G.save(); G.sfx.key(s.era); });
      const mus = q('music');
      mus.value = s.settings.music ?? 0.6;
      mus.addEventListener('input', () => { s.settings.music = Number(mus.value); G.applySettings(); });
      mus.addEventListener('change', () => G.save());
      const check = (k) => {
        const c = q(k);
        c.checked = !!s.settings[k];
        c.addEventListener('change', () => { s.settings[k] = c.checked; G.applySettings(); G.save(); });
      };
      check('shake');
      check('calm');
      check('autoPause');
      const nota = q('notation');
      nota.value = s.settings.notation || 'short';
      nota.addEventListener('change', () => { s.settings.notation = nota.value; G.applySettings(); G.save(); G.refresh(); });
      const words = q('words');
      words.value = String(s.settings.words || 1);
      if (!words.value) words.value = '1';
      words.addEventListener('change', () => { s.settings.words = Number(words.value); G.applySettings(); G.save(); });
      const full = q('full');
      full.checked = prefs ? !!prefs.fullscreen : isFullScreen();
      full.addEventListener('change', () => setFullScreen(full.checked));
      if (!DESK) {
        const sync = () => {
          if (!card.isConnected) { document.removeEventListener('fullscreenchange', sync); return; }
          full.checked = isFullScreen();
        };
        document.addEventListener('fullscreenchange', sync);
      } else {
        onDeskPrefs = (p) => { if (!card.isConnected) return; full.checked = !!p.fullscreen; q('scale').value = String(p.scale); };
        const sc = q('scale');
        sc.value = String(prefs?.scale ?? 1);
        if (!sc.value) sc.value = '1';
        sc.addEventListener('change', () => DESK.setScale(Number(sc.value)));
      }
      card.querySelector('.btn.primary')?.focus();
    },
    actions: [
      { id: 'export', label: 'Export', onClick: () => { exportDialog(G); return true; } },
      { id: 'import', label: 'Import', onClick: () => { importDialog(G); return true; } },
      { id: 'reset', label: 'Delete save', onClick: () => { resetDialog(G); return true; } },
      { id: 'ok', label: 'Close', primary: true },
    ],
  });
}

async function exportDialog(G) {
  G.save();
  const code = G.exportCode();
  await modal({
    title: 'Export save',
    body: '<p>Copy this code. Use Import to restore it in any browser.</p><textarea readonly></textarea>',
    onOpen: (card) => { const ta = $('textarea', card); ta.value = code; ta.focus(); ta.select(); },
    actions: [
      { id: 'copy', label: 'Copy', onClick: () => { navigator.clipboard?.writeText(code).then(() => toast('Code copied')); return false; } },
      { id: 'ok', label: 'Close', primary: true },
    ],
  });
}

async function importDialog(G) {
  await modal({
    title: 'Import save',
    body: '<p>Paste an exported code. <b>It replaces your current save.</b></p><textarea placeholder="Paste the code"></textarea><div class="error" hidden></div>',
    onOpen: (card) => $('textarea', card).focus(),
    actions: [
      { id: 'cancel', label: 'Cancel' },
      { id: 'ok', label: 'Import', primary: true, onClick: (card) => {
        const err = $('.error', card);
        try { G.importCode($('textarea', card).value); return true; } catch (e) { err.hidden = false; err.textContent = e.message; return false; }
      } },
    ],
  });
}

async function resetDialog(G) {
  const r = await modal({
    title: 'Delete your save?',
    body: '<p>Everything is lost and you start over. This can\'t be undone.</p>',
    actions: [{ id: 'cancel', label: 'Cancel', primary: true }, { id: 'reset', label: 'Delete everything' }],
  });
  if (r === 'reset') G.hardReset();
}
