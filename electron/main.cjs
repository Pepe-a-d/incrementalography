'use strict';
// The desktop app: one window with the built game (dist/), served from app://game/ so it has its own origin and its
// save (localStorage) lives in the app's data folder.
// · The game is designed for a 1280×800 window: on a bigger window everything is zoomed up to keep its proportions,
//   times the "interface size" the player picks (Settings, or Ctrl/⌘ + and −; Ctrl/⌘ 0 resets it).
// · Full screen (Settings or F11) and a maximized window are remembered in userData/prefs.json.
// · Mac: a small menu (quit, copy/paste for the save codes, full screen). Windows: no menu bar.

const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const IS_MAC = process.platform === 'darwin';
const DESIGN = { w: 1280, h: 800 }; // the window the game is drawn for
const SCALES = [0.8, 0.9, 1, 1.1, 1.25, 1.5]; // interface sizes to choose from

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
// the game's sounds start with your first key, but let them play without waiting for a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// one copy at a time: a second launch brings the first window forward
if (!app.requestSingleInstanceLock()) app.quit();

// ── Preferences of the window (the game's own settings live in its save) ───
const PREFS_FILE = path.join(app.getPath('userData'), 'prefs.json');
const DEFAULTS = { fullscreen: false, maximized: true, scale: 1 };
let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8')) }; } catch { /* first launch */ }
function savePrefs() {
  try { fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs)); } catch { /* not critical */ }
  if (win) win.webContents.send('prefs:changed', prefs);
}

let win = null;

/** Zooms the game so it fills the window as it fills a 1280×800 one (never smaller than that), times the player's size. */
function applyZoom() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  const fit = Math.min(3, Math.max(1, Math.min(w / DESIGN.w, h / DESIGN.h)));
  win.webContents.setZoomFactor(fit * prefs.scale);
}

function setScale(v) {
  prefs.scale = Math.min(1.6, Math.max(0.7, Math.round(Number(v) * 100) / 100 || 1));
  savePrefs();
  applyZoom();
  return prefs;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'Incrementalography',
    backgroundColor: '#FFFFFF',
    show: false,
    fullscreen: !!prefs.fullscreen,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, devTools: !app.isPackaged, preload: path.join(__dirname, 'preload.cjs') },
  });
  if (prefs.maximized && !prefs.fullscreen) win.maximize();
  win.once('ready-to-show', () => { applyZoom(); win.show(); });
  win.loadURL(process.env.INCR_URL || 'app://game/index.html');
  win.webContents.on('did-finish-load', applyZoom);
  win.on('resize', applyZoom);
  win.on('enter-full-screen', () => { prefs.fullscreen = true; savePrefs(); applyZoom(); });
  win.on('leave-full-screen', () => { prefs.fullscreen = false; savePrefs(); applyZoom(); });
  win.on('maximize', () => { prefs.maximized = true; savePrefs(); });
  win.on('unmaximize', () => { if (!win.isFullScreen()) { prefs.maximized = false; savePrefs(); } });
  // links that leave the game open in the browser; the window itself never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://') && !url.startsWith(process.env.INCR_URL || '\0')) e.preventDefault(); });
  // F11: full screen · Ctrl/⌘ + and −: interface size · Ctrl/⌘ 0: back to normal
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); return; }
    if (!(input.control || input.meta) || input.alt) return;
    const i = SCALES.findIndex((s) => s >= prefs.scale - 0.001);
    if (input.key === '=' || input.key === '+') { setScale(SCALES[Math.min(SCALES.length - 1, i + 1)]); e.preventDefault(); }
    else if (input.key === '-') { setScale(SCALES[Math.max(0, (i === -1 ? SCALES.length : i) - 1)]); e.preventDefault(); }
    else if (input.key === '0') { setScale(1); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
  // test hook: INCR_SHOT=/path/shot.png saves a picture of the window once the game is up, prints its state and quits.
  // INCR_URL loads another address instead (the dev server); INCR_JS=/path/script.js runs that script first (async).
  if (process.env.INCR_SHOT) {
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      if (process.env.INCR_JS) {
        const code = fs.readFileSync(process.env.INCR_JS, 'utf8');
        await win.webContents.executeJavaScript(`(async () => { ${code} })()`);
      }
      const img = await win.webContents.capturePage();
      fs.writeFileSync(process.env.INCR_SHOT, img.resize({ width: 1280 }).toPNG());
      const state = await win.webContents.executeJavaScript(
        "JSON.stringify({ screen: game.screen, origin: location.origin, saved: !!localStorage.getItem('incrementalography:save'), fonts: document.fonts.check(\"20px 'EB Garamond'\"), zoom: window.devicePixelRatio, w: innerWidth, h: innerHeight, desktop: !!window.desktop, note: window.__note ?? null })",
      );
      console.log(`INCR_STATE ${state}`);
      app.quit();
    }, 2500));
  }
}

ipcMain.handle('prefs:get', () => ({ ...prefs, fullscreen: !!win && win.isFullScreen(), scales: SCALES }));
ipcMain.handle('fullscreen:set', (_e, on) => { if (win) win.setFullScreen(!!on); return { ...prefs, fullscreen: !!on }; });
ipcMain.handle('scale:set', (_e, v) => setScale(v));

function buildMenu() {
  if (!IS_MAC) { Menu.setApplicationMenu(null); return; }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ]));
}

app.whenReady().then(() => {
  // app://game/<path> → dist/<path> (and nothing outside it)
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  buildMenu();
  createWindow();
});

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});
app.on('activate', () => { if (!win) createWindow(); });
// it's a game: closing its window quits it, on the Mac too
app.on('window-all-closed', () => app.quit());
