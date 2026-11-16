// Game content: eras, the base of a draft, the ink tree (resets when you publish),
// the fame tree (permanent) and the challenges. Effects are turned into numbers in game.js (computeStats).

export const GAME = {
  id: 'incrementalography', // localStorage prefix: unique per game (games share an origin on GitHub Pages)
  name: 'Incrementalography',
};

// value: ink per letter in that era. price: × to every ink upgrade (and to the ink fame asks) in a book of that era.
// speed: how fast words cross (×): harder words, a little slower.
// Look: black on white like A Dark Room; the modern eras turn the lights off (white on black). Each era keeps its own font for the words.
export const ERAS = {
  scriptorium: {
    name: 'Scriptorium', tool: 'quill', value: 1, price: 1, speed: 1,
    keys: 'lowercase letters',
    theme: { bg: '#FFFFFF', ink: '#000000', word: '#000000', muted: '#999999', faint: '#CCCCCC', typed: '#000000', gold: '#000000', line: '#E4E4E4', panel: '#F2F2F2', bug: '#000000' },
    font: "'EB Garamond', Georgia, serif", size: 1.12, ui: 'light',
  },
  typewriter: {
    name: 'Typewriter', tool: 'typewriter', value: 4, price: 2.5, speed: 0.92,
    keys: 'Capitals and punctuation',
    theme: { bg: '#FFFFFF', ink: '#000000', word: '#000000', muted: '#999999', faint: '#CCCCCC', typed: '#000000', gold: '#000000', line: '#E4E4E4', panel: '#F2F2F2', bug: '#000000' },
    font: "'Courier Prime', 'Courier New', monospace", size: 0.98, ui: 'light',
  },
  computer: {
    name: 'Computer', tool: 'keyboard', value: 16, price: 7, speed: 0.86,
    keys: 'numbers and symbols',
    theme: { bg: '#000000', ink: '#FFFFFF', word: '#FFFFFF', muted: '#808080', faint: '#3A3A3A', typed: '#FFFFFF', gold: '#FFFFFF', line: '#1E1E1E', panel: '#111111', bug: '#FFFFFF' },
    font: "'IBM Plex Mono', Menlo, monospace", size: 0.95, ui: 'dark',
  },
  future: {
    name: 'Future', tool: 'mind', value: 64, price: 20, speed: 0.8,
    keys: 'everything, in phrases',
    theme: { bg: '#000000', ink: '#FFFFFF', word: '#FFFFFF', muted: '#808080', faint: '#3A3A3A', typed: '#FFFFFF', gold: '#FFFFFF', line: '#1E1E1E', panel: '#111111', bug: '#FFFFFF' },
    font: "'Space Grotesk', 'Helvetica Neue', sans-serif", size: 0.95, ui: 'dark',
  },
};
export const ERA_IDS = Object.keys(ERAS);

export const CURRENCY = { ink: 'ink', fame: 'fame' };

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
};

export const BRANCHES = {
  center: { name: 'Origin', color: '#8C7B63' },
  value: { name: 'Value', color: '#C08A2E' },
  focus: { name: 'Focus', color: '#4A7BB7' },
  streak: { name: 'Streak', color: '#C2452D' },
  scriptorium: { name: 'Scriptorium', color: '#8E6BBF' },
  typewriter: { name: 'Typewriter', color: '#D0703A' },
  computer: { name: 'Computer', color: '#2E9C8F' },
  future: { name: 'Future', color: '#C85A9E' },
  fame: { name: 'Fame', color: '#B8862B' },
  eras: { name: 'Eras', color: '#8E6BBF' },
  craft: { name: 'Craft', color: '#4A7BB7' },
};

// Effects that multiply (×); everything else adds up (computeStats in game.js sums the effects of what you own)
export const MUL = new Set(['value', 'long', 'theme', 'err', 'drain', 'rate', 'cap', 'illumMult', 'illumRate', 'lineBonus', 'punct', 'bugMult', 'bugRate', 'faintMult', 'phrase', 'fame']);

// ── The trees: columns of a few upgrades each, fed by one upgrade at the bottom (the inkwell).
// Buying an upgrade fills its column with ink up to it (treeview.js). Each column opens after some upgrades (after),
// and inside a column each upgrade needs the one below it. Every upgrade is bought once.
// U(id, name, icon, short, desc, cost, eff, extra) — short: what it does, in a few words.
const U = (id, name, icon, short, desc, cost, eff, extra = {}) => ({ id, name, icon, short, desc, max: 1, cost: { b: cost, k: 1 }, eff, ...extra });

/** A column: its upgrades bottom to top, each needing the one below (the first needs the root). */
function column(branch, root, nodes, { after = 0, era = null } = {}) {
  return nodes.map((n, row) => ({ ...n, branch, row, req: [row ? nodes[row - 1].id : root], after: row ? 0 : after, era: n.era === undefined ? era : n.era }));
}

// Columns: name, shape (the same shape on every upgrade of the column), and the order they stand in
export const COLUMNS = {
  value: { name: 'ink', shape: 'circle' },
  focus: { name: 'focus', shape: 'square' },
  streak: { name: 'streak', shape: 'diamond' },
  scriptorium: { name: 'scriptorium', shape: 'octagon' },
  typewriter: { name: 'typewriter', shape: 'octagon' },
  computer: { name: 'computer', shape: 'octagon' },
  future: { name: 'future', shape: 'octagon' },
  eras: { name: 'eras', shape: 'octagon' },
  readers: { name: 'readers', shape: 'circle' },
  acclaim: { name: 'acclaim', shape: 'pentagon' },
  advance: { name: 'advance', shape: 'circle' },
  craft: { name: 'craft', shape: 'diamond' },
};
export const SHAPES = Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [k, c.shape]));

// ── Ink tree (starts over with each book) ──────────────────────────────────
const MASTER = (era, name, cost, desc) => U(`master_${era}`, name, 'crown', '+50% fame, ×2 ink', `Masterwork: ${desc} Publishing gives +50% fame, and every word gives twice the ink, in every era, for the rest of this book.`, cost,
  { value: 2 }, { allEras: true, news: `Masterwork done: +50% fame when you publish, and twice the ink` });

export const NODES = [
  U('quill', 'Sharp Quill', 'feather', '×2 ink', 'The inkwell that feeds every column: every word gives twice the ink.', 15, { value: 2 }, { branch: 'center', row: 0, req: [] }),

  ...column('value', 'quill', [
    U('ink1', 'Better Ink', 'droplet-plus', '×2 ink', 'Every word gives twice the ink.', 40, { value: 2 }),
    U('long', 'Long Words', 'text-size', 'long words ×3', 'Words of 7 letters or more give three times the ink.', 900, { long: 3 }),
    U('paper', 'Fine Paper', 'droplets', '×3 ink', 'Every word gives three times the ink.', 15000, { value: 3 }),
    U('splash', 'Ink Splash', 'sparkles', '20% of words splash', 'One word in five you catch splashes onto the nearest short word and catches it too.', 150000, { splash: 0.2 },
      { keystone: true, news: 'Ink Splash: some words now splash onto a neighbour and catch it' }),
  ]),
  ...column('focus', 'quill', [
    U('breath', 'Deep Breath', 'hourglass', '+6 s focus', 'More focus: each draft lasts longer.', 60, { focus: 6 }),
    U('wind', 'Second Wind', 'wind', 'clean words +0.5 s', 'Every word you type with no mistake gives back half a second of focus.', 1500, { refill: 0.5 }),
    U('calm', 'Calm', 'shield', 'mistakes cost half', 'Each mistake costs half as much focus.', 20000, { err: 0.5 }),
    U('zone', 'In the Zone', 'target', 'full streak: ×1.5 ink', 'While your streak is full you are In the Zone: focus drains 40% slower and every word gives ×1.5 ink.', 175000, { zone: true },
      { keystone: true, news: 'Fill your streak to get In the Zone' }),
  ], { after: 2 }),
  ...column('streak', 'quill', [
    U('flow', 'Flow', 'bolt', 'streak fills ×2', 'Your streak fills twice as fast.', 100, { rate: 2 }),
    U('steady', 'Steady Hand', 'eraser', '+2 free mistakes', 'Your first two mistakes in each draft don\'t break your streak.', 2400, { steady: 2 },
      { news: 'Your first mistakes each draft no longer break your streak' }),
    U('crescendo', 'Crescendo', 'trending-up', 'streak cap ×3', 'Your streak can grow three times as high.', 30000, { cap: 3 }),
    U('chain', 'Chain', 'link', 'chains up to +100%', 'Catch words less than 1.5 s apart to build a chain: +10% ink per link, up to +100%.', 225000, { chain: true },
      { keystone: true, news: 'Chains: catch words one right after another' }),
  ], { after: 4 }),
  // one column per era, with its own mechanic; they show up once the era is open
  ...column('scriptorium', 'quill', [
    U('illum', 'Illumination', 'sun', 'illuminated words', 'Big illuminated words appear: slow, worth ×4, and they give back focus.', 150, { illum: true },
      { news: 'Illuminated words appear: big, slow and worth ×4' }),
    U('goldleaf', 'Gold Leaf', 'sparkles', 'illuminated ×3, ×2 as often', 'Illuminated words give three times the ink and appear twice as often.', 4500, { illumMult: 3, illumRate: 2 }),
    MASTER('scriptorium', 'Psalter', 100000, 'your finest book of the age.'),
  ], { after: 3, era: 'scriptorium' }),
  ...column('typewriter', 'quill', [
    U('bell', 'Louder Bell', 'bell', 'line bonus ×3', 'The line bonus (Enter after the bell) gives three times the ink.', 400, { lineBonus: 3 }),
    U('touch', 'Touch Typist', 'keyboard', 'punctuated ×2, +1 s', 'Words with capitals or punctuation give twice the ink, and you get a second more to hit Enter.', 18000, { punct: 2, lineWindow: 1 }),
    MASTER('typewriter', 'Novel', 320000, 'your finest book of the age.'),
  ], { era: 'typewriter' }),
  ...column('computer', 'quill', [
    U('debugger', 'Debugger', 'bug', 'bugged words ×3', 'Bugged words (a letter turned into a symbol) give three times the ink.', 1500, { bugMult: 3 }),
    U('swarm', 'Bug Swarm', 'cpu', 'bugs ×2, +1 s each', 'Twice as many bugs, and every bugged word gives back a second of focus.', 45000, { bugRate: 2, bugFocus: 1 }),
    MASTER('computer', 'Source Code', 1000000, 'your finest program.'),
  ], { era: 'computer' }),
  ...column('future', 'quill', [
    U('foresight', 'Foresight', 'eye', 'faint words ×2.5', 'Faint words (caught before they turn solid) give more ink.', 6000, { faintMult: 2.5 }),
    U('lucid', 'Lucid', 'quote', 'phrases ×3, faint +1.5 s', 'Phrases give three times the ink, and words stay faint a second and a half longer.', 240000, { phrase: 3, faintTime: 1.5 }),
    MASTER('future', 'Codex', 4000000, 'your finest book of all, and the way to the Magnum Opus.'),
  ], { era: 'future' }),
];
for (const n of NODES) if (n.id.startsWith('master_')) n.reqAll = NODES.filter((m) => m.branch === n.branch && m.id !== n.id).map((m) => m.id);
export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));
// columns in the order they stand, left to right
export const INK_COLUMNS = ['value', 'focus', 'streak', 'scriptorium', 'typewriter', 'computer', 'future'];

// Prices of the older trees (ids → [base, × per level]), to give the ink and fame back to old saves.
export const OLD_COSTS = {
  1: {
    nib: [40, 1.42], vocab: [260, 1.6], gild: [400, 2.1], lexicon: [1800, 1.65], splash: [9000, 3], breath: [70, 2.1], calm: [320, 2.2], wind: [500, 2.1],
    zone: [4000, 1], rhythm: [90, 1.95], flow: [450, 2.2], steady: [700, 3], chain: [3500, 1], apprentice: [2500, 14], practice: [6000, 1.9], reach: [9000, 2.6],
    guild: [30000, 1.9], illum: [150, 1], goldleaf: [600, 1.9], lamp: [900, 2.4], scribe: [2500, 1.9], quire: [5000, 2.4], chapter: [6500, 2.4],
    master_scriptorium: [40000, 1], bell: [400, 1.85], wide: [1200, 2.4], short: [1500, 2.6], carbon: [6000, 1.9], touch: [12000, 2.1], memo: [15000, 2.4],
    master_typewriter: [120000, 1], debugger: [1500, 1.85], swarm: [4000, 2.4], bounty: [5000, 2.4], compiler: [20000, 1.9], cache: [40000, 2.4],
    macro: [50000, 2.4], master_computer: [400000, 1], foresight: [6000, 1.85], clarity: [15000, 2.4], farsight: [18000, 2.4], synthesis: [80000, 1.9],
    lucid: [150000, 2.1], link: [200000, 2.4], master_future: [1500000, 1],
  },
  2: {
    quill: [15, 1], ink: [40, 2], vocab: [300, 2.1], paper: [2500, 2.2], gild: [3000, 2.2], reading: [6000, 2.4], lexicon: [15000, 2.2], splash: [60000, 3],
    breath: [60, 2.1], calm: [400, 2.2], wind: [3000, 2.2], composure: [15000, 2.6], zone: [40000, 1], flow: [80, 2.2], rhythm: [500, 2], steady: [4000, 2.8],
    momentum: [20000, 3], chain: [50000, 1], apprentice: [8000, 9], practice: [10000, 2], reach: [25000, 2.4], guild: [40000, 2], illum: [150, 1],
    goldleaf: [800, 2.1], lamp: [4000, 2.4], scribe: [6000, 2.1], chapter: [20000, 2.4], master_scriptorium: [80000, 1], bell: [400, 2], wide: [2500, 2.4],
    short: [8000, 2.6], carbon: [15000, 2.1], touch: [50000, 2.1], memo: [60000, 2.4], master_typewriter: [300000, 1], debugger: [1500, 2], swarm: [8000, 2.4],
    bounty: [15000, 2.4], compiler: [40000, 2.1], cache: [120000, 2.4], macro: [150000, 2.4], master_computer: [1000000, 1], foresight: [6000, 2],
    clarity: [30000, 2.4], farsight: [40000, 2.4], synthesis: [150000, 2.1], lucid: [400000, 2.1], link: [500000, 2.4], master_future: [4000000, 1],
  },
  3: {
    quill: [15, 1], ink1: [40, 1], long1: [150, 1], ink2: [600, 1], gold1: [1800, 1], era1: [2500, 1], ink3: [6000, 1], long2: [15000, 1], gold2: [25000, 1],
    read1: [30000, 1], ink4: [50000, 1], era2: [90000, 1], splash: [180000, 1], breath1: [60, 1], calm1: [300, 1], breath2: [1200, 1], calm2: [6000, 1],
    wind1: [3500, 1], drain1: [15000, 1], breath3: [35000, 1], zone: [70000, 1], flow1: [80, 1], cap1: [400, 1], steady1: [1500, 1], flow2: [4000, 1],
    cap2: [7000, 1], start1: [15000, 1], steady2: [30000, 1], chain: [70000, 1], helper1: [9000, 1], practice1: [10000, 1], helper2: [40000, 1],
    reach1: [25000, 1], guild1: [60000, 1], practice2: [120000, 1], helper3: [350000, 1], guild2: [800000, 1], helper4: [2500000, 1], illum: [150, 1],
    goldleaf1: [900, 1], lamp: [3000, 1], scribe: [6000, 1], chapter: [15000, 1], goldleaf2: [25000, 1], vellum: [40000, 1], master_scriptorium: [100000, 1],
    bell: [400, 1], wide: [2500, 1], short: [8000, 1], carbon: [15000, 1], touch: [40000, 1], memo: [50000, 1], ribbon: [100000, 1], master_typewriter: [300000, 1],
    debugger: [1500, 1], swarm: [8000, 1], bounty: [15000, 1], compiler: [40000, 1], cache: [120000, 1], macro: [150000, 1], overclock: [300000, 1],
    master_computer: [1000000, 1], foresight: [6000, 1], clarity: [30000, 1], farsight: [40000, 1], synthesis: [150000, 1], lucid: [400000, 1], link: [500000, 1],
    singularity: [1000000, 1], master_future: [4000000, 1],
  },
  // version 4: the same tree with a helpers column, which is gone
  4: { helper1: [12000, 1], practice: [120000, 1], hands: [1200000, 1], workshop: [6000000, 1] },
  // fame upgrades that are gone are sold back for fame; eras, the Magnum Opus and Editor stay (same ids)
  fame: {
    reputation: [1, 1.75], acclaim: [4, 2.2], headstart: [3, 2.4], muscle: [2, 2.3], stamina: [5, 2.4],
    rep1: [2, 1], rep2: [8, 1], rep3: [30, 1], rep4: [120, 1], rep5: [450, 1], acc1: [6, 1], acc2: [40, 1], acc3: [200, 1],
    hs1: [4, 1], hs2: [30, 1], hs3: [200, 1], mus1: [4, 1], mus2: [25, 1], sta1: [8, 1], sta2: [60, 1], loyal: [6, 1],
  },
};

// ── Fame tree (permanent). The same columns, fed by your pen name (owned from the start).
export const FAME_NODES = [
  U('pen', 'Pen Name', 'pencil', 'your name', 'The name on your books.', 0, {}, { branch: 'center', row: 0, req: [] }),
  ...column('eras', 'pen', [
    U('era_typewriter', 'Typewriter Era', 'keyboard', 'new era', 'A new era: capitals and punctuation, the carriage bell, and words worth ×4. Your next books are written in it.', 3, {}, { eraUnlock: 'typewriter' }),
    U('era_computer', 'Computer Era', 'device-desktop', 'new era', 'A new era: numbers and symbols, bugs that corrupt words, and words worth ×16.', 12, {}, { eraUnlock: 'computer' }),
    U('era_future', 'Future Era', 'planet', 'new era', 'The last era: whole phrases, faint words, and words worth ×64.', 40, {}, { eraUnlock: 'future' }),
    U('opus', 'Magnum Opus', 'trophy', 'opens challenges', 'The book of your life. Needs every era and the Future Masterwork once. Opens the challenges.', 1000, {}, { needsFlag: 'master_future' }),
  ]),
  ...column('readers', 'pen', [
    U('readers1', 'Readers', 'stars', '×2 ink, forever', 'People read your books: twice the ink in every book from now on.', 2, { value: 2 }),
    U('readers2', 'Following', 'stars', '×2 ink, forever', 'Twice the ink again, in every book.', 15, { value: 2 }),
    U('readers3', 'Legend', 'stars', '×2 ink, forever', 'Twice the ink again, in every book.', 120, { value: 2 }),
  ]),
  ...column('acclaim', 'pen', [
    U('acclaim1', 'Acclaim', 'laurel-wreath', 'fame ×1.5', 'Publishing gives half as much fame again.', 6, { fame: 1.5 }),
    U('acclaim2', 'Prize', 'laurel-wreath', 'fame ×1.6', 'Publishing gives even more fame.', 60, { fame: 1.6 }),
  ], { after: 2 }),
  ...column('advance', 'pen', [
    U('advance1', 'Advance', 'gift', 'start with 5K ink', 'Your publisher pays an advance: each new book starts with ink.', 4, { startInk: 5000 }),
    U('advance2', 'Bestseller Deal', 'gift', 'start with 1M ink', 'Each new book starts with a lot of ink.', 60, { startInk: 1e6 }),
  ], { after: 2 }),
  ...column('craft', 'pen', [
    U('memory', 'Muscle Memory', 'bolt', 'start at +50% streak', 'Each draft starts with half your streak already filled, forever.', 5, { start: 0.5 }),
    U('endurance', 'Endurance', 'hourglass', '+5 s focus', 'More focus in every draft, forever.', 10, { focus: 5 }),
    U('editor', 'Editor', 'clipboard-text', 'auto-buys upgrades', 'After each draft, your editor buys the cheapest ink upgrades for you.', 6, { editor: true },
      { news: 'Your editor now buys the cheapest upgrades after each draft' }),
  ], { after: 3 }),
];
export const FAME_COLUMNS = ['eras', 'readers', 'acclaim', 'advance', 'craft'];
export const FAME_BY_ID = Object.fromEntries(FAME_NODES.map((n) => [n.id, n]));
FAME_BY_ID.opus.reqAll = ['era_typewriter', 'era_computer', 'era_future'];
// ── Challenges (open after the Magnum Opus). Tier n asks goal × era price × grow^(n-1) ink in one book.
export const CHALLENGES = [
  { id: 'perfect', name: 'Perfectionist', rule: 'One mistake ends the draft.', reward: 'Streak cap +50% per tier', goal: 1.5e8, grow: 3 },
  { id: 'long', name: 'Long Words', rule: 'Only words of 7 characters or more.', reward: 'Long words ×1.5 per tier', goal: 2e8, grow: 3 },
  { id: 'sprint', name: 'Sprint', rule: 'Focus drains twice as fast.', reward: '+2.5 s of focus per tier', goal: 2.2e8, grow: 3 },
  { id: 'blackout', name: 'Blackout', rule: 'A word\'s letters hide once you start typing it.', reward: 'Fame ×1.3 and ink ×1.2 per tier', goal: 2.6e8, grow: 3 },
];
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
