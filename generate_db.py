"""
generate_db.py
==============
Generates academic_database.csv — the enriched Amirnet word database.

Run once from the project root:
    python generate_db.py

Outputs:
    academic_database.csv   (import into Excel, Google Sheets, etc.)
    src/data/academicDB.json (imported directly by the React app)

No pip installs required — uses only Python standard library.
"""

import csv
import json
import os

# ══════════════════════════════════════════════════════════════════════
# MASTER WORD TABLE
# Fields: (English, Hebrew, Part_of_Speech, Amirnet_Level)
#
# Part_of_Speech: Noun | Verb | Adjective | Adverb | Phrase | Multi
# Amirnet_Level:
#   1 = Basic     — Foundation vocab, very common
#   2 = Intermediate — Core Amirnet/Psychometric words (most tested)
#   3 = Advanced  — AWL academic words, hardest exam questions
# ══════════════════════════════════════════════════════════════════════

WORDS = [
    # ── A ──────────────────────────────────────────────────────────────
    ("abbreviate",    "לקצר",                  "Verb",      2),
    ("abdomen",       "בטן",                   "Noun",      1),
    ("ability",       "יכולת",                 "Noun",      1),
    ("abnormal",      "לא נורמלי",             "Adjective", 2),
    ("abolish",       "לבטל",                  "Verb",      3),
    ("absolute",      "מוחלט",                 "Adjective", 2),
    ("absorb",        "לספוג",                 "Verb",      2),
    ("abstract",      "מופשט, תקציר",          "Multi",     3),
    ("abundant",      "בשפע",                  "Adjective", 2),
    ("abuse",         "לנצל לרעה",             "Multi",     2),
    ("accelerate",    "להאיץ",                 "Verb",      2),
    ("access",        "גישה",                  "Multi",     2),
    ("accommodate",   "להכיל, לאכסן",          "Verb",      3),
    ("accomplish",    "להשיג, לבצע",           "Verb",      2),
    ("accurate",      "מדויק",                 "Adjective", 2),
    ("achieve",       "להשיג",                 "Verb",      1),
    ("acknowledge",   "להכיר, להודות",         "Verb",      3),
    ("acquire",       "לרכוש",                 "Verb",      2),
    ("adapt",         "להתאים",                "Verb",      2),
    ("adequate",      "מספיק, הולם",           "Adjective", 3),
    ("adhere",        "לדבוק",                 "Verb",      3),
    ("adjust",        "להתאים, לכוון",         "Verb",      2),
    ("administer",    "לנהל",                  "Verb",      3),
    ("administration","ניהול",                 "Noun",      2),
    ("adopt",         "לאמץ",                  "Verb",      2),
    ("advocate",      "לדגול, סנגור",          "Multi",     3),
    ("affect",        "להשפיע",                "Verb",      1),
    ("aggregate",     "מצרפי, לצבור",          "Multi",     3),
    ("aggressive",    "תוקפני",                "Adjective", 2),
    ("aid",           "סיוע, לסייע",           "Multi",     2),
    ("allocate",      "להקצות",                "Verb",      3),
    ("alter",         "לשנות",                 "Verb",      3),
    ("ambiguous",     "עמום, דו-משמעי",        "Adjective", 3),
    ("ambition",      "שאיפה",                 "Noun",      2),
    ("analyze",       "לנתח",                  "Verb",      2),
    ("annotate",      "להוסיף הערות",          "Verb",      3),
    ("anticipate",    "לצפות מראש",            "Verb",      3),
    ("apparent",      "ברור, לכאורה",          "Adjective", 3),
    ("approach",      "גישה, להתקרב",          "Multi",     1),
    ("appropriate",   "מתאים",                 "Adjective", 2),
    ("approximate",   "משוער, לקרב",           "Multi",     3),
    ("area",          "אזור, תחום",            "Noun",      1),
    ("assert",        "לטעון בתקיפות",         "Verb",      3),
    ("assess",        "להעריך, לאמוד",         "Verb",      3),
    ("assign",        "לשייך, למנות",          "Verb",      2),
    ("assume",        "להניח",                 "Verb",      2),
    ("assure",        "להבטיח",                "Verb",      2),
    ("authority",     "סמכות, רשות",           "Noun",      2),
    ("available",     "זמין, פנוי",            "Adjective", 1),
    ("awareness",     "מודעות",                "Noun",      2),

    # ── B ──────────────────────────────────────────────────────────────
    ("balance",       "איזון, לאזן",           "Multi",     1),
    ("barrier",       "מחסום",                 "Noun",      2),
    ("benefit",       "תועלת, יתרון",          "Multi",     1),
    ("bias",          "הטיה, דעה קדומה",       "Noun",      3),
    ("brief",         "קצר, תדריך",            "Multi",     2),
    ("bulk",          "רוב, מסה",              "Noun",      3),

    # ── C ──────────────────────────────────────────────────────────────
    ("capacity",      "כושר, קיבולת",          "Noun",      3),
    ("category",      "קטגוריה, סיווג",        "Noun",      2),
    ("cease",         "להפסיק",                "Verb",      3),
    ("challenge",     "אתגר, לאתגר",           "Multi",     1),
    ("circumstance",  "נסיבה, מצב",            "Noun",      3),
    ("cite",          "לצטט",                  "Verb",      3),
    ("clarify",       "להבהיר",                "Verb",      2),
    ("classify",      "לסווג",                 "Verb",      2),
    ("collaborate",   "לשתף פעולה",            "Verb",      2),
    ("collapse",      "להתמוטט",               "Verb",      2),
    ("commission",    "עמלה, ועדה, לצוות",     "Multi",     3),
    ("commit",        "להתחייב, לבצע",         "Verb",      2),
    ("communicate",   "לתקשר",                 "Verb",      1),
    ("community",     "קהילה",                 "Noun",      1),
    ("compensate",    "לפצות",                 "Verb",      3),
    ("complex",       "מורכב",                 "Adjective", 2),
    ("comprehensive", "מקיף, יסודי",           "Adjective", 3),
    ("concentrate",   "להתרכז",                "Verb",      2),
    ("concept",       "מושג",                  "Noun",      2),
    ("conclude",      "להסיק, לסיים",          "Verb",      2),
    ("conduct",       "לנהל, התנהגות",         "Multi",     2),
    ("conflict",      "סכסוך, לסתור",          "Multi",     2),
    ("consent",       "הסכמה, להסכים",         "Multi",     3),
    ("considerable",  "ניכר, משמעותי",         "Adjective", 2),
    ("constitute",    "להרכיב, לכונן",         "Verb",      3),
    ("constraint",    "מגבלה, אילוץ",          "Noun",      3),
    ("construct",     "לבנות, לייצר",          "Verb",      3),
    ("context",       "הקשר, רקע",             "Noun",      2),
    ("contrast",      "ניגוד, להשוות",         "Multi",     2),
    ("contribute",    "לתרום",                 "Verb",      2),
    ("controversy",   "מחלוקת",                "Noun",      3),
    ("convert",       "להמיר, לשנות",          "Verb",      3),
    ("cooperate",     "לשתף פעולה",            "Verb",      2),
    ("coordinate",    "לתאם",                  "Verb",      3),
    ("criteria",      "קריטריונים",            "Noun",      3),
    ("crucial",       "מכריע, חיוני",          "Adjective", 2),
    ("currency",      "מטבע",                  "Noun",      2),

    # ── D ──────────────────────────────────────────────────────────────
    ("data",          "נתונים",                "Noun",      1),
    ("deduce",        "להסיק",                 "Verb",      3),
    ("define",        "להגדיר",                "Verb",      2),
    ("demonstrate",   "להדגים, להפגין",        "Verb",      2),
    ("derive",        "להפיק, לנבוע",          "Verb",      3),
    ("design",        "עיצוב, לתכנן",          "Multi",     1),
    ("despite",       "למרות",                 "Preposition",1),
    ("detect",        "לגלות",                 "Verb",      2),
    ("determine",     "לקבוע, להחליט",         "Verb",      2),
    ("deviate",       "לסטות",                 "Verb",      3),
    ("diminish",      "להפחית, לדעוך",         "Verb",      3),
    ("distinct",      "מובחן, שונה",           "Adjective", 3),
    ("distribute",    "לחלק, להפיץ",           "Verb",      2),
    ("dominant",      "דומיננטי",              "Adjective", 3),
    ("draft",         "טיוטה, לנסח",           "Multi",     2),

    # ── E ──────────────────────────────────────────────────────────────
    ("economy",       "כלכלה",                 "Noun",      1),
    ("element",       "אלמנט, יסוד",           "Noun",      2),
    ("eliminate",     "לחסל",                  "Verb",      2),
    ("emerge",        "להופיע, לצוץ",          "Verb",      3),
    ("emphasize",     "להדגיש",                "Verb",      2),
    ("enable",        "לאפשר",                 "Verb",      2),
    ("enforce",       "לאכוף",                 "Verb",      3),
    ("enormous",      "עצום",                  "Adjective", 2),
    ("environment",   "סביבה",                 "Noun",      1),
    ("equation",      "משוואה",                "Noun",      3),
    ("equip",         "לצייד",                 "Verb",      2),
    ("equivalent",    "שווה ערך",              "Adjective", 3),
    ("establish",     "לבסס, לייסד",           "Verb",      2),
    ("estimate",      "להעריך, אומדן",         "Multi",     2),
    ("evaluate",      "להעריך, לאמוד",         "Verb",      2),
    ("evident",       "ברור",                  "Adjective", 2),
    ("evolve",        "להתפתח",                "Verb",      3),
    ("exclude",       "להוציא מן הכלל",        "Verb",      3),
    ("exhibit",       "להציג",                 "Verb",      2),
    ("explicit",      "מפורש",                 "Adjective", 3),
    ("exploit",       "לנצל",                  "Verb",      2),
    ("export",        "לייצא",                 "Verb",      2),
    ("expose",        "לחשוף",                 "Verb",      2),
    ("extent",        "מידה, היקף",            "Noun",      3),

    # ── F ──────────────────────────────────────────────────────────────
    ("facilitate",    "להקל, לסייע",           "Verb",      3),
    ("factor",        "גורם",                  "Noun",      1),
    ("feature",       "מאפיין, תכונה",         "Noun",      2),
    ("flexible",      "גמיש",                  "Adjective", 2),
    ("fluctuate",     "להשתנות, לנוע",         "Verb",      3),
    ("focus",         "להתמקד, מיקוד",         "Multi",     1),
    ("formula",       "נוסחה",                 "Noun",      2),
    ("framework",     "מסגרת, מתווה",          "Noun",      3),
    ("function",      "תפקיד, לתפקד",          "Multi",     1),
    ("fundamental",   "בסיסי, יסודי",          "Adjective", 2),

    # ── G ──────────────────────────────────────────────────────────────
    ("generate",      "לייצר, לגרום",          "Verb",      2),
    ("global",        "עולמי, גלובלי",         "Adjective", 1),
    ("gradual",       "הדרגתי",                "Adjective", 2),
    ("grant",         "להעניק, מענק",          "Multi",     2),

    # ── H ──────────────────────────────────────────────────────────────
    ("hypothesis",    "השערה",                 "Noun",      3),

    # ── I ──────────────────────────────────────────────────────────────
    ("identify",      "לזהות",                 "Verb",      2),
    ("ignore",        "להתעלם",                "Verb",      1),
    ("illustrate",    "להדגים",                "Verb",      2),
    ("impact",        "השפעה, לפגוע",          "Multi",     2),
    ("imply",         "לרמוז",                 "Verb",      3),
    ("impose",        "להטיל",                 "Verb",      3),
    ("income",        "הכנסה",                 "Noun",      1),
    ("indicate",      "לציין, להצביע",         "Verb",      2),
    ("inevitable",    "בלתי נמנע",             "Adjective", 3),
    ("infer",         "להסיק",                 "Verb",      3),
    ("inherent",      "טבוע, מולד",            "Adjective", 3),
    ("initiate",      "ליזום",                 "Verb",      3),
    ("insight",       "תובנה",                 "Noun",      3),
    ("integrate",     "לשלב",                  "Verb",      3),
    ("interact",      "לתקשר, לפעול הדדית",   "Verb",      2),
    ("interpret",     "לפרש",                  "Verb",      2),
    ("investigate",   "לחקור",                 "Verb",      2),
    ("involve",       "לערב",                  "Verb",      2),
    ("issue",         "סוגיה, בעיה",           "Noun",      2),

    # ── J ──────────────────────────────────────────────────────────────
    ("justify",       "להצדיק",                "Verb",      2),

    # ── L ──────────────────────────────────────────────────────────────
    ("labor",         "עבודה",                 "Noun",      2),
    ("legal",         "חוקי",                  "Adjective", 1),
    ("legislate",     "לחוקק",                 "Verb",      3),
    ("legitimate",    "לגיטימי, חוקי",         "Adjective", 3),
    ("link",          "קשר, לקשר",             "Multi",     1),
    ("locate",        "לאתר",                  "Verb",      2),
    ("logic",         "היגיון",                "Noun",      2),

    # ── M ──────────────────────────────────────────────────────────────
    ("maintain",      "לשמר, לתחזק",           "Verb",      2),
    ("major",         "עיקרי, מרכזי",          "Adjective", 1),
    ("manipulate",    "לתמרן",                 "Verb",      3),
    ("maximize",      "למקסם",                 "Verb",      3),
    ("mechanism",     "מנגנון",                "Noun",      3),
    ("method",        "שיטה",                  "Noun",      1),
    ("migrate",       "להגר",                  "Verb",      2),
    ("minimize",      "למזער",                 "Verb",      3),
    ("modify",        "לשנות",                 "Verb",      2),
    ("monitor",       "לנטר, לעקוב",           "Verb",      2),
    ("motivate",      "לעודד, לתמרץ",          "Verb",      2),
    ("mutual",        "הדדי",                  "Adjective", 2),

    # ── N ──────────────────────────────────────────────────────────────
    ("negative",      "שלילי",                 "Adjective", 1),
    ("negotiate",     "לנהל משא ומתן",         "Verb",      2),
    ("neutral",       "ניטרלי",                "Adjective", 2),
    ("norm",          "נורמה, תקן",            "Noun",      2),
    ("notion",        "מושג, רעיון",           "Noun",      3),

    # ── O ──────────────────────────────────────────────────────────────
    ("objective",     "מטרה, אובייקטיבי",      "Multi",     2),
    ("obtain",        "להשיג",                 "Verb",      2),
    ("occur",         "לקרות",                 "Verb",      2),
    ("outcome",       "תוצאה, פלט",            "Noun",      2),
    ("outline",       "קווי מתאר, לתאר",       "Multi",     2),

    # ── P ──────────────────────────────────────────────────────────────
    ("paradigm",      "פרדיגמה, מודל",         "Noun",      3),
    ("participate",   "להשתתף",                "Verb",      2),
    ("perceive",      "לתפוס, להבין",          "Verb",      3),
    ("period",        "תקופה",                 "Noun",      1),
    ("persist",       "להתמיד",                "Verb",      3),
    ("perspective",   "פרספקטיבה, נקודת מבט", "Noun",      2),
    ("phenomenon",    "תופעה",                 "Noun",      3),
    ("policy",        "מדיניות",               "Noun",      2),
    ("potential",     "פוטנציאל",              "Multi",     2),
    ("precise",       "מדויק",                 "Adjective", 2),
    ("primary",       "עיקרי, ראשוני",         "Adjective", 2),
    ("principle",     "עיקרון",                "Noun",      2),
    ("priority",      "עדיפות",                "Noun",      2),
    ("process",       "תהליך",                 "Noun",      1),
    ("prohibit",      "לאסור",                 "Verb",      3),
    ("promote",       "לקדם",                  "Verb",      2),
    ("proportion",    "יחס, פרופורציה",        "Noun",      3),
    ("prospect",      "סיכוי, תחזית",          "Noun",      3),

    # ── R ──────────────────────────────────────────────────────────────
    ("rational",      "רציונלי",               "Adjective", 2),
    ("react",         "להגיב",                 "Verb",      2),
    ("reduce",        "להפחית",                "Verb",      1),
    ("regulate",      "לווסת",                 "Verb",      3),
    ("reinforce",     "לחזק",                  "Verb",      3),
    ("reject",        "לדחות",                 "Verb",      2),
    ("relevant",      "רלוונטי",               "Adjective", 2),
    ("require",       "לדרוש",                 "Verb",      1),
    ("research",      "מחקר",                  "Noun",      1),
    ("resolve",       "לפתור",                 "Verb",      2),
    ("resource",      "משאב",                  "Noun",      2),
    ("respond",       "להגיב",                 "Verb",      2),
    ("restrict",      "להגביל",                "Verb",      2),
    ("reveal",        "לחשוף",                 "Verb",      2),
    ("role",          "תפקיד",                 "Noun",      1),

    # ── S ──────────────────────────────────────────────────────────────
    ("scheme",        "תוכנית, מזימה",         "Noun",      3),
    ("sector",        "מגזר",                  "Noun",      3),
    ("sequence",      "רצף",                   "Noun",      2),
    ("significant",   "משמעותי",               "Adjective", 2),
    ("simulate",      "לדמות",                 "Verb",      3),
    ("source",        "מקור",                  "Noun",      1),
    ("stable",        "יציב",                  "Adjective", 2),
    ("statistics",    "סטטיסטיקה",             "Noun",      3),
    ("strategy",      "אסטרטגיה",              "Noun",      2),
    ("structure",     "מבנה",                  "Noun",      1),
    ("sufficient",    "מספיק",                 "Adjective", 2),
    ("summarize",     "לסכם",                  "Verb",      2),
    ("sustain",       "לשמר, לקיים",           "Verb",      3),

    # ── T ──────────────────────────────────────────────────────────────
    ("target",        "מטרה",                  "Noun",      1),
    ("theory",        "תאוריה",                "Noun",      2),
    ("tradition",     "מסורת",                 "Noun",      1),
    ("transfer",      "להעביר",                "Verb",      2),
    ("transition",    "מעבר",                  "Noun",      2),
    ("trend",         "מגמה, טרנד",            "Noun",      2),

    # ── U ──────────────────────────────────────────────────────────────
    ("underlying",    "בסיסי, מונח ביסוד",     "Adjective", 3),
    ("undertake",     "לקחת על עצמו",          "Verb",      3),
    ("unify",         "לאחד",                  "Verb",      2),
    ("utilize",       "לנצל, להשתמש",          "Verb",      3),

    # ── V ──────────────────────────────────────────────────────────────
    ("valid",         "תקף",                   "Adjective", 2),
    ("vary",          "להשתנות",               "Verb",      2),
    ("versatile",     "רב-תכליתי",             "Adjective", 3),
    ("version",       "גרסה",                  "Noun",      1),
    ("viable",        "בר-קיימא, אפשרי",       "Adjective", 3),
    ("vision",        "חזון, ראייה",           "Noun",      2),
    ("vital",         "חיוני",                 "Adjective", 2),
    ("vulnerable",    "פגיע",                  "Adjective", 2),

    # ── W ──────────────────────────────────────────────────────────────
    ("widespread",    "נפוץ",                  "Adjective", 2),

    # ══════════════════════════════════════════════════════════════════
    # EXISTING psychometricDB.js WORDS — ENRICHED WITH POS + LEVEL
    # (all entries below come from your current database)
    # ══════════════════════════════════════════════════════════════════
    ("abolish",       "לבטל",                  "Verb",      3),
    ("accomplish",    "לבצע, להשיג",           "Verb",      2),
    ("accountable",   "אחראי",                 "Adjective", 3),
    ("accumulate",    "לצבור",                 "Verb",      3),
    ("acute",         "חמור, קריטי",           "Adjective", 3),
    ("admittedly",    "מוסכם",                 "Adverb",    3),
    ("adolescence",   "גיל ההתבגרות",          "Noun",      2),
    ("adversary",     "יריב",                  "Noun",      3),
    ("afflict",       "לייסר",                 "Verb",      3),
    ("agenda",        "סדר יום",               "Noun",      2),
    ("aggression",    "תוקפנות",               "Noun",      2),
    ("allegedly",     "לכאורה",                "Adverb",    3),
    ("alternative",   "חלופה",                 "Noun",      2),
    ("ambiguity",     "עמימות",                "Noun",      3),
    ("ambitious",     "שאפתן",                 "Adjective", 2),
    ("ambivalent",    "סותר, אמביוולנטי",      "Adjective", 3),
    ("ancestor",      "אב קדמון",              "Noun",      2),
    ("ancient",       "עתיק",                  "Adjective", 1),
    ("arrogant",      "יהיר",                  "Adjective", 2),
    ("ascertain",     "לוודא",                 "Verb",      3),
    ("ascribe",       "לייחס",                 "Verb",      3),
    ("assertion",     "טענה",                  "Noun",      3),
    ("assertive",     "נחרץ",                  "Adjective", 3),
    ("asset",         "נכס",                   "Noun",      2),
    ("assimilate",    "להיטמע",                "Verb",      3),
    ("assumption",    "הנחה",                  "Noun",      3),
    ("attain",        "להשיג",                 "Verb",      3),
    ("attribute",     "לייחס, תכונה",          "Multi",     3),
    ("audacious",     "נועז",                  "Adjective", 3),
    ("authentic",     "אמיתי, מקורי",          "Adjective", 2),
    ("avarice",       "תאוות בצע",             "Noun",      3),
    ("awe",           "יראת כבוד",             "Noun",      3),
    ("bamboozle",     "לרמות",                 "Verb",      3),
    ("betray",        "לבגוד",                 "Verb",      2),
    ("bizarre",       "מוזר",                  "Adjective", 2),
    ("blasphemy",     "חילול השם",             "Noun",      3),
    ("breakdown",     "התמוטטות",              "Noun",      2),
    ("brutality",     "אכזריות",               "Noun",      2),
    ("burden",        "עול",                   "Noun",      2),
    ("camouflage",    "הסוואה",                "Noun",      2),
    ("candid",        "כן, גלוי לב",           "Adjective", 3),
    ("catastrophe",   "אסון",                  "Noun",      2),
    ("characteristic","אופייני",               "Adjective", 2),
    ("chaos",         "תוהו ובוהו",            "Noun",      2),
    ("conscience",    "מצפון",                 "Noun",      2),
    ("conscious",     "בעל הכרה",              "Adjective", 2),
    ("conspicuous",   "בולט",                  "Adjective", 3),
    ("contention",    "מחלוקת",                "Noun",      3),
    ("convey",        "להעביר, למסור",         "Verb",      3),
    ("cumulative",    "מצטבר",                 "Adjective", 3),
    ("curriculum",    "תוכנית לימודים",        "Noun",      2),
    ("debate",        "דיון, עימות",           "Multi",     1),
    ("deceit",        "רמאות",                 "Noun",      3),
    ("deficit",       "גירעון",                "Noun",      3),
    ("deliberate",    "מכוון, לשקול",          "Multi",     3),
    ("depict",        "לתאר",                  "Verb",      3),
    ("deprive",       "לשלול",                 "Verb",      3),
    ("devastate",     "לזרוע חורבן",           "Verb",      3),
    ("devote",        "להקדיש",                "Verb",      2),
    ("discriminate",  "להפלות",                "Verb",      2),
    ("disguise",      "מסווה",                 "Noun",      2),
    ("disperse",      "להתפזר",                "Verb",      3),
    ("disregard",     "להתעלם",                "Verb",      2),
    ("distort",       "לעוות",                 "Verb",      3),
    ("dominate",      "לשלוט",                 "Verb",      2),
    ("dread",         "אימה",                  "Noun",      2),
    ("eccentric",     "מוזר, אקסצנטרי",        "Adjective", 3),
    ("elaborate",     "מורכב, לפרט",           "Multi",     3),
    ("endeavor",      "מאמץ",                  "Noun",      3),
    ("engage",        "להעסיק",                "Verb",      2),
    ("enhance",       "לשפר",                  "Verb",      2),
    ("evidence",      "ראיות",                 "Noun",      2),
    ("evolution",     "התפתחות",               "Noun",      2),
    ("exceed",        "לחרוג",                 "Verb",      2),
    ("execute",       "לבצע, להוציא להורג",   "Verb",      2),
    ("fabricate",     "לפברק",                 "Verb",      3),
    ("fatal",         "קטלני",                 "Adjective", 2),
    ("fertile",       "פורה",                  "Adjective", 2),
    ("fictitious",    "פיקטיבי",               "Adjective", 3),
    ("fierce",        "עז, פראי",              "Adjective", 2),
    ("flaw",          "פגם",                   "Noun",      2),
    ("fluctuate",     "להתנדנד",               "Verb",      3),
    ("fluent",        "רהוט",                  "Adjective", 2),
    ("forbid",        "לאסור",                 "Verb",      2),
    ("forecast",      "תחזית",                 "Noun",      2),
    ("foresee",       "לחזות",                 "Verb",      3),
    ("forge",         "לזייף",                 "Verb",      3),
    ("found",         "לייסד",                 "Verb",      2),
    ("fragile",       "שביר",                  "Adjective", 2),
    ("frustrate",     "לתסכל",                 "Verb",      2),
    ("fulfill",       "להגשים",                "Verb",      2),
    ("genuine",       "אמיתי, מקורי",          "Adjective", 2),
    ("gradual",       "הדרגתי",                "Adjective", 2),
    ("grasp",         "לתפוס, להבין",          "Verb",      2),
    ("grateful",      "אסיר תודה",             "Adjective", 2),
    ("guilt",         "אשמה",                  "Noun",      1),
    ("hazard",        "סכנה",                  "Noun",      2),
    ("hesitate",      "להסס",                  "Verb",      2),
    ("hinder",        "לעכב",                  "Verb",      2),
    ("humble",        "עניו, צנוע",            "Adjective", 2),
    ("humiliate",     "להשפיל",                "Verb",      2),
    ("hypocrite",     "צבוע",                  "Noun",      2),
    ("illuminate",    "להאיר",                 "Verb",      2),
    ("imminent",      "ממשמש ובא",             "Adjective", 3),
    ("impulse",       "דחף",                   "Noun",      2),
    ("inadequate",    "לא מספיק",              "Adjective", 2),
    ("indifferent",   "אדיש",                  "Adjective", 3),
    ("indigenous",    "יליד המקום",            "Adjective", 3),
    ("induce",        "לגרום",                 "Verb",      3),
    ("infect",        "להדביק",                "Verb",      2),
    ("inferior",      "נחות",                  "Adjective", 2),
    ("inherent",      "טבוע",                  "Adjective", 3),
    ("innovate",      "לחדש",                  "Verb",      2),
    ("instinct",      "אינסטינקט",             "Noun",      2),
    ("intimidate",    "לאיים",                 "Verb",      2),
    ("intuition",     "אינטואיציה",            "Noun",      2),
    ("irrational",    "לא רציונלי",            "Adjective", 2),
    ("isolate",       "לבודד",                 "Verb",      2),
    ("jeopardize",    "לסכן",                  "Verb",      3),
    ("keen",          "נלהב, חד",              "Adjective", 2),
    ("legitimate",    "לגיטימי",               "Adjective", 3),
    ("loyal",         "נאמן",                  "Adjective", 1),
    ("lucrative",     "רווחי",                 "Adjective", 3),
    ("ludicrous",     "מגוחך",                 "Adjective", 3),
    ("malicious",     "זדוני",                 "Adjective", 3),
    ("mandatory",     "חובה",                  "Adjective", 2),
    ("manifest",      "ברור, מניפסט",          "Multi",     3),
    ("margin",        "שוליים, מרווח",         "Noun",      3),
    ("merit",         "זכות, ערך",             "Noun",      3),
    ("minority",      "מיעוט",                 "Noun",      2),
    ("moderate",      "מתון",                  "Adjective", 2),
    ("mortal",        "בן תמותה",              "Adjective", 2),
    ("mourn",         "להתאבל",                "Verb",      2),
    ("neglect",       "להזניח",                "Verb",      2),
    ("notorious",     "ידוע לשמצה",            "Adjective", 3),
    ("nuclear",       "גרעיני",                "Adjective", 2),
    ("nurture",       "לטפח",                  "Verb",      2),
    ("nutrition",     "תזונה",                 "Noun",      1),
    ("oblige",        "לחייב",                 "Verb",      3),
    ("obscure",       "לא ברור",               "Adjective", 3),
    ("obstruct",      "לחסום",                 "Verb",      3),
    ("occupation",    "מקצוע",                 "Noun",      1),
    ("oppress",       "לדכא",                  "Verb",      3),
    ("outstanding",   "מצוין, בולט",           "Adjective", 2),
    ("overcome",      "להתגבר",                "Verb",      2),
    ("overwhelm",     "להכריע",                "Verb",      2),
    ("parallel",      "מקביל",                 "Adjective", 2),
    ("peculiar",      "מוזר",                  "Adjective", 2),
    ("penetrate",     "לחדור",                 "Verb",      2),
    ("pessimistic",   "פסימי",                 "Adjective", 2),
    ("pioneer",       "חלוץ",                  "Noun",      2),
    ("plentiful",     "בשפע",                  "Adjective", 2),
    ("precarious",    "רעוע, מסוכן",           "Adjective", 3),
    ("precaution",    "אמצעי זהירות",          "Noun",      2),
    ("precede",       "להקדים",                "Verb",      3),
    ("prejudice",     "דעה קדומה",             "Noun",      2),
    ("preliminary",   "מקדמי",                 "Adjective", 3),
    ("prescribe",     "לרשום מרשם",            "Verb",      2),
    ("prestigious",   "יוקרתי",                "Adjective", 3),
    ("prevalent",     "נפוץ, שכיח",            "Adjective", 3),
    ("proclaim",      "להכריז",                "Verb",      3),
    ("profound",      "עמוק",                  "Adjective", 3),
    ("prominent",     "בולט",                  "Adjective", 2),
    ("prosper",       "לשגשג",                 "Verb",      2),
    ("psychology",    "פסיכולוגיה",            "Noun",      2),
    ("punish",        "להעניש",                "Verb",      1),
    ("radical",       "רדיקלי",                "Adjective", 2),
    ("random",        "אקראי",                 "Adjective", 2),
    ("rebellion",     "מרד",                   "Noun",      2),
    ("refine",        "לזקק, לשפר",            "Verb",      3),
    ("reluctant",     "מסתייג",                "Adjective", 3),
    ("remedy",        "תרופה",                 "Noun",      2),
    ("repel",         "להדוף",                 "Verb",      3),
    ("represent",     "לייצג",                 "Verb",      2),
    ("resume",        "לחדש",                  "Verb",      2),
    ("revive",        "להחיות",                "Verb",      2),
    ("revolt",        "למרוד",                 "Verb",      3),
    ("revolution",    "מהפכה",                 "Noun",      2),
    ("ridiculous",    "מגוחך",                 "Adjective", 2),
    ("rigid",         "נוקשה",                 "Adjective", 2),
    ("ruthless",      "חסר רחמים",             "Adjective", 3),
    ("sacred",        "קדוש",                  "Adjective", 2),
    ("sanction",      "סנקציה",                "Noun",      3),
    ("scarce",        "נדיר, חסר",             "Adjective", 3),
    ("scholar",       "מלומד",                 "Noun",      2),
    ("scorn",         "בוז",                   "Noun",      3),
    ("seize",         "לתפוס",                 "Verb",      2),
    ("speculate",     "לשער",                  "Verb",      3),
    ("spontaneous",   "ספונטני",               "Adjective", 3),
    ("stubborn",      "עקשן",                  "Adjective", 2),
    ("subsequent",    "עוקב",                  "Adjective", 3),
    ("subsidy",       "סובסידיה",              "Noun",      3),
    ("subtle",        "עדין, דק",              "Adjective", 3),
    ("surpass",       "לעלות על",              "Verb",      3),
    ("surplus",       "עודף",                  "Noun",      3),
    ("surrender",     "להיכנע",                "Verb",      2),
    ("sympathy",      "אהדה, סימפתיה",         "Noun",      2),
    ("temporary",     "זמני",                  "Adjective", 2),
    ("territory",     "טריטוריה",              "Noun",      2),
    ("thorough",      "יסודי",                 "Adjective", 2),
    ("thrive",        "לשגשג",                 "Verb",      2),
    ("trait",         "תכונה, מאפיין",         "Noun",      2),
    ("transparent",   "שקוף",                  "Adjective", 2),
    ("tremendous",    "עצום",                  "Adjective", 2),
    ("triumph",       "ניצחון",                "Noun",      2),
    ("typical",       "אופייני",               "Adjective", 1),
    ("ultimate",      "סופי, מוחלט",           "Adjective", 2),
    ("undermine",     "לחתור תחת",             "Verb",      3),
    ("unemployed",    "מובטל",                 "Adjective", 1),
    ("universal",     "אוניברסלי",             "Adjective", 2),
    ("unprecedented", "חסר תקדים",             "Adjective", 3),
    ("urgent",        "דחוף",                  "Adjective", 2),
    ("vacancy",       "משרה פנויה",            "Noun",      2),
    ("verdict",       "פסק דין",               "Noun",      2),
    ("veteran",       "ותיק",                  "Noun",      2),
    ("victim",        "קורבן",                 "Noun",      1),
    ("violate",       "להפר",                  "Verb",      2),
    ("voluntary",     "התנדבותי",              "Adjective", 2),
    ("warrant",       "צו, ערובה",             "Multi",     3),
    ("wisdom",        "חוכמה",                 "Noun",      1),
    ("withdraw",      "לסגת, למשוך",           "Verb",      2),
    ("worship",       "לסגוד",                 "Verb",      2),
    ("wrath",         "זעם",                   "Noun",      3),
    ("yield",         "להניב, להיכנע",         "Verb",      2),
    ("zeal",          "התלהבות",               "Noun",      3),

    # ══════════════════════════════════════════════════════════════════
    # AWL WORDS NOT IN ORIGINAL DB (Academic Word List additions)
    # ══════════════════════════════════════════════════════════════════
    ("albeit",        "אף על פי כן",           "Conjunction",3),
    ("ambiguous",     "עמום",                  "Adjective", 3),
    ("ambivalence",   "אמביוולנטיות",          "Noun",      3),
    ("analogy",       "אנלוגיה, דמיון",        "Noun",      3),
    ("annotate",      "להוסיף הערות",          "Verb",      3),
    ("arbitrary",     "שרירותי",               "Adjective", 3),
    ("autonomous",    "אוטונומי",              "Adjective", 3),
    ("coherent",      "קוהרנטי, עקיב",         "Adjective", 3),
    ("compound",      "מורכב, תרכובת",         "Multi",     3),
    ("comprise",      "להיות מורכב מ",         "Verb",      3),
    ("contradict",    "לסתור",                 "Verb",      2),
    ("controversial", "שנוי במחלוקת",          "Adjective", 2),
    ("conviction",    "הרשעה, אמונה",          "Noun",      3),
    ("correlate",     "לתאם",                  "Verb",      3),
    ("credible",      "אמין, מהימן",           "Adjective", 3),
    ("degrade",       "לפגוע, לשחית",          "Verb",      3),
    ("denote",        "לציין, לסמל",           "Verb",      3),
    ("deplete",       "לדלדל",                 "Verb",      3),
    ("discrepancy",   "פער, סתירה",            "Noun",      3),
    ("diverse",       "מגוון",                 "Adjective", 2),
    ("empirical",     "אמפירי",                "Adjective", 3),
    ("ethics",        "אתיקה",                 "Noun",      2),
    ("excessive",     "מוגזם",                 "Adjective", 2),
    ("feasible",      "אפשרי, ישים",           "Adjective", 3),
    ("hierarchy",     "היררכיה",               "Noun",      3),
    ("hypothesis",    "השערה",                 "Noun",      3),
    ("implicit",      "מרומז, משתמע",          "Adjective", 3),
    ("incentive",     "תמריץ",                 "Noun",      3),
    ("ideology",      "אידיאולוגיה",           "Noun",      3),
    ("institute",     "מוסד",                  "Noun",      2),
    ("integrity",     "יושרה",                 "Noun",      3),
    ("intensive",     "אינטנסיבי",             "Adjective", 2),
    ("mediate",       "לתווך",                 "Verb",      3),
    ("objective",     "מטרה, אובייקטיבי",      "Multi",     2),
    ("orthodox",      "אורתודוקסי, שמרני",     "Adjective", 3),
    ("phenomenon",    "תופעה",                 "Noun",      3),
    ("preliminary",   "מקדמי",                 "Adjective", 3),
    ("prevail",       "לגבור",                 "Verb",      3),
    ("protocol",      "פרוטוקול",              "Noun",      3),
    ("qualitative",   "איכותני",               "Adjective", 3),
    ("quantitative",  "כמותי",                 "Adjective", 3),
    ("refute",        "להפריך",                "Verb",      3),
    ("reinforce",     "לחזק",                  "Verb",      3),
    ("resilient",     "עמיד, חסין",            "Adjective", 3),
    ("retain",        "לשמר",                  "Verb",      2),
    ("rhetoric",      "רטוריקה",               "Noun",      3),
    ("scrutinize",    "לבחון בקפידה",          "Verb",      3),
    ("skeptical",     "ספקני",                 "Adjective", 3),
    ("subordinate",   "כפוף",                  "Adjective", 3),
    ("superficial",   "שטחי",                  "Adjective", 3),
    ("supplement",    "תוספת, להשלים",         "Multi",     3),
    ("suppress",      "לדכא",                  "Verb",      3),
    ("tangible",      "מוחשי",                 "Adjective", 3),
    ("terminate",     "לסיים, לסיים",          "Verb",      3),
    ("thesis",        "תזה",                   "Noun",      3),
    ("tolerate",      "לסבול",                 "Verb",      2),
    ("transparent",   "שקוף",                  "Adjective", 2),
    ("trigger",       "לגרום, להפעיל",         "Verb",      2),
    ("ultimately",    "בסופו של דבר",          "Adverb",    2),
    ("underlie",      "להיות מונח ביסוד",      "Verb",      3),
    ("uniform",       "אחיד, מדים",            "Multi",     2),
    ("unique",        "ייחודי",                "Adjective", 1),
    ("unprecedented", "חסר תקדים",             "Adjective", 3),
    ("vague",         "מעורפל",                "Adjective", 2),
    ("verify",        "לאמת",                  "Verb",      2),
    ("advocate",      "לדגול, סנגור",          "Multi",     3),
    ("nevertheless",  "אף על פי כן",           "Adverb",    2),
    ("nonetheless",   "בכל זאת",               "Adverb",    3),
]


def deduplicate(words):
    """Keep the first occurrence of each English word (case-insensitive)."""
    seen = set()
    result = []
    for row in words:
        key = row[0].lower()
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result


def write_csv(words, path):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["English_Word", "Hebrew_Translation", "Part_of_Speech", "Amirnet_Level"])
        for row in words:
            writer.writerow(row)
    print(f"✅  CSV  → {path}  ({len(words)} words)")


def write_json(words, path):
    data = [
        {
            "word":        row[0],
            "translation": row[1],
            "pos":         row[2],
            "level":       row[3],
        }
        for row in words
    ]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅  JSON → {path}  ({len(data)} words)")


if __name__ == "__main__":
    words = deduplicate(WORDS)
    words.sort(key=lambda r: r[0].lower())      # alphabetical order

    write_csv(words,  "academic_database.csv")
    write_json(words, "src/data/academicDB.json")

    # ── Summary ────────────────────────────────────────────────────────
    levels = {1: 0, 2: 0, 3: 0}
    for row in words:
        levels[row[3]] += 1

    print()
    print("── Database summary ──────────────────────────────")
    print(f"   Total words:           {len(words)}")
    print(f"   Level 1 (Basic):       {levels[1]}")
    print(f"   Level 2 (Intermediate):{levels[2]}")
    print(f"   Level 3 (Advanced):    {levels[3]}")
    print("──────────────────────────────────────────────────")
    print()
    print("Next steps:")
    print("  1. Open academic_database.csv in Excel / Google Sheets to review/edit")
    print("  2. src/data/academicDB.json is auto-imported by the React app")
