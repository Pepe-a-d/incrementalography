'use strict';
// The desktop app: one window with the built game (dist/), served from app://game/ so it has its own origin and its
// save (localStorage) lives in the app's data folder. Mac: a small menu (quit, copy/paste for the save codes, full
// screen). Windows: no menu bar. F11 toggles full screen on both.

const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const IS_MAC = process.platform === 'darwin';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
// the game's sounds start with your first key, but let them play without waiting for a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// one copy at a time: a second launch brings the first window forward
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'Incrementalography',
    backgroundColor: '#FFFFFF',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, devTools: !app.isPackaged },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(process.env.INCR_URL || 'app://game/index.html');
  // links that leave the game open in the browser; the window itself never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://') && !url.startsWith(process.env.INCR_URL || '\0')) e.preventDefault(); });
  // F11: full screen
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  win.on('closed', () => { win = null; });
  // test hook: INCR_SHOT=/path/shot.png saves a picture of the window once the game is up, prints its state and quits.
  // INCR_URL loads another address instead (the dev server); INCR_JS=/path/script.js runs that script first (async).
  if (process.env.INCR_SHOT) {
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      if (process.env.INCR_JS) {
        const code = require('node:fs').readFileSync(process.env.INCR_JS, 'utf8');
        await win.webContents.executeJavaScript(`(async () => { ${code} })()`);
      }
      const img = await win.webContents.capturePage();
      require('node:fs').writeFileSync(process.env.INCR_SHOT, img.resize({ width: 1280 }).toPNG());
      const state = await win.webContents.executeJavaScript(
        "JSON.stringify({ screen: game.screen, origin: location.origin, saved: !!localStorage.getItem('incrementalography:save'), fonts: document.fonts.check(\"20px 'EB Garamond'\") })",
      );
      console.log(`INCR_STATE ${state}`);
      app.quit();
    }, 2500));
  }
}

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
