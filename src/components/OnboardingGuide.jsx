import React, { useState, useEffect } from 'react';
import {
  Tv, BookOpen, GraduationCap, FolderOpen,
  CheckCircle2, XCircle, HelpCircle,
  Play, Mic, X, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';

// ==========================================
// OnboardingGuide — First-time user tutorial
//
// Shows a step-by-step walkthrough of all main features.
// Stored in localStorage so it only shows once.
// User can skip at any time.
// ==========================================

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    iconColor: 'from-blue-500 to-indigo-600',
    title: 'ברוך הבא ל-Amirnet TV!',
    subtitle: 'המדריך יסביר לך איך להשתמש באפליקציה',
    body: (
      <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
        <p>
          האפליקציה עוזרת לך ללמוד <strong className="text-white">אנגלית אקדמית</strong> בדרך הכי כיפית —
          תוך כדי צפייה בסדרות האהובות עליך.
        </p>
        <p>
          בארבעה מסכים פשוטים תוכל לאסוף מילים, לסקור אוצר מילים, לבחון את עצמך ולנהל תיקיות לימוד.
        </p>
        <p className="text-slate-500 text-xs">המדריך הזה יוצג פעם אחת בלבד. אפשר לדלג בכל שלב.</p>
      </div>
    ),
  },
  {
    id: 'watch',
    icon: Tv,
    iconColor: 'from-green-500 to-emerald-600',
    title: 'מסך 1: צפייה',
    subtitle: 'אסוף מילים בזמן אמת תוך כדי צפייה',
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <Play fill="white" size={18} />
            </div>
            <div>
              <p className="font-bold text-white">בחר סדרה ופרק</p>
              <p className="text-slate-400 text-xs">לחץ על שם הסדרה → בחר עונה ופרק → לחץ "התחל צפייה"</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Mic size={18} className="text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-white">הוסף מילים</p>
              <p className="text-slate-400 text-xs">הקלד מילה שלא הבנת בשדה הטקסט, או לחץ על הסמן לקלט קולי</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 text-xs font-black">✓</span>
            </div>
            <div>
              <p className="font-bold text-white">תרגום אוטומטי</p>
              <p className="text-slate-400 text-xs">המילה תתורגם מיד מהמאגר המקומי — גם ללא אינטרנט!</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'vocabulary',
    icon: BookOpen,
    iconColor: 'from-indigo-500 to-purple-600',
    title: 'מסך 2: אוצר מילים',
    subtitle: 'עבור על 538 מילים אקדמיות ודרג אותן',
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-slate-300">
          המאגר האקדמי מחולק ל<strong className="text-white">יחידות של 50 מילים</strong>.
          לכל מילה לחץ על אחד משלושה כפתורים:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/30 rounded-xl p-3">
            <CheckCircle2 size={22} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="font-black text-green-300">ידוע (✓)</p>
              <p className="text-slate-400 text-xs">את/ה מכיר/ה את המילה — לא נוצרת תיקייה</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/30 rounded-xl p-3">
            <XCircle size={22} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="font-black text-red-300">לא ידוע (✗)</p>
              <p className="text-slate-400 text-xs">המילה עוברת לתיקייה <strong className="text-white">"לא ידוע"</strong> לחזרה ממוקדת</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
            <HelpCircle size={22} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-black text-amber-300">לא בטוח (?)</p>
              <p className="text-slate-400 text-xs">המילה עוברת לתיקייה <strong className="text-white">"לא בטוח"</strong> לחזרה ממוקדת</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'exam',
    icon: GraduationCap,
    iconColor: 'from-rose-500 to-pink-600',
    title: 'מסך 3: מבחן',
    subtitle: 'בחן את עצמך על מילים מהפרק שצפית',
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-slate-300">
          לאחר שצפית ואספת מילים, עבור למסך <strong className="text-white">סקירה</strong> (מסך 2 הישן),
          בחר מילים ולחץ <strong className="text-white">התחל מבחן</strong>.
        </p>
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <p className="font-bold text-white">פורמט המבחן:</p>
          <ul className="text-slate-400 space-y-1 list-disc list-inside text-xs">
            <li>שאלות רב-ברירה עם 4 אפשרויות (א, ב, ג, ד)</li>
            <li>ניתן לבחור 5, 10, 15 שאלות או הכל</li>
            <li>בסיום — תוצאות מפורטות עם ניקוד</li>
            <li>דרגת מעבר לאמירנט: 80%+</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'folders',
    icon: FolderOpen,
    iconColor: 'from-amber-500 to-orange-600',
    title: 'מסך 4: תיקיות',
    subtitle: 'מאגר המילים שצריכות חזרה ממוקדת',
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-slate-300">
          כל מילה שסימנת ✗ או ? עוברת לכאן אוטומטית.
        </p>
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-white"><strong>לא ידוע</strong> — מילים שלא ידעת</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-amber-400 flex-shrink-0" />
            <p className="text-white"><strong>לא בטוח</strong> — מילים שלא בטוח בהן</p>
          </div>
          <div className="flex items-center gap-3">
            <Tv size={20} className="text-blue-400 flex-shrink-0" />
            <p className="text-white"><strong>מילים לפי סדרה</strong> — אוצר מילים ייחודי לכל תוכנית</p>
          </div>
        </div>
        <p className="text-slate-400 text-xs">
          כשתלמד מילה מהתיקייה — לחץ ✓ להוציא אותה מהתיקייה ולסמנה כ"ידוע"
        </p>
      </div>
    ),
  },
  {
    id: 'ready',
    icon: Sparkles,
    iconColor: 'from-blue-500 to-indigo-600',
    title: 'מוכן להתחיל!',
    subtitle: 'בחר סדרה ותתחיל ללמוד',
    body: (
      <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
        <p>
          הכל מוכן! הנה טיפ לתחילת דרך:
        </p>
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-2xl p-4 space-y-2">
          <p className="font-black text-blue-300 text-base">💡 המלצה לשגרת לימוד</p>
          <ol className="text-slate-300 space-y-1.5 list-decimal list-inside text-sm">
            <li>צפה בפרק וסמן מילים שלא הבנת</li>
            <li>בסיום הפרק — קח מבחן קצר (5-10 מילים)</li>
            <li>עבור ל"אוצר מילים" וסקור יחידה אחת ביום</li>
            <li>חזור על מילים מ"תיקיות" מדי שבוע</li>
          </ol>
        </div>
        <p className="text-center font-black text-white text-lg mt-4">!Good luck 🚀</p>
      </div>
    ),
  },
];

const STORAGE_KEY = 'amirnet_onboarding_done';

const OnboardingGuide = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    onComplete();
  };

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center p-4"
         style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-slate-900 rounded-3xl border border-slate-700 w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-1 bg-blue-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${current.iconColor} flex items-center justify-center mb-5 shadow-lg`}>
            <Icon size={30} className="text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-white mb-1">{current.title}</h2>
          <p className="text-slate-400 text-sm mb-5">{current.subtitle}</p>

          {/* Body */}
          <div>{current.body}</div>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {/* Skip */}
            <button
              onClick={finish}
              className="text-slate-500 hover:text-slate-300 text-sm font-bold transition px-2 py-2"
            >
              דלג
            </button>

            <div className="flex-1" />

            {/* Back */}
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition active:scale-90"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Next / Done */}
            <button
              onClick={isLast ? finish : () => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black transition active:scale-95 shadow-lg"
            >
              {isLast ? 'התחל!' : 'הבא'}
              {!isLast && <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step ? 'w-4 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to check if onboarding should show
export const shouldShowOnboarding = () => {
  try { return !localStorage.getItem(STORAGE_KEY); } catch { return false; }
};

export default OnboardingGuide;
