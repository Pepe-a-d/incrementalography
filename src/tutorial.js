// The first draft teaches the game by doing it, one step at a time:
// one still word to aim at and finish, three slow words, a pause on the focus bar (space to go on), then the normal page.
// Each step is one task in big letters with a short reason under it. What the step is about stays lit and the rest
// of the HUD fades out; on the page, the key to press next sits in a blinking box (run.tutMark, drawn by render.js).
// ui.say(msg) shows a message: { task, why, gate, err, lit, pulse, hide } (see tutSay in main.js); ui.cue() plays a step sound.

import { placeWord, sendBug, FW } from './run.js';

export const keys = (s) => [...s].map((c) => `<kbd>${c === ' ' ? 'space' : c}</kbd>`).join('');

export class DraftTutorial {
  constructor(run, ui) {
    this.run = run;
    this.ui = ui;
    this.t = 0;
    this.gate = false;
    run.tutorial = true;
    run.tutMark = true;
    run.words.length = 0; // an empty page with a single word, standing still
    run.noSpawn = true;
    run.freezeFocus = true;
    placeWord(run, 'ink', { x: FW * 0.46, lane: 3 });
    this.step = 'aim';
    this.say();
  }

  /** The message of the current step (why can be swapped for a correction after a wrong key). */
  msg(why, err = false) {
    const r = this.run;
    switch (this.step) {
      case 'aim':
        return { task: `type ${keys('i')}`, why: why || 'words drift across the page. a word’s first letter aims at it.', err, lit: 'none' };
      case 'finish': {
        const w = r.words.find((x) => x.id === r.target);
        const rest = w ? w.text.slice(w.typed) : '';
        return { task: rest ? `now type ${keys(rest)}` : 'now finish the word', why: why || 'finish the word to catch it.', err, lit: 'none' };
      }
      case 'more': {
        const tally = `<span class="tally">${[0, 1, 2].map((i) => `<i${i < 3 - this.left ? ' class="on"' : ''}></i>`).join('')}</span>`;
        return { task: `catch these three words ${tally}`, why: why || 'every word you catch earns <b>ink</b>: your ink is up here ↑', err, lit: 'ink', pulse: 'ink' };
      }
      case 'focus':
        return {
          task: '↑ this bar is your <b>focus</b>',
          why: 'it drains as time passes, and every mistake takes a bite.<br>when it runs out, the draft ends.',
          gate: `press ${keys(' ')} to start`,
          lit: 'focus',
          pulse: 'focus',
        };
      default:
        return null;
    }
  }

  say(why, err) { this.ui.say(this.msg(why, err)); }

  /** First letters of the words on the page, to show which keys would aim. */
  firsts() {
    return this.run.words.filter((w) => !w.caught && !w.gone).map((w) => w.text[0]).join('');
  }

  onEvent(e) {
    const r = this.run;
    if (e.type === 'error') {
      if (this.step === 'aim') this.say(`no word starts with that key. type ${keys('i')}`, true);
      else if (this.step === 'more' && r.target === null) this.say(`no word starts with that key. try ${keys(this.firsts())}`, true);
      else if (this.step === 'finish' || this.step === 'more') this.say('not that key: type the letter in the box. a wrong key never moves you on.', true);
      else if (!this.mistakeSeen) {
        this.mistakeSeen = true;
        this.ui.say({ why: 'a mistake breaks your <b>streak</b> (the thin bar) and costs focus.', pulse: 'streak', hide: 4 });
      }
      return;
    }
    if (this.step === 'aim' && e.type === 'lock') {
      this.step = 'finish';
      this.ui.cue();
      this.say();
    } else if (this.step === 'finish' && e.type === 'key') {
      this.say(); // the keys left to type
    } else if (this.step === 'finish' && e.type === 'catch') {
      this.step = 'more';
      this.left = 3;
      this.ui.cue();
      placeWord(r, 'quill', { x: FW * 0.24, lane: 2, speed: 7 });
      placeWord(r, 'page', { x: FW * 0.52, lane: 5, speed: 7 });
      placeWord(r, 'monk', { x: FW * 0.8, lane: 3, speed: 7 });
      this.say();
    } else if (this.step === 'more' && e.type === 'catch') {
      this.left -= 1;
      if (this.left > 0) {
        this.say();
      } else {
        // a pause on the focus bar before the clock starts: nothing moves until you press space
        this.step = 'focus';
        this.gate = true;
        r.tutMark = false;
        this.ui.cue();
        this.say();
      }
    }
    if (this.step === 'free' && e.type === 'catch' && !this.streakSeen && r.streak >= 20) {
      this.streakSeen = true;
      this.ui.say({ why: 'no mistakes builds a <b>streak</b> (the thin bar): it adds to the ink of every word.', pulse: 'streak', hide: 4.5 });
    }
  }

  /** Space after the focus explanation: the real page starts. */
  go() {
    if (!this.gate) return;
    const r = this.run;
    this.gate = false;
    this.step = 'free';
    r.freezeFocus = false;
    r.noSpawn = false;
    r.spawnT = 0.3;
    this.ui.cue();
    this.ui.say({ task: 'catch as many words as you can', hide: 3.5 });
  }

  tick() {}
}

// ── The first draft in each new era teaches its new keys and its mechanic, the same way.
// Typewriter: a capital (Shift), two words with punctuation, then the bell rings and waits for Enter.
// Computer: a word with numbers and symbols, then a bug crawls into a word and you catch it (×3).
// Future: a whole phrase, then two faint words to catch before they turn solid (×2).
const ERA_STEPS = {
  typewriter: { first: 'Ribbon', why: 'on the typewriter every word starts with a capital: hold Shift.', pair: ['Memo,', 'Desk.'], pairWhy: 'punctuation is part of the word, and words with it give more ink.' },
  computer: { first: 'file_2', why: 'on the computer, words have numbers and symbols: they are part of the word.' },
  future: { first: 'Neural link.', why: 'in the future, words come as whole phrases: spaces, capitals and punctuation all count.', pair: ['orbit', 'nova'], pairWhy: 'new words arrive faint. catch one while it is still faint and it gives ×2 ink.' },
};

export class EraTutorial {
  constructor(run, era, ui) {
    this.run = run;
    this.era = era;
    this.ui = ui;
    this.cfg = ERA_STEPS[era];
    run.tutorial = true;
    run.tutMark = true;
    run.words.length = 0;
    run.noSpawn = true;
    run.freezeFocus = true;
    run.freezeBell = true;
    placeWord(run, this.cfg.first, { x: FW * 0.42, lane: 3 });
    this.step = 'aim';
    this.say();
  }

  target() { return this.run.words.find((x) => x.id === this.run.target); }

  msg(why, err = false) {
    const c = this.cfg;
    switch (this.step) {
      case 'aim': return { task: `type ${keys(c.first[0])}`, why: why || c.why, err, lit: 'none' };
      case 'finish': {
        const w = this.target();
        const rest = w ? w.text.slice(w.typed) : '';
        return { task: rest ? `now type ${rest.length > 6 ? `<b>${rest}</b>` : keys(rest)}` : 'now finish it', why: why || 'a wrong key never moves you on.', err, lit: 'none' };
      }
      case 'pair': {
        const tally = `<span class="tally">${[0, 1].map((i) => `<i${i < 2 - this.left ? ' class="on"' : ''}></i>`).join('')}</span>`;
        return { task: `catch these two ${tally}`, why: why || c.pairWhy, err, lit: 'none' };
      }
      case 'bell': return { task: `the bell rang: press ${keys('Enter')}`, why: why || 'every 8 words the bell rings. hit Enter in time for a line bonus: more ink and focus.', err, lit: 'none' };
      case 'bug': return { task: 'watch the bug', why: why || 'bugs crawl into words and turn a letter into a symbol.', err, lit: 'none' };
      case 'bugged': {
        const w = this.bugged && this.run.words.find((x) => x.id === this.bugged);
        return { task: `catch it: ${w ? keys(w.text) : ''}`, why: why || 'a bugged word gives ×3 ink. type the symbol as you see it.', err, lit: 'none' };
      }
      default: return null;
    }
  }

  say(why, err) { this.ui.say(this.msg(why, err)); }

  onEvent(e) {
    const r = this.run;
    if (e.type === 'error') {
      if (this.step === 'bell') this.say(`press ${keys('Enter')}: the bell is waiting for it.`, true);
      else if (this.step === 'aim' && /[A-Z]/.test(this.cfg.first[0])) this.say(`hold Shift and type ${keys(this.cfg.first[0])}`, true);
      else if (['aim', 'finish', 'pair', 'bugged'].includes(this.step)) this.say('not that key: type the one in the box. a wrong key never moves you on.', true);
      return;
    }
    if (this.step === 'aim' && e.type === 'lock') { this.step = 'finish'; this.ui.cue(); this.say(); return; }
    if (this.step === 'finish' && e.type === 'key') { this.say(); return; }
    if (this.step === 'finish' && e.type === 'catch') {
      this.ui.cue();
      if (this.era === 'computer') {
        // a word for the bug to crawl into
        this.step = 'bug';
        r.tutMark = false;
        const w = placeWord(r, 'cache', { x: FW * 0.78, lane: 3, speed: 6 });
        sendBug(r, w);
        this.say();
      } else {
        this.step = 'pair';
        this.left = 2;
        const faint = this.era === 'future' ? r.t + 1.5 : -99; // faint for a few seconds
        placeWord(r, this.cfg.pair[0], { x: FW * 0.3, lane: 2, speed: 7, born: faint });
        placeWord(r, this.cfg.pair[1], { x: FW * 0.66, lane: 5, speed: 7, born: faint });
        this.say();
      }
      return;
    }
    if (this.step === 'pair' && e.type === 'catch') {
      this.left -= 1;
      if (this.era === 'future') this.say(e.faint ? 'still faint: ×2 ink.' : 'it turned solid first: no bonus. be quicker next time.');
      else this.say();
      if (this.left > 0) return;
      if (this.era === 'typewriter') {
        // the bell: it waits for Enter (the line bonus pays the ink of the words in this line)
        this.step = 'bell';
        r.tutMark = false;
        r.line.count = Math.max(r.line.count, r.st.lineWords);
        r.line.bell = r.st.lineWindow;
        r.events.push({ type: 'bell' });
        this.ui.cue();
        this.say();
      } else this.free('catch faint words early for ×2');
      return;
    }
    if (this.step === 'bell' && e.type === 'line') { this.free('capitals, punctuation, and Enter when the bell rings'); return; }
    if (this.step === 'bug' && e.type === 'bug') { this.step = 'bugged'; this.bugged = e.id; r.tutMark = true; this.ui.cue(); this.say(); return; }
    if ((this.step === 'bug' || this.step === 'bugged') && e.type === 'catch') {
      this.free(e.bugged ? 'catch the bugged words when you see them: ×3' : 'too quick for the bug: bugged words give ×3 when you see them');
    }
  }

  /** The normal page from here on. */
  free(text) {
    const r = this.run;
    this.step = 'free';
    r.tutMark = false;
    r.freezeFocus = false;
    r.freezeBell = false;
    r.noSpawn = false;
    r.spawnT = 0.3;
    this.done = true;
    this.ui.cue();
    this.ui.say({ task: text, hide: 4 });
  }

  tick() {}
}
