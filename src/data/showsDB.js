// ==========================================
// showsDB.js — TV Show metadata, episode counts & theme vocabulary
//
// seasons: array where index 0 = Season 1, value = episode count
// poster:  TMDB poster path — replace null with your own URL or TMDB path
//          Format: https://image.tmdb.org/t/p/w300/{poster}
// vocab:   Show-specific themed vocabulary words (English → Hebrew)
// ==========================================

export const SHOWS_DB = {
  'How I Met Your Mother': {
    id: 'himym',
    emoji: '🍺',
    gradient: 'from-yellow-600 to-amber-800',
    bgColor: 'bg-yellow-900/30',
    borderColor: 'border-yellow-700/40',
    // TMDB ID: 1100 — add poster path from https://www.themoviedb.org/tv/1100
    poster: null,
    description: 'קומדיה רומנטית — ניו יורק, חברות ואהבה',
    seasons: [22, 22, 20, 24, 24, 24, 24, 24, 24], // S1–S9
    themes: ['dating', 'romance', 'friendship', 'NYC', 'comedy'],
    vocab: [
      { word: 'legendary',    translation: 'אגדי' },
      { word: 'commitment',   translation: 'מחויבות' },
      { word: 'infatuation',  translation: 'הלהבה, אהבה חולפת' },
      { word: 'compatible',   translation: 'תואם, מתאים' },
      { word: 'vulnerable',   translation: 'פגיע, חשוף' },
      { word: 'chemistry',    translation: 'כימיה (בין אנשים)' },
      { word: 'affection',    translation: 'חיבה, אהבה' },
      { word: 'spontaneous',  translation: 'ספונטני' },
      { word: 'charismatic',  translation: 'כריזמטי' },
      { word: 'nostalgia',    translation: 'נוסטלגיה, געגוע' },
      { word: 'destiny',      translation: 'גורל' },
      { word: 'coincidence',  translation: 'צירוף מקרים' },
      { word: 'flirtatious',  translation: 'פלירטטני' },
      { word: 'persistent',   translation: 'מתמיד, עקשן' },
      { word: 'narrative',    translation: 'נרטיב, סיפור' },
      { word: 'ambivalent',   translation: 'אמביוולנטי, דו-ערכי' },
      { word: 'transition',   translation: 'מעבר, שינוי' },
      { word: 'anticipate',   translation: 'לצפות מראש' },
      { word: 'architect',    translation: 'אדריכל' },
      { word: 'elaborate',    translation: 'מפורט, מורכב' },
    ],
    // Episode summaries S1 (word hints per episode)
    episodes: {
      1: { 1: { summary: 'טד פוגש רובין ומנסה לרשום אותה — הכרת הדמויות', words: ['encounter', 'attraction', 'nervous', 'destiny'] },
           2: { summary: 'המסיבה הסגולה — ניסיון שני לרשות רובין', words: ['persistent', 'strategy', 'embarrass', 'confident'] },
           3: { summary: 'האגרוף — מרשל ובארני מתחילים מסורת', words: ['tradition', 'consequence', 'impulsive', 'inevitable'] },
           4: { summary: 'ריטחאול — גרייס מגיעה לסצנה', words: ['jealousy', 'competition', 'awkward', 'genuine'] },
           5: { summary: 'קוד של ברוס — כיצד מגיעים לאנשים', words: ['approach', 'confidence', 'technique', 'vulnerable'] },
           6: { summary: 'בר בדרמה — ניצחון ראשון', words: ['triumph', 'celebrate', 'milestone', 'reward'] },
           7: { summary: 'בעיית הטלפון', words: ['communication', 'anxiety', 'overthink', 'paranoid'] },
           8: { summary: 'הלילה עם פאם', words: ['temptation', 'loyalty', 'betray', 'resist'] } },
    },
  },

  'Friends': {
    id: 'friends',
    emoji: '☕',
    gradient: 'from-orange-500 to-rose-700',
    bgColor: 'bg-orange-900/30',
    borderColor: 'border-orange-700/40',
    // TMDB ID: 1668
    poster: null,
    description: 'שישה חברים בניו יורק — אהבה, עבודה וחיים',
    seasons: [24, 24, 25, 24, 24, 25, 24, 24, 24, 18], // S1–S10
    themes: ['friendship', 'romance', 'humor', 'NYC', 'workplace'],
    vocab: [
      { word: 'reunion',       translation: 'מפגש מחדש' },
      { word: 'neurotic',      translation: 'נוירוטי, חרדתי' },
      { word: 'sarcastic',     translation: 'סרקסטי, ציני' },
      { word: 'complicated',   translation: 'מסובך' },
      { word: 'jealousy',      translation: 'קנאה' },
      { word: 'loyalty',       translation: 'נאמנות' },
      { word: 'engagement',    translation: 'אירוסין; מחויבות' },
      { word: 'hilarious',     translation: 'מצחיק מאוד' },
      { word: 'obsessive',     translation: 'אובססיבי' },
      { word: 'empathetic',    translation: 'אמפתי' },
      { word: 'competitive',   translation: 'תחרותי' },
      { word: 'pretentious',   translation: 'יהיר, מתנשא' },
      { word: 'catastrophe',   translation: 'אסון, קטסטרופה' },
      { word: 'reconcile',     translation: 'להתפייס, לפשר' },
      { word: 'confide',       translation: 'לפתוח את הלב, לסמוך' },
      { word: 'appreciate',    translation: 'להעריך' },
      { word: 'bizarre',       translation: 'מוזר, אקסצנטרי' },
      { word: 'philosophical', translation: 'פילוסופי' },
      { word: 'dependent',     translation: 'תלותי, תלוי' },
      { word: 'genuine',       translation: 'אמיתי, כן' },
    ],
    episodes: {
      1: { 1: { summary: 'הפיילוט — רייצ\'ל מגיעה רטובה בשמלת כלה', words: ['runaway', 'independent', 'terrified', 'welcome'] },
           2: { summary: 'הסונר — טד רוצה את רייצ\'ל', words: ['attraction', 'jealousy', 'awkward', 'honest'] },
           3: { summary: 'בן זוג עם כיוון', words: ['relationship', 'compatible', 'commitment', 'nervous'] },
           4: { summary: 'המקרה עם הכובע הכחול', words: ['negotiate', 'boundaries', 'embarrass', 'genuine'] },
           5: { summary: 'המקרה עם המסיבה הנוספת', words: ['overwhelm', 'anxious', 'invite', 'celebrate'] } },
    },
  },

  'The Office': {
    id: 'office',
    emoji: '📋',
    gradient: 'from-slate-500 to-slate-700',
    bgColor: 'bg-slate-800/50',
    borderColor: 'border-slate-600/40',
    // TMDB ID: 2316
    poster: null,
    description: 'משרד נייר בסקרנטון — קומדיה מצולמת כמסמך',
    seasons: [6, 22, 25, 19, 28, 26, 26, 24, 25], // S1–S9
    themes: ['workplace', 'management', 'office', 'humor', 'corporate'],
    vocab: [
      { word: 'corporate',     translation: 'תאגידי, ארגוני' },
      { word: 'hierarchy',     translation: 'היררכיה' },
      { word: 'bureaucratic',  translation: 'בירוקרטי' },
      { word: 'efficiency',    translation: 'יעילות' },
      { word: 'productivity',  translation: 'פרודוקטיביות' },
      { word: 'motivation',    translation: 'מוטיבציה, תמריץ' },
      { word: 'leadership',    translation: 'מנהיגות' },
      { word: 'negotiate',     translation: 'לנהל משא ומתן' },
      { word: 'commission',    translation: 'עמלה; ועדה' },
      { word: 'incentive',     translation: 'תמריץ' },
      { word: 'redundant',     translation: 'מיותר; מפוטר' },
      { word: 'accountability', translation: 'אחריות, נאחדות' },
      { word: 'strategy',      translation: 'אסטרטגיה' },
      { word: 'implementation', translation: 'יישום, ביצוע' },
      { word: 'promotion',     translation: 'קידום; פרסום' },
      { word: 'resignation',   translation: 'התפטרות' },
      { word: 'evaluate',      translation: 'להעריך, לדרג' },
      { word: 'assertive',     translation: 'נחרץ, תקיף' },
      { word: 'colleague',     translation: 'עמית, קולגה' },
      { word: 'terminate',     translation: 'לפטר; לסיים' },
    ],
    episodes: {
      1: { 1: { summary: 'הפיילוט — מייקל סקוט מציג את עצמו', words: ['introduction', 'awkward', 'leadership', 'impress'] },
           2: { summary: 'מגוון — קורס גיוון לעובדים', words: ['diversity', 'inappropriate', 'sensitivity', 'corporate'] },
           3: { summary: 'מבחן — בחינה למניעת פיטורין', words: ['evaluate', 'redundant', 'performance', 'anxiety'] },
           4: { summary: 'גרף — ביקורת ביצועים', words: ['evaluate', 'criticism', 'feedback', 'performance'] },
           5: { summary: 'ספורט — משחק כדורסל עם הבוס', words: ['competitive', 'authority', 'respect', 'challenge'] },
           6: { summary: 'אמון — בניית אמון בצוות', words: ['trust', 'teamwork', 'vulnerable', 'genuine'] } },
    },
  },

  'Suits': {
    id: 'suits',
    emoji: '⚖️',
    gradient: 'from-blue-700 to-indigo-900',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-700/40',
    // TMDB ID: 37680
    poster: null,
    description: 'עורכי דין בניו יורק — סודות, כוח ואסטרטגיה',
    seasons: [12, 16, 16, 16, 16, 16, 16, 16, 10], // S1–S9
    themes: ['law', 'corporate', 'power', 'strategy', 'NYC'],
    vocab: [
      { word: 'litigation',    translation: 'ליטיגציה, הליך משפטי' },
      { word: 'attorney',      translation: 'עורך דין' },
      { word: 'confidential',  translation: 'סודי, חסוי' },
      { word: 'testimony',     translation: 'עדות' },
      { word: 'jurisdiction',  translation: 'סמכות שיפוט' },
      { word: 'precedent',     translation: 'תקדים' },
      { word: 'allegation',    translation: 'טענה, האשמה' },
      { word: 'defendant',     translation: 'נאשם, נתבע' },
      { word: 'plaintiff',     translation: 'תובע' },
      { word: 'settlement',    translation: 'פשרה, הסדר' },
      { word: 'arbitration',   translation: 'בוררות' },
      { word: 'subpoena',      translation: 'זימון לעדות' },
      { word: 'deposition',    translation: 'עדות בכתב' },
      { word: 'verdict',       translation: 'פסיקה, פסק דין' },
      { word: 'circumstantial', translation: 'נסיבתי' },
      { word: 'affidavit',     translation: 'תצהיר' },
      { word: 'compliance',    translation: 'ציות, עמידה בדרישות' },
      { word: 'leverage',      translation: 'מינוף, יתרון' },
      { word: 'disclosure',    translation: 'גילוי, חשיפה' },
      { word: 'integrity',     translation: 'יושרה, שלמות' },
    ],
    episodes: {
      1: { 1: { summary: 'הפיילוט — מייק רוס מגלה את הכישרון שלו', words: ['deception', 'talent', 'desperation', 'opportunity'] },
           2: { summary: 'המשא ומתן', words: ['negotiate', 'leverage', 'strategy', 'confident'] },
           3: { summary: 'צו בית משפט', words: ['subpoena', 'testimony', 'evidence', 'authority'] },
           4: { summary: 'הסדר פשרה', words: ['settlement', 'plaintiff', 'defendant', 'arbitration'] },
           5: { summary: 'ניגוד עניינים', words: ['conflict', 'integrity', 'confidential', 'loyalty'] } },
    },
  },

  'Breaking Bad': {
    id: 'breaking_bad',
    emoji: '⚗️',
    gradient: 'from-green-700 to-emerald-900',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-700/40',
    // TMDB ID: 1396
    poster: null,
    description: 'מורה לכימיה הופך לנגן קריינן — אלבוקרקי, ניו מקסיקו',
    seasons: [7, 13, 13, 13, 16], // S1–S5
    themes: ['chemistry', 'crime', 'family', 'morality', 'drug trade'],
    vocab: [
      { word: 'synthesis',     translation: 'סינתזה, ייצור כימי' },
      { word: 'volatile',      translation: 'נדיף; מתפרץ' },
      { word: 'toxic',         translation: 'רעיל' },
      { word: 'contaminate',   translation: 'לזהם, להכניס פסולת' },
      { word: 'distribute',    translation: 'לחלק, להפיץ' },
      { word: 'manufacture',   translation: 'לייצר, לגבש' },
      { word: 'territory',     translation: 'שטח, טריטוריה' },
      { word: 'consequence',   translation: 'תוצאה, השלכה' },
      { word: 'deteriorate',   translation: 'להידרדר' },
      { word: 'rationalize',   translation: 'להצדיק בהיגיון' },
      { word: 'desperate',     translation: 'נואש, ייאוש' },
      { word: 'inevitable',    translation: 'בלתי נמנע' },
      { word: 'manipulate',    translation: 'לתמרן, להשפיע בערמה' },
      { word: 'eliminate',     translation: 'לחסל, להסיר' },
      { word: 'anonymous',     translation: 'אנונימי' },
      { word: 'dissolve',      translation: 'להמיס, לפרק' },
      { word: 'compound',      translation: 'תרכובת; מורכב' },
      { word: 'authority',     translation: 'סמכות, רשות' },
      { word: 'accomplish',    translation: 'להשיג, לבצע' },
      { word: 'justify',       translation: 'להצדיק' },
    ],
    episodes: {
      1: { 1: { summary: 'פיילוט — וולטר הייט מגלה שיש לו סרטן', words: ['diagnosis', 'terminal', 'desperate', 'transform'] },
           2: { summary: 'הבחירות של קאט — הסרת גוף ראשון', words: ['consequence', 'eliminate', 'panic', 'evidence'] },
           3: { summary: 'ומניין לקחנו', words: ['distribute', 'territory', 'dangerous', 'corrupt'] },
           4: { summary: 'שוטר עייף', words: ['investigate', 'suspicious', 'manipulate', 'deceive'] },
           5: { summary: 'גרשון — הגנה על שטח', words: ['authority', 'territory', 'confront', 'survival'] },
           6: { summary: 'כי״פ', words: ['manufacture', 'compound', 'chemistry', 'synthesize'] },
           7: { summary: 'נקי ולבן', words: ['accomplish', 'justify', 'rationalize', 'inevitable'] } },
    },
  },

  'The Bear': {
    id: 'the_bear',
    emoji: '🍽️',
    gradient: 'from-red-700 to-orange-800',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-700/40',
    // TMDB ID: 136315
    poster: null,
    description: 'שף כריזמטי חוזר לשיקגו לנהל מסעדת המשפחה',
    seasons: [8, 10, 10], // S1–S3
    themes: ['culinary', 'restaurant', 'trauma', 'family', 'Chicago'],
    vocab: [
      { word: 'culinary',      translation: 'קולינרי, בישולי' },
      { word: 'reduction',     translation: 'רדוקציה (ברוטב)' },
      { word: 'garnish',       translation: 'עיטור אוכל' },
      { word: 'presentation',  translation: 'הגשה, מצגת' },
      { word: 'renovation',    translation: 'שיפוץ' },
      { word: 'precision',     translation: 'דיוק' },
      { word: 'perfectionist', translation: 'פרפקציוניסט' },
      { word: 'sustainable',   translation: 'בר-קיימא' },
      { word: 'coordinate',    translation: 'לתאם' },
      { word: 'transformation', translation: 'שינוי, טרנספורמציה' },
      { word: 'sacrifice',     translation: 'קורבן, להקריב' },
      { word: 'resilient',     translation: 'חסין, עמיד' },
      { word: 'innovative',    translation: 'חדשני' },
      { word: 'dedication',    translation: 'מסירות' },
      { word: 'sophisticated', translation: 'מתוחכם, מורכב' },
      { word: 'exceptional',   translation: 'יוצא דופן' },
      { word: 'fundamental',   translation: 'בסיסי, יסודי' },
      { word: 'execute',       translation: 'לבצע, לגרום' },
      { word: 'collaborate',   translation: 'לשתף פעולה' },
      { word: 'ambition',      translation: 'שאפתנות, שאיפה' },
    ],
    episodes: {
      1: { 1: { summary: 'שסטאיציה — קארמי חוזר לניהול The Beef', words: ['chaos', 'overwhelm', 'grief', 'pressure'] },
           2: { summary: 'בשר — לחץ ראשון במטבח', words: ['intensity', 'precision', 'coordinate', 'tension'] },
           3: { summary: 'שוקולד — גיוס אנשי צוות', words: ['collaborate', 'recruit', 'skill', 'potential'] },
           4: { summary: 'מי הבוס', words: ['authority', 'leadership', 'respect', 'confront'] },
           5: { summary: 'שגרה — יצירת מערכות', words: ['system', 'routine', 'implement', 'efficiency'] },
           6: { summary: 'חלום — אהדת הצוות', words: ['ambition', 'vision', 'inspire', 'transform'] },
           7: { summary: 'בסדר — שיתוף פעולה', words: ['trust', 'collaborate', 'resilient', 'progress'] },
           8: { summary: 'כאוס — השיא הדרמטי', words: ['catastrophe', 'desperate', 'sacrifice', 'survive'] } },
    },
  },
};

// Helper: get max episode for a given show + season (1-based)
export const getMaxEpisode = (showName, season) => {
  const show = SHOWS_DB[showName];
  if (!show) return 99;
  const idx = season - 1; // convert to 0-based
  if (idx < 0 || idx >= show.seasons.length) return 0; // invalid season
  return show.seasons[idx];
};

// Helper: get max season for a show
export const getMaxSeason = (showName) => {
  const show = SHOWS_DB[showName];
  if (!show) return 20;
  return show.seasons.length;
};

// Helper: get episode vocab hints
export const getEpisodeVocab = (showName, season, episode) => {
  const show = SHOWS_DB[showName];
  if (!show?.episodes?.[season]?.[episode]) return null;
  return show.episodes[season][episode];
};

// Ordered list of show names for display
export const SHOW_NAMES = Object.keys(SHOWS_DB);
