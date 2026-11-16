'use strict';
// What the game can ask the desktop app for (window.desktop): its preferences, full screen and the interface size.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  getPrefs: () => ipcRenderer.invoke('prefs:get'),
  setFullScreen: (on) => ipcRenderer.invoke('fullscreen:set', !!on),
  setScale: (scale) => ipcRenderer.invoke('scale:set', Number(scale)),
  onPrefs: (cb) => ipcRenderer.on('prefs:changed', (_e, prefs) => cb(prefs)),
});
