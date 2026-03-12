"""
enrich_db.py
============
Merges the downloaded Hebrew dictionary with the existing academic database.

Steps:
  1. Loads dict-en-he.json (60K entries) into a fast lookup map
  2. Uses a curated list of ~1500 academic/Amirnet words with levels (no POS needed)
  3. Looks up each word's Hebrew translation from the big dictionary
  4. Merges with existing academicDB.json (keeps existing translations)
  5. Writes updated CSV + JSON

Run:
    python enrich_db.py

Level scale:
  1 = Basic      — Foundation English, rarely tested
  2 = Intermediate — Core Amirnet/Psychometric words (most frequently tested)
  3 = Advanced   — AWL academic words, hardest exam questions
"""

import csv, json, os, re

BIG_DICT_PATH    = r"C:\Users\yonat\Downloads\dict-en-he.json"
EXISTING_JSON    = "src/data/academicDB.json"
OUT_CSV          = "academic_database.csv"
OUT_JSON         = "src/data/academicDB.json"

# ══════════════════════════════════════════════════════════════════════
# CURATED ACADEMIC WORD LIST
# Format: (english_word, amirnet_level)
#
# Sources:
#   - Coxhead Academic Word List (AWL) all 10 sublists
#   - Israeli Psychometric / Amirnet exam vocabulary
#   - TOEFL/IELTS Academic Word Bank
# ══════════════════════════════════════════════════════════════════════

ACADEMIC_WORDS = [
    # ── AWL SUBLIST 1 (most frequent → Level 2) ───────────────────────
    ("analyze",        2), ("analysis",       2), ("analytical",     2),
    ("approach",       2), ("area",            1), ("assess",         2),
    ("assessment",     2), ("assume",          2), ("assumption",     2),
    ("authority",      2), ("available",       1), ("benefit",        1),
    ("concept",        2), ("consist",         2), ("consistent",     2),
    ("context",        2), ("contextual",      3), ("contract",       2),
    ("create",         1), ("creation",        2), ("creative",       2),
    ("data",           1), ("define",          2), ("definition",     2),
    ("definite",       2), ("derive",          3), ("derivation",     3),
    ("distribute",     2), ("distribution",    2), ("economy",        1),
    ("economic",       2), ("economics",       2), ("environment",    1),
    ("environmental",  2), ("establish",       2), ("establishment",  2),
    ("estimate",       2), ("estimation",      2), ("evident",        2),
    ("evidence",       2), ("export",          2), ("factor",         1),
    ("finance",        2), ("financial",       2), ("formula",        2),
    ("function",       1), ("functional",      2), ("identify",       2),
    ("identification", 2), ("income",          1), ("indicate",       2),
    ("indication",     2), ("indicator",       2), ("individual",     1),
    ("individually",   2), ("interpret",       2), ("interpretation", 2),
    ("involve",        2), ("involvement",     2), ("issue",          2),
    ("labor",          2), ("legal",           1), ("legally",        2),
    ("legislate",      3), ("legislation",     3), ("legislative",    3),
    ("major",          1), ("method",          1), ("methodology",    3),
    ("occur",          2), ("occurrence",      2), ("percent",        1),
    ("percentage",     2), ("period",          1), ("policy",         2),
    ("principle",      2), ("proceed",         2), ("procedure",      2),
    ("process",        1), ("require",         1), ("requirement",    2),
    ("research",       1), ("researcher",      2), ("respond",        2),
    ("response",       2), ("role",            1), ("section",        1),
    ("sector",         3), ("significant",     2), ("significantly",  2),
    ("similar",        1), ("similarity",      2), ("source",         1),
    ("specific",       2), ("specifically",    2), ("specify",        2),
    ("structure",      1), ("structural",      2), ("theory",         2),
    ("theoretical",    3), ("vary",            2), ("variable",       2),
    ("variation",      2), ("various",         1),

    # ── AWL SUBLIST 2 → Level 2 ───────────────────────────────────────
    ("achieve",        1), ("achievement",     2), ("acquire",        2),
    ("acquisition",    3), ("affect",          1), ("appropriate",    2),
    ("appropriately",  2), ("aspect",          2), ("assist",         2),
    ("assistance",     2), ("category",        2), ("categorize",     2),
    ("chapter",        1), ("commission",      3), ("community",      1),
    ("complex",        2), ("complexity",      2), ("compute",        2),
    ("conclude",       2), ("conclusion",      2), ("conduct",        2),
    ("consequent",     3), ("consequence",     2), ("consequently",   2),
    ("construct",      2), ("construction",    2), ("consume",        2),
    ("consumption",    2), ("credit",          1), ("culture",        1),
    ("cultural",       2), ("design",          1), ("distinct",       3),
    ("distinction",    3), ("distinguish",     2), ("element",        2),
    ("equate",         3), ("equation",        3), ("evaluate",       2),
    ("evaluation",     2), ("feature",         2), ("final",          1),
    ("finally",        1), ("focus",           1), ("impact",         2),
    ("injure",         2), ("injury",          2), ("institute",      2),
    ("institution",    2), ("invest",          2), ("investment",     2),
    ("item",           1), ("journal",         2), ("maintain",       2),
    ("maintenance",    2), ("normal",          1), ("normally",       1),
    ("obtain",         2), ("participate",     2), ("participation",  2),
    ("perceive",       3), ("perception",      2), ("positive",       1),
    ("positively",     2), ("potential",       2), ("potentially",    2),
    ("previous",       1), ("previously",      2), ("primary",        2),
    ("primarily",      2), ("purchase",        2), ("range",          2),
    ("region",         2), ("regional",        2), ("regulate",       3),
    ("regulation",     2), ("relevant",        2), ("relevance",      2),
    ("reside",         2), ("resident",        2), ("residence",      2),
    ("resource",       2), ("restrict",        2), ("restriction",    2),
    ("secure",         2), ("security",        1), ("seek",           2),
    ("select",         2), ("selection",       2), ("site",           1),
    ("strategy",       2), ("strategic",       2), ("survey",         2),
    ("text",           1), ("traditional",     1), ("tradition",      1),
    ("transfer",       2),

    # ── AWL SUBLIST 3 → Level 2-3 ─────────────────────────────────────
    ("alternative",    2), ("alternatively",  2), ("circumstance",   3),
    ("comment",        1), ("compensate",      3), ("compensation",   3),
    ("component",      2), ("consent",         3), ("considerable",   2),
    ("considerably",   2), ("constant",        2), ("constantly",     2),
    ("contribute",     2), ("contribution",    2), ("convention",     3),
    ("conventional",   3), ("cooperate",       2), ("cooperation",    2),
    ("coordinate",     3), ("coordination",    3), ("core",           2),
    ("corporate",      3), ("correspond",      3), ("correspondence", 3),
    ("criteria",       3), ("criterion",       3), ("deduce",         3),
    ("deduction",      3), ("demonstrate",     2), ("demonstration",  2),
    ("document",       2), ("dominate",        2), ("dominance",      3),
    ("emphasize",      2), ("emphasis",        2), ("ensure",         2),
    ("exclude",        3), ("exclusion",       3), ("exclusive",      3),
    ("framework",      3), ("fund",            2), ("funding",        2),
    ("illustrate",     2), ("illustration",    2), ("imply",          3),
    ("implication",    3), ("initial",         2), ("initially",      2),
    ("instance",       2), ("interact",        2), ("interaction",    2),
    ("justify",        2), ("justification",   2), ("layer",          2),
    ("link",           1), ("locate",          2), ("location",       2),
    ("maximize",       3), ("maximum",         2), ("minor",          2),
    ("negate",         3), ("negation",        3), ("negative",       1),
    ("outcome",        2), ("persist",         3), ("persistent",     3),
    ("proportion",     3), ("proportional",    3), ("react",          2),
    ("reaction",       2), ("series",          1), ("simulate",       3),
    ("simulation",     3), ("volume",          2),

    # ── AWL SUBLIST 4 → Level 3 ───────────────────────────────────────
    ("access",         2), ("adequate",        3), ("annual",         2),
    ("annually",       2), ("apparent",        3), ("apparently",     3),
    ("approximate",    3), ("approximately",   2), ("attitude",       2),
    ("attribute",      3), ("civil",           2), ("code",           2),
    ("commit",         2), ("commitment",      2), ("communicate",    1),
    ("communication",  2), ("concentrate",     2), ("concentration",  2),
    ("confer",         3), ("conference",      2), ("contrast",       2),
    ("cycle",          2), ("debate",          1), ("despite",        1),
    ("dimension",      3), ("domestic",        2), ("emerge",         3),
    ("emergence",      3), ("emphasis",        2), ("exhibit",        2),
    ("expand",         2), ("expansion",       2), ("expose",         2),
    ("exposure",       2), ("external",        2), ("facilitate",     3),
    ("fundamental",    2), ("generate",        2), ("global",         1),
    ("globalization",  2), ("grade",           1), ("guarantee",      2),
    ("implement",      3), ("implementation",  3), ("impose",         3),
    ("integrate",      3), ("integration",     3), ("internal",       2),
    ("manipulate",     3), ("manipulation",    3), ("modify",         2),
    ("modification",   2), ("monitor",         2), ("network",        1),
    ("obvious",        1), ("obviously",       1), ("occupy",         2),
    ("option",         1), ("optional",        2), ("output",         2),
    ("overall",        2), ("parallel",        2), ("parameter",      3),
    ("phase",          2), ("predict",         2), ("prediction",     2),
    ("principal",      2), ("principally",     2), ("professional",   1),
    ("professionalism",2), ("prohibit",        3), ("prohibition",    3),
    ("promote",        2), ("promotion",       2), ("publish",        2),
    ("publication",    2),

    # ── AWL SUBLIST 5 → Level 3 ───────────────────────────────────────
    ("abstract",       3), ("accurate",        2), ("accuracy",       2),
    ("acknowledge",    3), ("acknowledgment",  3), ("aggregate",      3),
    ("allocate",       3), ("allocation",      3), ("assign",         2),
    ("assignment",     2), ("assume",          2), ("attach",         2),
    ("author",         1), ("clarify",         2), ("clarity",        2),
    ("classify",       2), ("classification",  2), ("coherent",       3),
    ("coherence",      3), ("coincide",        3), ("coincidence",    3),
    ("collide",        3), ("commit",          2), ("compile",        3),
    ("compilation",    3), ("comprehend",      2), ("comprehensive",  3),
    ("conflict",       2), ("controversy",     3), ("controversial",  2),
    ("convince",       2), ("conviction",      3), ("cooperate",      2),
    ("correlate",      3), ("correlation",     3), ("credible",       3),
    ("credibility",    3), ("decline",         2), ("discrete",       3),
    ("draft",          2), ("enable",          2), ("energy",         1),
    ("evolve",         3), ("evolution",       2), ("grant",          2),
    ("hypothesis",     3), ("hypothetical",    3), ("ideology",       3),
    ("incorporate",    3), ("incline",         2), ("inevitable",     3),
    ("infer",          3), ("inference",       3), ("inherent",       3),
    ("initiate",       3), ("innovation",      2), ("innovative",     2),
    ("insight",        3), ("integrity",       3), ("intense",        2),
    ("intensity",      2), ("investigate",     2), ("investigation",  2),
    ("involve",        2), ("justify",         2),

    # ── AWL SUBLIST 6 → Level 3 ───────────────────────────────────────
    ("abstract",       3), ("ambiguous",       3), ("ambiguity",      3),
    ("analogy",        3), ("arbitrary",       3), ("assess",         2),
    ("autonomous",     3), ("autonomy",        3), ("bias",           3),
    ("bulk",           3), ("capable",         2), ("capacity",       3),
    ("challenge",      1), ("coherent",        3), ("compatible",     2),
    ("compensate",     3), ("compile",         3), ("comprise",       3),
    ("compulsory",     2), ("contradict",      2), ("contradiction",  2),
    ("convert",        3), ("convincing",      2), ("coordinate",     3),
    ("deduce",         3), ("deviate",         3), ("deviation",      3),
    ("diminish",       3), ("discrepancy",     3), ("dominant",       3),
    ("duration",       2), ("empirical",       3), ("ethics",         2),
    ("ethical",        2), ("evaluate",        2), ("evident",        2),
    ("expand",         2), ("explicit",        3), ("expose",         2),
    ("facilitate",     3), ("feasible",        3), ("feasibility",    3),
    ("flexible",       2), ("fluctuate",       3), ("format",         1),
    ("formula",        2), ("foundation",      2), ("fundamental",    2),
    ("generate",       2), ("global",          1), ("hierarchy",      3),
    ("hypothesis",     3), ("implicit",        3), ("incentive",      3),
    ("inevitable",     3), ("inherit",         2), ("innovation",     2),
    ("insight",        3), ("integrity",       3),

    # ── AWL SUBLIST 7-10 (advanced academic) → Level 3 ────────────────
    ("albeit",         3), ("ambivalent",      3), ("analogous",      3),
    ("articulate",     3), ("attribute",       3), ("augment",        3),
    ("authenticate",   3), ("autonomous",      3), ("channel",        2),
    ("cite",           3), ("clarify",         2), ("coerce",         3),
    ("coincide",       3), ("compile",         3), ("complement",     3),
    ("comply",         3), ("concise",         3), ("condemn",        2),
    ("connotation",    3), ("constraint",      3), ("contemplate",    3),
    ("contradict",     2), ("correlate",       3), ("counterpart",    3),
    ("cumulative",     3), ("currency",        2), ("deduce",         3),
    ("defer",          3), ("deliberate",      3), ("denote",         3),
    ("deplete",        3), ("derive",          3), ("diffuse",        3),
    ("diminish",       3), ("distort",         3), ("diverge",        3),
    ("domain",         3), ("emanate",         3), ("empirical",      3),
    ("enforce",        3), ("enhance",         2), ("enumerate",      3),
    ("equitable",      3), ("equivalent",      3), ("erode",          3),
    ("erupt",          3), ("ethics",          2), ("evolve",         3),
    ("exclude",        3), ("exempt",          3), ("exploit",        2),
    ("fluctuate",      3), ("formulate",       3), ("fragile",        2),
    ("generate",       2), ("hierarchy",       3), ("homogeneous",    3),
    ("hypothesis",     3), ("ideology",        3), ("implicit",       3),
    ("impose",         3), ("incentive",       3), ("incorporate",    3),
    ("indigenous",     3), ("inevitable",      3), ("infer",          3),
    ("inherent",       3), ("innovate",        2), ("integrity",      3),
    ("invoke",         3), ("isolate",         2), ("legitimate",     3),
    ("liberal",        2), ("linear",          2), ("logical",        2),
    ("mandatory",      2), ("marginal",        3), ("mediate",        3),
    ("migrate",        2), ("minimize",        3), ("moderate",       2),
    ("monitor",        2), ("mutual",          2), ("negate",         3),
    ("neutral",        2), ("norm",            2), ("notion",         3),
    ("objective",      2), ("obscure",         3), ("orthodox",       3),
    ("overlap",        2), ("paradigm",        3), ("precede",        3),
    ("predominant",    3), ("preliminary",     3), ("prevalent",      3),
    ("prohibit",       3), ("prompt",          2), ("qualitative",    3),
    ("quantitative",   3), ("random",          2), ("refute",         3),
    ("reinforce",      3), ("resilient",       3), ("rhetoric",       3),
    ("rigid",          2), ("robust",          3), ("scrutinize",     3),
    ("simulate",       3), ("skeptical",       3), ("subordinate",    3),
    ("subsequent",     3), ("substitute",      2), ("subtle",         3),
    ("superficial",    3), ("supplement",      3), ("suppress",       3),
    ("sustainable",    3), ("tangible",        3), ("terminate",      3),
    ("thesis",         3), ("tolerate",        2), ("trigger",        2),
    ("ultimately",     2), ("undermine",       3), ("uniform",        2),
    ("unprecedented",  3), ("valid",           2), ("verify",         2),
    ("viable",         3), ("vulnerable",      2),

    # ── PSYCHOMETRIC / AMIRNET EXAM SPECIFIC ──────────────────────────
    ("abolish",        3), ("abstract",        3), ("absurd",         2),
    ("abundant",       2), ("acute",           3), ("adapt",          2),
    ("adhere",         3), ("advocate",        3), ("aggression",     2),
    ("aggressive",     2), ("agile",           2), ("allegation",     3),
    ("alleviate",      3), ("ambiguous",       3), ("amplify",        3),
    ("animosity",      3), ("antagonist",      3), ("anticipate",     3),
    ("apathy",         3), ("apprehend",       3), ("arbitrary",      3),
    ("arduous",        3), ("articulate",      3), ("assert",         3),
    ("assertive",      3), ("astute",          3), ("atrocity",       3),
    ("audacious",      3), ("aversion",        3), ("avid",           3),
    ("benevolent",     3), ("blunt",           2), ("brevity",        3),
    ("candid",         3), ("catastrophe",     2), ("censure",        3),
    ("chronic",        2), ("circumvent",      3), ("coerce",         3),
    ("cognizant",      3), ("coherent",        3), ("collaborate",    2),
    ("compassion",     2), ("compelling",      2), ("competent",      2),
    ("complacent",     3), ("concede",         3), ("concise",        3),
    ("condemn",        2), ("conscientious",   3), ("consensus",      3),
    ("contempt",       3), ("contentious",     3), ("contraband",     3),
    ("conviction",     3), ("credible",        3), ("cunning",        2),
    ("cynical",        3), ("daunting",        3), ("deceive",        2),
    ("decisive",       2), ("defiant",         3), ("deliberate",     3),
    ("demoralize",     3), ("denounce",        3), ("deprive",        3),
    ("derogatory",     3), ("despise",         3), ("detrimental",    3),
    ("devious",        3), ("devout",          3), ("diligent",       2),
    ("discern",        3), ("discreet",        3), ("disdain",        3),
    ("disparity",      3), ("distraught",      3), ("diverse",        2),
    ("dubious",        3), ("earnest",         3), ("eccentric",      3),
    ("eloquent",       3), ("elusive",         3), ("eminent",        3),
    ("empathy",        2), ("emphasize",       2), ("enlighten",      2),
    ("erroneous",      3), ("evasive",         3), ("excessive",      2),
    ("exhaustive",     3), ("exonerate",       3), ("expedite",       3),
    ("explicit",       3), ("facade",          3), ("fallacy",        3),
    ("fanatical",      3), ("fervent",         3), ("fictitious",     3),
    ("flagrant",       3), ("flexible",        2), ("formidable",     3),
    ("fraudulent",     3), ("futile",          3), ("genuine",        2),
    ("grievance",      3), ("groundless",      3), ("gullible",       3),
    ("hamper",         3), ("haughty",         3), ("hazard",         2),
    ("heresy",         3), ("hostile",         2), ("hypocrisy",      3),
    ("hypocrite",      2), ("imminent",        3), ("impartial",      3),
    ("impediment",     3), ("implicate",       3), ("impractical",    3),
    ("impulsive",      2), ("incisive",        3), ("indifferent",    3),
    ("indignant",      3), ("indulge",         3), ("inevitable",     3),
    ("infallible",     3), ("instigate",       3), ("intimidate",     2),
    ("ironic",         2), ("irony",           2), ("jeopardize",     3),
    ("keen",           2), ("lenient",         3), ("lethal",         2),
    ("lucid",          3), ("malice",          3), ("malicious",      3),
    ("manipulate",     3), ("mediocre",        3), ("melancholy",     3),
    ("meticulous",     3), ("militant",        3), ("mock",           2),
    ("monotonous",     3), ("motive",          2), ("notorious",      3),
    ("objective",      2), ("obsess",          2), ("obstruct",       3),
    ("ominous",        3), ("oppress",         3), ("optimistic",     2),
    ("outrage",        2), ("overcome",        2), ("overwhelm",      2),
    ("patronize",      3), ("peculiar",        2), ("pessimistic",    2),
    ("plausible",      3), ("pompous",         3), ("pragmatic",      3),
    ("precarious",     3), ("prejudice",       2), ("preposterous",   3),
    ("pretentious",    3), ("primitive",       2), ("proactive",      2),
    ("profound",       3), ("propaganda",      3), ("prosperous",     2),
    ("provocative",    3), ("prudent",         3), ("rationalize",    3),
    ("retaliate",      3), ("ruthless",        3), ("sanction",       3),
    ("sarcastic",      3), ("satirical",       3), ("scarce",         3),
    ("scrutinize",     3), ("sincere",         2), ("skeptical",      3),
    ("slander",        3), ("stagnant",        3), ("steadfast",      3),
    ("stereotype",     2), ("stigma",          3), ("subversive",     3),
    ("superstition",   2), ("tenacious",       3), ("tolerance",      2),
    ("tyranny",        3), ("undermine",       3), ("usurp",          3),
    ("validate",       3), ("vanity",          2), ("vengeance",      3),
    ("vigilant",       3), ("virtue",          2), ("vivid",          2),
    ("volatile",       3), ("zealous",         3),
    ("groundless",     3),   # without basis — manually added, missing from dict

    # ── COMMON TV / EVERYDAY ACADEMIC ────────────────────────────────
    ("accuse",         1), ("addiction",       2), ("aggressive",     2),
    ("alliance",       2), ("ally",            2), ("ambition",       2),
    ("ancestor",       2), ("anxiety",         2), ("approve",        1),
    ("arrest",         1), ("attempt",         1), ("attitude",       2),
    ("awareness",      2), ("ban",             1), ("bankruptcy",     2),
    ("barrier",        2), ("blackmail",       2), ("bribe",          2),
    ("burden",         2), ("campaign",        2), ("celebrate",      1),
    ("chaos",          2), ("circumstance",    3), ("civilian",       2),
    ("collapse",       2), ("compensation",    3), ("complaint",      1),
    ("confess",        2), ("conspiracy",      3), ("corrupt",        2),
    ("corruption",     2), ("crisis",          2), ("custody",        2),
    ("deadline",       1), ("deceive",         2), ("defend",         1),
    ("democracy",      2), ("depressed",       1), ("diagnose",       2),
    ("dismiss",        2), ("divorce",         1), ("donate",         1),
    ("drug",           1), ("election",        1), ("emergency",      1),
    ("empire",         2), ("enforce",         3), ("equality",       2),
    ("escape",         1), ("exclude",         3), ("execute",        2),
    ("exile",          2), ("expose",          2), ("extremist",      2),
    ("fraud",          2), ("freedom",         1), ("guilty",         1),
    ("heritage",       2), ("honor",           1), ("hostage",        2),
    ("illegal",        1), ("immigrate",       2), ("immunity",       2),
    ("impeach",        3), ("imprison",        2), ("innocent",       1),
    ("interfere",      2), ("intimidate",      2), ("investigate",    2),
    ("invasion",       2), ("justice",         1), ("kidnap",         1),
    ("lawsuit",        2), ("leak",            1), ("liberty",        2),
    ("manipulate",     3), ("mediate",         3), ("military",       1),
    ("negotiate",      2), ("neutral",         2), ("nuclear",        2),
    ("occupation",     1), ("oppression",      3), ("pardon",         2),
    ("patriot",        2), ("penalty",         2), ("poverty",        1),
    ("prejudice",      2), ("protest",         2), ("punish",         1),
    ("rebel",          2), ("recruit",         2), ("regime",         2),
    ("resign",         2), ("revenge",         2), ("revolution",     2),
    ("riot",           2), ("rumor",           1), ("sanction",       3),
    ("scandal",        2), ("sentence",        1), ("slavery",        2),
    ("smuggle",        2), ("solidarity",      3), ("sovereignty",    3),
    ("spy",            1), ("surrender",       2), ("suspect",        1),
    ("territory",      2), ("terrorism",       2), ("torture",        3),
    ("tradition",      1), ("treaty",          2), ("trial",          2),
    ("tribute",        2), ("tyranny",         3), ("undermine",      3),
    ("unify",          2), ("uprising",        2), ("verdict",        2),
    ("veteran",        2), ("violence",        2), ("weapon",         1),
    ("witness",        1),
]


def load_big_dict(path):
    """Load the downloaded dictionary into {word.lower(): first_hebrew_translation}."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    lookup = {}
    for entry in data:
        eng = entry.get("translated", "").strip().lower()
        translations = entry.get("translation", [])
        pos = entry.get("part_of_speech", "")

        if not eng or not translations:
            continue

        # Take the first translation; clean up nikud and extra parenthetical
        raw_he = translations[0].strip()
        # Remove nikud (Hebrew vowel points U+05B0–U+05C7)
        clean_he = re.sub(r'[\u05B0-\u05C7]', '', raw_he)
        # Shorten long explanations: take text before first "(" if too long
        if len(clean_he) > 40 and "(" in clean_he:
            clean_he = clean_he[:clean_he.index("(")].strip()
        # Map English POS to short form
        pos_map = {
            "verb": "Verb", "noun": "Noun", "adjective": "Adjective",
            "adverb": "Adverb", "preposition": "Preposition",
            "conjunction": "Conjunction", "determiner": "Adjective",
        }
        lookup[eng] = {
            "translation": clean_he,
            "pos": pos_map.get(pos.lower(), ""),
        }
    return lookup


def load_existing(path):
    """Load existing academicDB.json as {word: entry}."""
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {e["word"].lower(): e for e in data}


def deduplicate(entries):
    seen = {}
    for e in entries:
        key = e["word"].lower()
        # If duplicate, keep higher level
        if key not in seen or e["level"] > seen[key]["level"]:
            seen[key] = e
    return sorted(seen.values(), key=lambda x: x["word"].lower())


# Manual translations for words missing from the downloaded dictionary
MANUAL_TRANSLATIONS = {
    "groundless":  ("חסר בסיס, ללא הצדקה",  "Adjective"),
    "nonetheless": ("בכל זאת, למרות זאת",    "Adverb"),
    "proactive":   ("יזום, פרואקטיבי",        "Adjective"),
    "pragmatic":   ("פרגמטי, מעשי",           "Adjective"),
    "stereotype":  ("סטריאוטיפ",              "Noun"),
    "stigma":      ("סטיגמה, קלון",           "Noun"),
    "empathy":     ("אמפתיה",                 "Noun"),
    "resilient":   ("עמיד, חסין",             "Adjective"),
    "rhetoric":    ("רטוריקה",                "Noun"),
    "scrutinize":  ("לבחון בקפידה",           "Verb"),
}


def main():
    print("Loading big dictionary...")
    big = load_big_dict(BIG_DICT_PATH)
    print(f"  {len(big)} entries loaded")

    print("Loading existing academic DB...")
    existing = load_existing(EXISTING_JSON)
    print(f"  {len(existing)} entries")

    # Deduplicate the curated list (keep highest level for duplicates)
    curated_map = {}
    for word, level in ACADEMIC_WORDS:
        w = word.lower()
        if w not in curated_map or level > curated_map[w]:
            curated_map[w] = level

    results = []
    not_found = []

    for word, level in curated_map.items():
        if word in existing:
            # Keep existing entry, update level if higher
            entry = dict(existing[word])
            if level > entry.get("level", 0):
                entry["level"] = level
            results.append(entry)
        elif word in big:
            entry = {
                "word":        word,
                "translation": big[word]["translation"],
                "pos":         big[word]["pos"],
                "level":       level,
            }
            results.append(entry)
        elif word in MANUAL_TRANSLATIONS:
            he, pos = MANUAL_TRANSLATIONS[word]
            results.append({"word": word, "translation": he, "pos": pos, "level": level})
        else:
            not_found.append(word)

    # Also keep all existing entries not in curated list
    for word, entry in existing.items():
        if word not in curated_map:
            results.append(entry)

    results = deduplicate(results)

    # Write CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["English_Word", "Hebrew_Translation", "Part_of_Speech", "Amirnet_Level"])
        for e in results:
            writer.writerow([e["word"], e["translation"], e.get("pos", ""), e["level"]])

    # Write JSON
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Summary
    levels = {1: 0, 2: 0, 3: 0}
    for e in results:
        levels[e.get("level", 1)] += 1

    print()
    print("=" * 50)
    print(f"  Total words:            {len(results)}")
    print(f"  Level 1 (Basic):        {levels[1]}")
    print(f"  Level 2 (Intermediate): {levels[2]}")
    print(f"  Level 3 (Advanced):     {levels[3]}")
    print(f"  Not found in dict:      {len(not_found)}")
    if not_found:
        print(f"  Missing: {', '.join(not_found[:20])}")
    print("=" * 50)
    print(f"  Written: {OUT_CSV}")
    print(f"  Written: {OUT_JSON}")


if __name__ == "__main__":
    main()
