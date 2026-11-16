// Words that cross the page in each era, and the rules that make each era's keys harder.
// makeWord(era, rng, avoid) returns { text, theme } — the text is exactly what the player types.

const COMMON = `able about above act add after again age ago air all also always and animal answer any apple area arm
around art ask away baby back bad ball bank base be bear beat bed been before begin bell best better big bird
black blue boat body bone book born both box boy bread break bright bring brown build burn busy buy call calm
came can card care carry case cat catch cause cell center chair change charge chart check child choose circle
city class clean clear climb clock close cloud coast cold color come common cook cool copy corn corner cost
could count country course cover cow cross crowd cry cup current cut dance dark day dead deal dear deep desk
did die differ dinner do doctor dog door double down draw dream dress drink drive drop dry duck during each
ear early earth east easy eat edge egg eight either else end enemy enough enter equal even evening event ever
every exact example eye face fact fair fall family far farm fast father fear feel few field fight figure fill
final find fine finger fire first fish five flat floor flow flower fly follow food foot force forest form
forward found four free fresh friend front fruit full game garden gate gather gave gentle get gift girl give
glad glass go gold good grass gray great green ground group grow guess guide hair half hand happy hard hat
have head hear heart heat heavy help here high hill hold hole home hope horse hot hour house huge human hunt
idea inch iron island join joy jump just keep key kind king kitchen knew know lake land large last late laugh
lead learn leave left leg less letter level light like line lion list listen little live long look lost loud
love low lucky machine made main make many map mark market master match matter may meal mean meet melt metal
middle might mile milk mind minute miss modern moment money month moon more morning most mother mountain mouth
move much music must name narrow nation near neck need never new next nice night nine noise north nose note
nothing notice now number object ocean offer office often old once only open orange order other our outside
over own page paint pair paper park part party pass past path pay peace people pick picture piece place plain
plan plant play please plenty point poor power press pretty print problem pull push queen question quick quiet
quite race radio rain raise reach read ready real reason red remember rest rich ride right ring river road rock
roll room root rope rose round row rule run safe said sail salt same sand save say school science sea season
seat second seed seem sell send sense seven shadow shape share sharp she sheep shell shine ship shoe shop short
should shoulder show side sign silent silver simple since sing sister sit six size skill skin sky sleep slow
small smell smile snow soft soil some song soon sound south space speak special speed spell spend spring square
stand star start state stay steam step stick still stone stop store storm story straight strange stream street
strong study such sugar summer sun supply sure surface sweet swim table tail take talk tall teach team tell ten
test than thank that their them then there these thick thin thing think third those though three through throw
tiny today together told tomorrow tone took tool top touch toward town track trade train travel tree trip true
try turn twelve twenty two under until upon usual valley value very village visit voice wait walk wall want warm
wash watch water wave way wear weather week weight well west wet what wheel when where which while white whole
why wide wild will wind window winter wish with woman wonder wood word work world write yard year yellow young`
  .split(/\s+/).filter((w) => w.length >= 3);

const THEME = {
  scriptorium: `quill parchment vellum scribe monk candle psalter codex ink abbey chapel folio margin gospel lectern
rubric scroll cloister prayer vespers gilded inkwell quire binding latin chant relic tome verse hymn bishop
friar abbot copyist pigment lapis bell altar candle wax seal library ledger saint pilgrim cellar choir lantern
manuscript chronicle psalm`.split(/\s+/).filter(Boolean),
  typewriter: `ribbon carriage platen typist memo telegram office carbon ledger bell margin shift return novel
draft editor deadline newsroom headline inkpad lever spool clatter typebar keys paper staple folder clerk
report column press reporter story chapter letter stamp envelope desk lamp coffee cigar drawer`.split(/\s+/).filter(Boolean),
  computer: `pixel cursor kernel buffer binary debug server router cache script modem floppy compile syntax macro
array query loop byte chip disk laptop mouse login admin patch pointer stack thread socket token vector
render shell bash commit merge branch deploy proxy cookie`.split(/\s+/).filter(Boolean),
  future: `neural quantum orbit hologram android nebula fusion cipher photon synth drone nova vector lunar plasma
cortex signal echo cyborg galaxy beacon warp ion comet zenith aurora hyper nano robot laser solar stellar
oracle dream memory`.split(/\s+/).filter(Boolean),
};

// Long words for the Scriptorium's illuminated words
export const ILLUMINATED = `illumination manuscript scriptorium calligraphy benediction monastery cathedral
chronicle marginalia pilgrimage parchment candlelight bestiary reliquary vespertine sanctuary psalterium
breviary antiphonary evangelist`.split(/\s+/).filter(Boolean);

const CONTRACTIONS = ["Don't", "It's", "Can't", "I'm", "We're", "You'll", "Won't", "That's", "Isn't", "Let's", "She's", "They're", "Didn't", "I'd", "We'll"];
const PUNCT = [',', '.', ';', ':', '!', '?'];
const EXT = ['txt', 'js', 'exe', 'png', 'log', 'csv', 'md', 'py'];

const cap = (w) => w[0].toUpperCase() + w.slice(1);
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const digit = (rng) => String(Math.floor(rng() * 10));
const num = (rng, max = 100) => String(Math.floor(rng() * max));

/** Typewriter: every word starts with a capital, many end in punctuation, some are contractions. */
function typewriterize(w, rng) {
  if (rng() < 0.12) return pick(rng, CONTRACTIONS);
  let t = cap(w);
  if (rng() < 0.4) t += pick(rng, PUNCT);
  else if (rng() < 0.08) t += "'s";
  return t;
}

/** Computer: every word has numbers or symbols in it. */
function computerize(w, rng) {
  const r = rng();
  const short = w.length > 6 ? w.slice(0, 6) : w;
  if (r < 0.12) return `${short}_${digit(rng)}`;
  if (r < 0.22) return `${short}${num(rng)}`;
  if (r < 0.31) return `#${short}`;
  if (r < 0.39) return `@${short}`;
  if (r < 0.49) return `${short}.${pick(rng, EXT)}`;
  if (r < 0.56) return `v${digit(rng)}.${digit(rng)}`;
  if (r < 0.63) return `${short[0]}=${num(rng, 50)}`;
  if (r < 0.71) return `${short}()`;
  if (r < 0.77) return `${short}++`;
  if (r < 0.83) return `$${short}`;
  if (r < 0.88) return `[${short}]`;
  if (r < 0.93) return `~/${short}`;
  if (r < 0.97) return `${num(rng)}%`;
  return `0x${(Math.floor(rng() * 255) + 16).toString(16).toUpperCase()}`;
}

/** Future: everything at once — short phrases with capitals, numbers and punctuation. */
function futurize(w, rng, other) {
  const r = rng();
  if (r < 0.3) return `${cap(w)} ${num(rng, 999)}`;
  if (r < 0.55) return `${cap(w)} ${other}${pick(rng, PUNCT)}`;
  if (r < 0.75) return `${w}, ${cap(other)}!`;
  if (r < 0.9) return `${cap(w)}-${digit(rng)}${digit(rng)}`;
  return `${cap(w)} ${other} ${num(rng, 99)}.`;
}

const TRANSFORM = { scriptorium: (w) => w, typewriter: typewriterize, computer: computerize, future: futurize };

/**
 * A new word for the era. avoid: set of first characters already on the page (so typing a letter is never ambiguous).
 * opts.themeShare: chance of an era word; opts.minLen: minimum length (Long Words challenge).
 */
export function makeWord(era, rng, avoid = new Set(), opts = {}) {
  const themeShare = opts.themeShare ?? 0.25;
  const minLen = opts.minLen || 0;
  let best = null;
  for (let i = 0; i < 12; i++) {
    const theme = rng() < themeShare;
    const pool = theme ? THEME[era] : COMMON;
    let base = pick(rng, pool);
    if (minLen && base.length < minLen && era !== 'future') {
      const longer = pool.filter((w) => w.length >= minLen);
      base = longer.length ? pick(rng, longer) : pick(rng, ILLUMINATED);
    }
    const other = pick(rng, rng() < 0.5 ? THEME[era] : COMMON);
    const text = TRANSFORM[era](base, rng, other);
    if (minLen && text.length < minLen) continue;
    best = { text, theme };
    if (!avoid.has(text[0])) return best;
  }
  return best || { text: pick(rng, COMMON), theme: false };
}

export function makeIlluminated(rng, avoid = new Set()) {
  for (let i = 0; i < 10; i++) {
    const w = pick(rng, ILLUMINATED);
    if (!avoid.has(w[0])) return w;
  }
  return pick(rng, ILLUMINATED);
}

// Bugs swap a letter for a look-alike symbol
export const LEET = { a: '@', e: '3', i: '!', o: '0', s: '$', t: '+', l: '1', g: '9', b: '8' };

/** A few words of the era (the title screen lets them drift past). */
export const themeWords = (era) => THEME[era] || THEME.scriptorium;
