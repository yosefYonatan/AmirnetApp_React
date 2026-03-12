import { psychometricDB } from '../data/psychometricDB';
import { lookup as lookupEnriched, lookupFull as lookupAllEnriched } from '../data/academicDB';

// ==========================================
// 🎙️ VOICE KEYWORD EXTRACTOR
// ==========================================

const FILLER = new Set([
  'the','a','an','i','um','uh','like','so','just','okay','ok','please',
  'translate','what','is','means','mean','word','say','type','write',
  'and','or','but','to','of','in','on','at','for','with','my','me',
  'how','do','you','can','tell','give','me','that','this','it','was',
  'are','be','have','has','had','its','he','she','they','we',
]);

export const extractKeyword = (transcript) => {
  const tokens = transcript
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !FILLER.has(w));

  if (tokens.length === 0) return transcript.trim().split(/\s+/)[0] || transcript.trim();
  if (tokens.length === 1) return tokens[0];

  const exactHit = tokens.find(w => psychometricDB[w]);
  if (exactHit) return exactHit;

  const stemHit = tokens.find(w => {
    for (const suffix of ['ing','ed','tion','ations','ation','ness','ment','ful','less','ly','er','est','ies','es','s']) {
      if (w.endsWith(suffix) && w.length > suffix.length + 2) {
        const base = w.slice(0, -suffix.length);
        if (psychometricDB[base]) return true;
      }
    }
    return false;
  });
  if (stemHit) return stemHit;

  return tokens.sort((a, b) => b.length - a.length)[0];
};

// ==========================================
// 🔤 SPELL CHECKER — Levenshtein distance
// ==========================================

const levenshtein = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
};

// Build full word list once at module load (~2400 words, runs in <5ms)
const _allDictionaryWords = (() => {
  const words = new Set(Object.keys(psychometricDB));
  lookupAllEnriched().forEach(e => words.add(e.word.toLowerCase()));
  return [...words];
})();

/**
 * spellCheck(word) — returns the closest dictionary word if within 2 edits.
 * Returns null if the word is already in the DB or no close match found.
 */
export const spellCheck = (word) => {
  const target = word.trim().toLowerCase();
  if (target.length < 3) return null;
  if (psychometricDB[target] || lookupEnriched(target)) return null; // already correct

  let best = null;
  let bestDist = 3; // max edit distance (exclusive)
  for (const w of _allDictionaryWords) {
    if (Math.abs(w.length - target.length) > 2) continue;
    const d = levenshtein(target, w);
    if (d < bestDist && d > 0) {
      bestDist = d;
      best = w;
    }
  }
  return best;
};

// ==========================================
// 🗂️ TOPIC CATEGORIZER
// ==========================================

const FOOD_WORDS = new Set([
  'eat','food','cook','meal','drink','fruit','vegetable','bread','meat','fish',
  'rice','sugar','salt','juice','coffee','tea','milk','cheese','butter','egg',
  'chicken','beef','soup','salad','cake','dessert','hungry','taste','flavor',
  'recipe','restaurant','kitchen','diet','nutrition','calorie','sweet','bitter',
  'sour','spicy','bake','boil','fry','grill','slice','chop','ingredient',
  'portion','menu','appetizer','beverage','snack','cuisine','delicious','savory',
  'pastry','sauce','seasoning','herb','spice','organic','protein','carbohydrate',
]);

const WORK_WORDS = new Set([
  'work','job','office','career','manage','business','employ','profession',
  'company','salary','hire','fire','boss','colleague','team','project','meeting',
  'deadline','client','contract','budget','profit','market','economy','industry',
  'finance','bank','invest','trade','commerce','negotiate','promote','resign',
  'retire','interview','resume','skill','productive','efficient','organize',
  'delegate','supervise','coordinate','analyze','evaluate','achieve','target',
  'goal','strategy','compete','collaborate','innovate','lead','train','recruit',
  'enterprise','executive','department','employee','workforce','revenue','asset',
]);

const TECH_WORDS = new Set([
  'computer','software','internet','digital','data','program','algorithm',
  'system','network','device','mobile','app','code','server','cloud','cyber',
  'robot','artificial','intelligence','machine','technology','electric',
  'electronic','battery','screen','keyboard','mouse','processor','memory',
  'storage','database','security','encrypt','developer','engineer','interface',
  'platform','update','download','upload','connect','wireless','bluetooth',
  'sensor','camera','display','gadget','innovation','automation','virtual',
  'augmented','reality','simulation','prototype','debug','deploy','launch',
]);

const BODY_WORDS = new Set([
  'body','health','doctor','hospital','medicine','sick','pain','heart','brain',
  'muscle','blood','bone','skin','eye','ear','nose','mouth','hand','foot','leg',
  'arm','sleep','exercise','fit','weight','breath','heal','disease','symptom',
  'treatment','surgery','therapy','mental','physical','emotional','stress',
  'anxiety','depression','diagnose','prescribe','patient','nurse','physician',
  'recover','immune','vaccine','allergy','vitamin','nutrition','hygiene',
  'injury','wound','fever','pulse','organ','tissue','cell','dna','gene',
]);

/**
 * categorizeWord(word, inDatabase) — returns category id string.
 * Priority: specific topic > amirnet (generic DB word) > general
 */
export const categorizeWord = (word, inDatabase) => {
  const w = word.toLowerCase();
  if (FOOD_WORDS.has(w)) return 'food';
  if (WORK_WORDS.has(w)) return 'work';
  if (TECH_WORDS.has(w)) return 'tech';
  if (BODY_WORDS.has(w)) return 'body';
  if (inDatabase) return 'amirnet';
  return 'general';
};

// ==========================================
// 🧠 OFFLINE WORD ANALYZER
// ==========================================

const calcScore = (word, penalty = 0) => {
  const lengthBonus = Math.min(15, word.length);
  return Math.min(100, 85 + lengthBonus - penalty);
};

const SUFFIX_RULES = [
  ['inging', 'inge'], ['ying', 'y'],   ['ving', 've'],  ['ning', 'n'],
  ['ting', 't'],      ['ring', 'r'],   ['ing', ''],     ['ed', ''],
  ['ed', 'e'],        ['ities', 'ity'],['ity', ''],     ['ness', ''],
  ['ment', ''],       ['ments', ''],   ['tion', 'te'],  ['tions', 'te'],
  ['sion', 'se'],     ['ation', 'ate'],['ations', 'ate'],['ful', ''],
  ['less', ''],       ['ly', ''],      ['er', ''],      ['est', ''],
  ['ies', 'y'],       ['es', 'e'],     ['es', ''],      ['s', ''],
];

const tryStemming = (word) => {
  for (const [suffix, replacement] of SUFFIX_RULES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const candidate = word.slice(0, -suffix.length) + replacement;
      if (psychometricDB[candidate]) {
        return { baseForm: candidate, translation: psychometricDB[candidate] };
      }
    }
  }
  return null;
};

export const analyzeWord = (rawWord) => {
  const word = rawWord.trim().toLowerCase().replace(/[^a-z'-]/g, '');

  if (!word) {
    return { translation: 'מילה ריקה', score: 0, inDatabase: false, baseForm: null, pos: null, level: null };
  }

  // 1️⃣ Enriched DB (has POS + Level)
  const enriched = lookupEnriched(word);
  if (enriched) {
    return {
      translation: enriched.translation,
      score:       calcScore(word),
      inDatabase:  true,
      baseForm:    null,
      pos:         enriched.pos,
      level:       enriched.level,
    };
  }

  // 2️⃣ Legacy DB
  if (psychometricDB[word]) {
    return {
      translation: psychometricDB[word],
      score:       calcScore(word),
      inDatabase:  true,
      baseForm:    null,
      pos:         null,
      level:       2,
    };
  }

  // 3️⃣ Stemmed match
  const stemResult = tryStemming(word);
  if (stemResult) {
    const enrichedStem = lookupEnriched(stemResult.baseForm);
    return {
      translation: stemResult.translation,
      score:       calcScore(stemResult.baseForm, 5),
      inDatabase:  true,
      baseForm:    stemResult.baseForm,
      pos:         enrichedStem?.pos  ?? null,
      level:       enrichedStem?.level ?? 2,
    };
  }

  // 4️⃣ Not in any database
  return {
    translation: 'מחפש באינטרנט...',
    score:       10,
    inDatabase:  false,
    baseForm:    null,
    pos:         null,
    level:       null,
    loading:     true,
  };
};

// ==========================================
// 🌐 ONLINE FALLBACK — MyMemory Free API
// ==========================================

export const fetchOnlineTranslation = async (word) => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|he`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const data = await res.json();
  const text = data?.responseData?.translatedText?.trim();

  // Normalize: strip punctuation before comparing (catches "play!" = "play")
  const normalize = s => s?.toLowerCase().replace(/[^a-z\u05d0-\u05ea]/g, '') ?? '';
  const failed = !text || data.responseStatus !== 200 ||
    normalize(text) === normalize(word) ||
    text.length < 2;

  if (failed) {
    return { translation: 'לא נמצא', score: 5, inDatabase: false, loading: false, invalid: true };
  }

  // Try to get an alternative translation from matches array
  const matches = data?.matches ?? [];
  const alt = matches
    .filter(m => m.translation && normalize(m.translation) !== normalize(word) && m.translation !== text)
    .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))
    [0]?.translation?.trim();

  const translation = alt && alt !== text
    ? `${text} / ${alt}`
    : text;

  return {
    translation,
    score:      40,
    inDatabase: false,
    loading:    false,
    source:     'online',
  };
};
