// ==========================================
// False Friends DB — Israeli English Traps
//
// Words that Hebrew speakers commonly misuse
// because of interference from Hebrew (עברית).
//
// Each entry:
//   word            — English word being tested
//   translation     — CORRECT Hebrew translation
//   falseTranslation — What Israelis often say instead
//   example         — Example sentence with the word
//   humor           — Funny toast shown on wrong answer
// ==========================================

export const FALSE_FRIENDS_DB = [
  {
    word: 'eventually',
    translation: 'בסופו של דבר',
    falseTranslation: 'בהמשך / אולי',
    example: 'She eventually found her keys after searching for an hour.',
    humor: '!Eventually ≠ בהמשך 😅 eventually = בסופו של דבר, לא "בהמשך כלשהו"',
  },
  {
    word: 'actually',
    translation: 'למעשה / בעצם',
    falseTranslation: 'כרגע / עכשיו',
    example: 'I actually enjoyed the movie more than I expected.',
    humor: '!Actually ≠ כרגע 🤦 actually = למעשה. "Currently" זה כרגע, אחי',
  },
  {
    word: 'sympathetic',
    translation: 'מבין ומזדהה',
    falseTranslation: 'נחמד / אהוד',
    example: 'The teacher was sympathetic when students struggled with the exam.',
    humor: '!Sympathetic ≠ נחמד 😬 sympathetic = מזדהה, לא "סימפטי" בעברית',
  },
  {
    word: 'nervous',
    translation: 'חרד / לחוץ',
    falseTranslation: 'עצבני / כועס',
    example: 'She was nervous before her job interview.',
    humor: '!Nervous ≠ עצבני 😤 nervous = חרד ולחוץ. כועס = angry, זוכר?',
  },
  {
    word: 'pretend',
    translation: 'להעמיד פנים',
    falseTranslation: 'לטעון / לומר',
    example: 'He pretended to be sick to avoid the meeting.',
    humor: '!Pretend ≠ לטעון 🎭 pretend = להעמיד פנים, לא "לטעון"',
  },
  {
    word: 'embarrassed',
    translation: 'נבוך',
    falseTranslation: 'מבויש / מוטרד',
    example: 'I was so embarrassed when I called the teacher "mom".',
    humor: '!Embarrassed ≠ מבויש לחלוטין 🫣 embarrassed = נבוך, מבויש קצת שונה',
  },
  {
    word: 'sensitive',
    translation: 'רגיש',
    falseTranslation: 'חכם / נבון',
    example: 'He is very sensitive to criticism.',
    humor: '!Sensitive ≠ חכם 💡 sensitive = רגיש, לא "סנסיטיבי" שזה גם לא מילה',
  },
  {
    word: 'confused',
    translation: 'מבולבל',
    falseTranslation: 'נלחץ / עצבני',
    example: 'I was confused by the directions and got lost.',
    humor: '!Confused ≠ נלחץ 🌀 confused = מבולבל, לא לחוץ',
  },
  {
    word: 'appreciate',
    translation: 'להעריך / להוקיר',
    falseTranslation: 'לאהוב / ליהנות',
    example: 'I really appreciate your help with this project.',
    humor: '!Appreciate ≠ לאהוב 🙏 appreciate = להוקיר תודה. "I appreciate it" = אני מוקיר',
  },
  {
    word: 'eventually',
    translation: 'בסופו של דבר',
    falseTranslation: 'אולי',
    example: 'He eventually got his dream job after many rejections.',
    humor: '!Eventually לא אומר "אולי" 😅 זה אומר שזה בטוח קרה, בסוף',
  },
  {
    word: 'assist',
    translation: 'לסייע / לעזור',
    falseTranslation: 'להשתתף / להיות שם',
    example: 'Can you assist me with this task?',
    humor: '!Assist ≠ להשתתף 🤝 assist = לעזור. "Attend" זה להשתתף',
  },
  {
    word: 'comprehensive',
    translation: 'מקיף / יסודי',
    falseTranslation: 'מובן / ברור',
    example: 'She wrote a comprehensive report on climate change.',
    humor: '!Comprehensive ≠ מובן 📚 comprehensive = מקיף. "Comprehensible" = מובן',
  },
  {
    word: 'desperate',
    translation: 'נואש',
    falseTranslation: 'נחוש / נחרץ',
    example: 'He was desperate for a solution to his problem.',
    humor: '!Desperate ≠ נחוש 😰 desperate = נואש, לא מישהו שיודע מה הוא רוצה',
  },
  {
    word: 'humiliated',
    translation: 'משפיל / מושפל',
    falseTranslation: 'צנוע / ענו',
    example: 'She felt humiliated after tripping in front of everyone.',
    humor: '!Humiliated ≠ צנוע 😳 humiliated = מושפל. "Humble" = צנוע',
  },
  {
    word: 'miserable',
    translation: 'אומלל / עלוב',
    falseTranslation: 'מסכן / עני',
    example: 'He was miserable during the long flight.',
    humor: '!Miserable ≠ עני כספית 😢 miserable = אומלל ואיש, לא בהכרח חסר כסף',
  },
  {
    word: 'delicate',
    translation: 'עדין / שביר',
    falseTranslation: 'טעים / מפנק',
    example: 'Handle the antique vase carefully, it is very delicate.',
    humor: '!Delicate ≠ טעים ודאי 🌸 delicate = עדין ושביר, לא אוכל טעים',
  },
  {
    word: 'exhausted',
    translation: 'מותש / עייף מאוד',
    falseTranslation: 'מרוגש / נרגש',
    example: 'After the marathon, she was completely exhausted.',
    humor: '!Exhausted ≠ נרגש 😴 exhausted = מותש לגמרי, לא excited',
  },
  {
    word: 'preserve',
    translation: 'לשמר / לשמור על',
    falseTranslation: 'לשמור (לעצמך) / לחסוך',
    example: 'We must preserve the forests for future generations.',
    humor: '!Preserve ≠ לחסוך כסף 🌳 preserve = לשמר משהו, לא לחסוך בנק',
  },
  {
    word: 'demonstrate',
    translation: 'להדגים / להוכיח',
    falseTranslation: 'להפגין (פוליטי)',
    example: 'The teacher demonstrated how to solve the equation.',
    humor: '!Demonstrate ≠ רק להפגין פוליטית 📊 demonstrate = להדגים, כמו בכיתה',
  },
  {
    word: 'adequate',
    translation: 'מספיק / הולם',
    falseTranslation: 'מצוין / נהדר',
    example: 'The hotel was adequate for a short trip.',
    humor: '!Adequate ≠ מצוין 😬 adequate = מספיק בדיוק, לא מרשים',
  },
  {
    word: 'familiar',
    translation: 'מוכר / מוכרת',
    falseTranslation: 'משפחתי / קרוב משפחה',
    example: 'That melody sounds familiar to me.',
    humor: '!Familiar ≠ בן משפחה 👪 familiar = מוכר. "Family member" = בן משפחה',
  },
  {
    word: 'initiative',
    translation: 'יוזמה',
    falseTranslation: 'חינוך / לימוד',
    example: 'She took the initiative and organized the event herself.',
    humor: '!Initiative ≠ לימוד 🚀 initiative = יוזמה, מישהו שעושה דברים לבד',
  },
  {
    word: 'convince',
    translation: 'לשכנע',
    falseTranslation: 'להודות / להסכים',
    example: 'I convinced my parents to let me go on the trip.',
    humor: '!Convince ≠ להסכים 💬 convince = לשכנע מישהו אחר, לא את עצמך',
  },
  {
    word: 'ambitious',
    translation: 'שאפתן',
    falseTranslation: 'חמדן / תאוותני',
    example: 'She is ambitious and wants to become a doctor.',
    humor: '!Ambitious ≠ חמדן 🎯 ambitious = שאפתן, מה שרצוי ולא שלילי',
  },
  {
    word: 'indicate',
    translation: 'להצביע על / לציין',
    falseTranslation: 'להראות (בידיים)',
    example: 'The results indicate a clear trend in the data.',
    humor: '!Indicate ≠ רק להצביע פיזית 📍 indicate = לציין, להצביע על נתון',
  },
];

// Build a fast lookup map
export const FALSE_FRIENDS_MAP = Object.create(null);
for (const e of FALSE_FRIENDS_DB) {
  FALSE_FRIENDS_MAP[e.word.toLowerCase()] = e;
}
