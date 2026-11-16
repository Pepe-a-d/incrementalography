// Game content: the four eras (each with its own tree of 10 upgrades, its boss and its trophy) and the base of a draft.
// Effects are turned into numbers in game.js (computeStats).

export const GAME = {
  id: 'incrementalography', // localStorage prefix: unique per game (games share an origin on GitHub Pages)
  name: 'Incrementalography',
};

// value: ink per letter in that era (each era starts well above where the last one ended). speed: how fast words cross (×).
// resource: what the focus bar is in that era. boss: the book you write once the whole tree is bought.
// trophy: what beating the boss leaves you for the rest of the game.
// Look (style A, each era its own material): parchment and candlelight; a sheet of paper on a dark desk; a green phosphor
// terminal; dark glass with cyan and magenta. theme: the colours of the screen; page: of the page the words cross, if
// different; font: the words; ui: everything else.
export const ERAS = {
  scriptorium: {
    next: 'typewriter', resource: 'candle', columns: ['s_quill', 's_candle', 's_gold'], root: 'quill',
    boss: { name: "The Abbot's Codex", icon: 'book', rule: 'The Abbot dictates. Copy each verse before the candle burns out.', phases: ['the abbot dictates', 'illuminated words: write them without a slip', 'the wind rises: write from memory'], tip: 'type each verse as the Abbot says it, spaces too. the candle only burns while there is something to copy.' },
    trophy: { name: "The Abbot's Seal", icon: 'award', short: 'mistakes cost 25% less', eff: { err: 0.75 } },
    name: 'Scriptorium', tool: 'quill', value: 1, speed: 1,
    keys: 'lowercase letters',
    theme: { bg: '#F1E6CC', ink: '#2B1D14', word: '#2B1D14', muted: '#8C7A5E', faint: '#CDBB94', typed: '#2B1D14', gold: '#B8892B', line: '#DECDA8', panel: '#E8DBBB', bug: '#9E1B1B', accent: '#9E1B1B' },
    font: "'EB Garamond', Georgia, serif", ui: "'EB Garamond', Georgia, serif", size: 1.12, mode: 'light',
  },
  typewriter: {
    next: 'computer', resource: 'ribbon', columns: ['t_keys', 't_carriage', 't_coffee'], root: 'ribbon',
    boss: { name: 'The Deadline', icon: 'clock', rule: 'The press starts at midnight. Type the front page before it does.', phases: ['the press warms up', 'the red pencil strikes', 'the press is rolling'], tip: 'type each line, then Enter when the bell rings. capitals and punctuation count.' },
    trophy: { name: 'The Golden Bell', icon: 'bell-ringing', short: '+4 s every draft', eff: { focus: 4 } },
    name: 'Typewriter', tool: 'typewriter', value: 30, speed: 0.92,
    keys: 'Capitals and punctuation',
    // the chrome is a dark desk; the words are typed on a sheet of paper in the middle (page)
    theme: { bg: '#2B2522', ink: '#EFE6D2', word: '#EFE6D2', muted: '#A89C88', faint: '#5E554C', typed: '#EFE6D2', gold: '#E0B341', line: '#463D37', panel: '#352E2A', bug: '#D2432F', accent: '#D2432F' },
    page: { bg: '#F6F1E3', ink: '#1A1A1A', word: '#1A1A1A', muted: '#8E8676', faint: '#C9C1AE', typed: '#1A1A1A', gold: '#B3261E', line: '#E4DCC8', panel: '#EEE7D5', bug: '#B3261E', accent: '#B3261E' },
    font: "'Courier Prime', 'Courier New', monospace", ui: "'Courier Prime', 'Courier New', monospace", size: 0.98, mode: 'dark',
  },
  computer: {
    next: 'future', resource: 'battery', columns: ['c_code', 'c_debug', 'c_memory'], root: 'keyboard', longLen: 8,
    boss: { name: 'The Worm', icon: 'bug', rule: 'A virus crawls towards your files. Type its pieces to break it.', phases: ['the worm crawls in', 'it splits in two', 'corrupted letters'], tip: 'type a piece of the worm to break it: its first character picks it. stop the head before it reaches your files.' },
    trophy: { name: 'Root Access', icon: 'terminal-2', short: 'streak starts at +25%', eff: { start: 0.25 } },
    name: 'Computer', tool: 'keyboard', value: 500, speed: 0.86,
    keys: 'numbers and symbols',
    theme: { bg: '#040A05', ink: '#3CFF73', word: '#3CFF73', muted: '#23A04F', faint: '#165A2C', typed: '#C8FF3C', gold: '#C8FF3C', line: '#0F2A17', panel: '#08140B', bug: '#C8FF3C', accent: '#C8FF3C' },
    font: "'IBM Plex Mono', Menlo, monospace", ui: "'IBM Plex Mono', Menlo, monospace", size: 0.95, mode: 'dark',
  },
  future: {
    next: null, resource: 'signal', columns: ['f_vision', 'f_orbit', 'f_signal'], root: 'neural',
    boss: { name: 'The Echo', icon: 'wave-sine', rule: 'A machine writes against you. Finish each phrase before it does.', phases: ['the echo listens', 'it scrambles your words', 'phrases vanish'], tip: 'type each phrase before the magenta cursor gets to the end of it.' },
    trophy: { name: 'The Last Page', icon: 'book-2', short: 'a second edition', eff: {} },
    name: 'Future', tool: 'mind', value: 60000, speed: 0.8,
    keys: 'everything, in phrases',
    theme: { bg: '#0A0A1C', ink: '#E8E6FF', word: '#E8E6FF', muted: '#8584B8', faint: '#34345E', typed: '#5EF2FF', gold: '#FF4FD8', line: '#1E1E44', panel: '#121230', bug: '#FF4FD8', accent: '#5EF2FF' },
    font: "'Space Grotesk', 'Helvetica Neue', sans-serif", ui: "'Space Grotesk', 'Helvetica Neue', sans-serif", size: 0.95, mode: 'dark',
  },
};
export const ERA_IDS = Object.keys(ERAS);

// Base of a draft (before upgrades)
export const BASE = {
  focus: 20, // seconds of focus
  errCost: 1.4, // focus lost per mistake
  refill: 0.35, // focus back per perfect word
  refillCap: 0.5, // a draft wins back at most half of its focus
  streakRate: 0.02, // streak bonus per correct key (+2 %)
  streakCap: 1, // +100 %
  gold: 0.03, // chance of a golden word
  goldMult: 5,
  themeShare: 0.25,
  themeMult: 2,
  longLen: 7, // Vocabulary: words this long or more
  illumEvery: 8, // seconds between illuminated words
  illumMult: 4,
  illumFocus: 1.5,
  crossTime: 11, // seconds a word needs to cross the page
  words: 7, // words on the page at once
  lineWords: 8, // Typewriter: words per line before the bell
  lineWindow: 2.2, // seconds to hit Enter after the bell
  lineBonus: 0.5, // +50 % of the line's ink
  lineFocus: 1.5,
  bugEvery: 3.2, // Computer: seconds between bugs
  bugMult: 3,
  chainWindow: 1.5, // Chain: seconds between catches
  chainStep: 0.1,
  chainCap: 1,
  zoneDrain: 0.6, // In the Zone: focus drain ×
  zoneMult: 1.5,
  faintTime: 2.6, // Future: seconds a word stays faint
  faintMult: 2,
  pageEvery: 5, // Typewriter, Full Page: every 5 lines…
  pageTime: 5, // …5 s of…
  pageMult: 2, // …×2 ink
  novaEvery: 15, // Future, Nova: every 15th word…
  novaMult: 5, // …×5 ink
};

// Effects that multiply (×); everything else adds up (computeStats in game.js sums the effects of what you own)
export const MUL = new Set(['value', 'long', 'theme', 'err', 'drain', 'rate', 'cap', 'illumMult', 'illumRate', 'lineBonus', 'punct', 'bugMult', 'bugRate',
  'faintMult', 'phrase', 'speed', 'goldMult', 'goldRate']);

// ── The trees: one per era, 10 upgrades each. A root (the inkwell at the bottom) and three columns of three, each
// upgrade needing the one below it; the second column opens after 2 upgrades, the third after 4. Every upgrade is
// bought once. Once all 10 are bought, the era's book (its boss) is ready.
// U(id, name, icon, short, desc, cost, eff, extra) — short: what it does, in a few words.
const U = (id, name, icon, short, desc, cost, eff, extra = {}) => ({ id, name, icon, short, desc, max: 1, cost: { b: cost, k: 1 }, eff, ...extra });

/** A column: its upgrades bottom to top, each needing the one below (the first needs the root). */
function column(era, branch, root, nodes, { after = 0 } = {}) {
  return nodes.map((n, row) => ({ ...n, era, branch, row, req: [row ? nodes[row - 1].id : root], after: row ? 0 : after }));
}
const root = (era, n) => ({ ...n, era, branch: 'center', row: 0, req: [], after: 0 });

// Columns: name and shape (the same shape on every upgrade of the column)
export const COLUMNS = {
  s_quill: { name: 'quill', shape: 'circle' },
  s_candle: { name: 'candle', shape: 'square' },
  s_gold: { name: 'gold', shape: 'diamond' },
  t_keys: { name: 'keys', shape: 'circle' },
  t_carriage: { name: 'carriage', shape: 'square' },
  t_coffee: { name: 'coffee', shape: 'diamond' },
  c_code: { name: 'code', shape: 'circle' },
  c_debug: { name: 'debug', shape: 'square' },
  c_memory: { name: 'memory', shape: 'diamond' },
  f_vision: { name: 'vision', shape: 'circle' },
  f_orbit: { name: 'orbit', shape: 'square' },
  f_signal: { name: 'signal', shape: 'diamond' },
};
export const SHAPES = Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [k, c.shape]));

// Each tree's prices, in the order its upgrades are meant to be bought: the root, then the columns interleaved
// (col 1, col 2, col 1, col 3, col 2, col 1, col 3, col 2, col 3). Worked out by sim/ladder.mjs from the pace we want.
export const LADDER = {
  scriptorium: [15, 450, 1300, 2000, 4000, 9000, 12000, 14000, 19000, 22500],
  typewriter: [4500, 22500, 35000, 65000, 140000, 200000, 225000, 275000, 425000, 475000],
  computer: [95000, 450000, 1300000, 3500000, 8500000, 11000000, 18000000, 20000000, 25000000, 30000000],
  future: [9000000, 45000000, 60000000, 85000000, 160000000, 225000000, 300000000, 650000000, 800000000, 900000000],
};
const [LS, LT, LC, LF] = ['scriptorium', 'typewriter', 'computer', 'future'].map((e) => LADDER[e]);

export const NODES = [
  // ── Scriptorium: lowercase words; golden and illuminated words
  root('scriptorium', U('quill', 'Sharp Quill', 'feather', '×2 ink', 'The inkwell that feeds every column: every word gives twice the ink.', LS[0], { value: 2 })),
  ...column('scriptorium', 's_quill', 'quill', [
    U('oakgall', 'Oak-gall Ink', 'droplet-plus', '×2 ink', 'Black ink that never fades: every word gives twice the ink.', LS[1], { value: 2 }),
    U('long', 'Long Words', 'text-size', 'long words ×3', 'Words of 7 letters or more give three times the ink.', LS[3], { long: 3 }),
    U('splash', 'Ink Splash', 'droplets', '20% of words splash', 'One word in five you catch splashes onto the nearest short word and catches it too.', LS[6], { splash: 0.2 },
      { news: 'Ink Splash: some words now splash onto a neighbour and catch it' }),
  ]),
  ...column('scriptorium', 's_candle', 'quill', [
    U('beeswax', 'Beeswax', 'candle', '+6 s candle', 'A better candle: each draft lasts six seconds longer.', LS[2], { focus: 6 }),
    U('steady', 'Steady Hand', 'shield', 'mistakes cost half', 'Each mistake burns half as much candle.', LS[5], { err: 0.5 }),
    U('vigil', 'Vigil', 'moon', 'clean words +0.5 s', 'Every word you write with no mistake gives back half a second of candle.', LS[8], { refill: 0.5 }),
  ], { after: 2 }),
  ...column('scriptorium', 's_gold', 'quill', [
    U('illum', 'Illumination', 'sun', 'illuminated words', 'Big illuminated words appear: slow, worth ×4, and they give back candle.', LS[4], { illum: true },
      { news: 'Illuminated words appear: big, slow and worth ×4' }),
    U('goldleaf', 'Gold Leaf', 'sparkles', 'golden words ×3, ×2 as often', 'Golden words give three times the ink and appear twice as often.', LS[7], { goldMult: 3, goldRate: 2 }),
    U('psalmody', 'Psalmody', 'music', 'streak fills ×2', 'Write like a chant: your streak fills twice as fast.', LS[9], { rate: 2 }),
  ], { after: 4 }),

  // ── Typewriter: capitals and punctuation; the bell and Enter at the end of each line
  root('typewriter', U('ribbon', 'Fresh Ribbon', 'typography', '×2 ink', 'A new ribbon feeds every column: every word gives twice the ink.', LT[0], { value: 2 })),
  ...column('typewriter', 't_keys', 'ribbon', [
    U('touch', 'Touch Typing', 'hand-finger', 'streak fills ×2', 'Eyes on the page: your streak fills twice as fast.', LT[1], { rate: 2 }),
    U('punct', 'Punctuation', 'exclamation-mark', 'punctuated ×3', 'Words with punctuation or an apostrophe give three times the ink.', LT[3], { punct: 3 }),
    U('rhythm', 'Rhythm', 'trending-up', 'streak cap ×3', 'Your streak can grow three times as high.', LT[6], { cap: 3 }),
  ]),
  ...column('typewriter', 't_carriage', 'ribbon', [
    U('bell', 'Louder Bell', 'bell', 'line bonus ×3', 'Enter after the bell gives three times the line bonus.', LT[2], { lineBonus: 3 }),
    U('return', 'Quick Return', 'corner-down-left', '+1 s for Enter, +2 s ribbon', 'A second more to hit Enter after the bell, and every line gives back two seconds of ribbon.', LT[5], { lineWindow: 1, lineFocus: 2 }),
    U('fullpage', 'Full Page', 'file-text', 'every 5 lines: ×2 for 5 s', 'Every fifth line fills a page: for five seconds every word gives twice the ink.', LT[8], { page: true },
      { news: 'Full Page: every fifth line doubles your ink for a moment' }),
  ], { after: 2 }),
  ...column('typewriter', 't_coffee', 'ribbon', [
    U('coffee', 'Strong Coffee', 'coffee', '+6 s ribbon', 'Each draft lasts six seconds longer.', LT[4], { focus: 6 }),
    U('carbon', 'Carbon Copy', 'copy', '25% of words count twice', 'One word in four leaves a carbon copy: it counts twice.', LT[7], { carbon: 0.25 }),
    U('tape', 'Correction Tape', 'eraser', '+2 free mistakes', 'Your first two mistakes in each draft don\'t break your streak.', LT[9], { steady: 2 }),
  ], { after: 4 }),

  // ── Computer: numbers and symbols; bugs that corrupt words
  root('computer', U('keyboard', 'Mechanical Keyboard', 'keyboard', '×2 ink', 'Clicky keys feed every column: every word gives twice the ink.', LC[0], { value: 2 })),
  ...column('computer', 'c_code', 'keyboard', [
    U('syntax', 'Syntax', 'code', '×2 ink', 'Code you can read at a glance: every word gives twice the ink.', LC[1], { value: 2 }),
    U('compiler', 'Compiler', 'braces', '8+ characters ×3', 'Words of 8 characters or more give three times the ink.', LC[3], { long: 3 }),
    U('macro', 'Macro', 'link', 'chains up to +100%', 'Catch words less than 1.5 s apart to build a chain: +10% ink per link, up to +100%.', LC[6], { chain: true },
      { news: 'Chains: catch words one right after another' }),
  ]),
  ...column('computer', 'c_debug', 'keyboard', [
    U('debugger', 'Debugger', 'bug', 'bugged words ×3', 'Bugged words (a letter turned into a symbol) give three times the ink.', LC[2], { bugMult: 3 }),
    U('swarm', 'Bug Swarm', 'cpu', 'twice the bugs', 'Twice as many bugs crawl in.', LC[5], { bugRate: 2 }),
    U('patch', 'Patch', 'bandage', 'bugged words +1 s', 'Every bugged word you catch gives back a second of battery.', LC[8], { bugFocus: 1 }),
  ], { after: 2 }),
  ...column('computer', 'c_memory', 'keyboard', [
    U('ram', 'More RAM', 'database', '+6 s battery', 'Each draft lasts six seconds longer.', LC[4], { focus: 6 }),
    U('cache', 'Cache', 'bolt', 'clean words +0.5 s', 'Every word you type with no mistake gives back half a second of battery.', LC[7], { refill: 0.5 }),
    U('overclock', 'Overclock', 'gauge', 'words 20% faster, ×1.5 ink', 'Everything runs hot: words cross 20% faster, and every word gives half as much ink again.', LC[9], { speed: 1.2, value: 1.5 }),
  ], { after: 4 }),

  // ── Future: phrases; faint words worth more while they last
  root('future', U('neural', 'Neural Link', 'brain', '×2 ink', 'Thought straight to text feeds every column: every word gives twice the ink.', LF[0], { value: 2 })),
  ...column('future', 'f_vision', 'neural', [
    U('clairvoyance', 'Clairvoyance', 'eye', 'faint words ×3', 'Faint words (caught before they turn solid) give three times as much.', LF[1], { faintMult: 3 }),
    U('lucid', 'Lucid', 'eyeglass', 'faint +1.5 s', 'New words stay faint a second and a half longer.', LF[3], { faintTime: 1.5 }),
    U('prophecy', 'Prophecy', 'quote', 'phrases ×3', 'Phrases (words with spaces) give three times the ink.', LF[6], { phrase: 3 }),
  ]),
  ...column('future', 'f_orbit', 'neural', [
    U('flow', 'Flow', 'wave-sine', 'streak fills ×2', 'Your streak fills twice as fast.', LF[2], { rate: 2 }),
    U('zone', 'In the Zone', 'target', 'full streak: ×1.5 ink', 'While your streak is full you are In the Zone: the signal fades 40% slower and every word gives ×1.5 ink.', LF[5], { zone: true },
      { news: 'Fill your streak to get In the Zone' }),
    U('nova', 'Nova', 'planet', 'every 15th word ×5', 'Every fifteenth word you catch bursts into a nova: five times the ink.', LF[8], { nova: true },
      { news: 'Nova: every fifteenth word is worth five times as much' }),
  ], { after: 2 }),
  ...column('future', 'f_signal', 'neural', [
    U('amplifier', 'Amplifier', 'antenna-bars-5', '+6 s signal', 'Each draft lasts six seconds longer.', LF[4], { focus: 6 }),
    U('stillness', 'Stillness', 'shield', 'mistakes cost half', 'Each mistake costs half as much signal.', LF[7], { err: 0.5 }),
    U('crescendo', 'Crescendo', 'trending-up', 'streak cap ×3', 'Your streak can grow three times as high.', LF[9], { cap: 3 }),
  ], { after: 4 }),
];
export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const ERA_NODES = Object.fromEntries(ERA_IDS.map((e) => [e, NODES.filter((n) => n.era === e)]));
