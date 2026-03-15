import React, { useState } from 'react';
import { X, User, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';

// ==========================================
// AuthModal — username / password auth
//
// Internally converts username → username@amirnet.app
// so Supabase Auth is satisfied without exposing real emails.
//
// Props:
//   onClose()
//   onSignIn(username, password) → Promise<{ error }>
//   onSignUp(username, password) → Promise<{ error }>
// ==========================================

const USERNAME_RE = /^[a-zA-Z0-9_\u0590-\u05FF]{2,24}$/;

const AuthModal = ({ onClose, onSignIn, onSignUp, forced = false }) => {
  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || !password) return;

    if (isSignUp && !USERNAME_RE.test(trimmed)) {
      setError('שם משתמש: 2–24 תווים, אותיות / ספרות / _ בלבד');
      return;
    }

    setLoading(true);
    setError(null);

    const fn = isSignUp ? onSignUp : onSignIn;
    const { error: authError } = await fn(trimmed, password);

    setLoading(false);
    if (authError) {
      // Translate common Supabase error messages to Hebrew
      const msg = authError.message ?? '';
      if (msg.includes('Invalid login')) {
        setError('שם משתמש או סיסמה שגויים');
      } else if (msg.includes('already registered')) {
        setError('שם המשתמש כבר תפוס. נסה שם אחר');
      } else {
        setError(msg || 'שגיאה. נסה שוב.');
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="font-black text-xl text-white">
              {isSignUp ? 'הרשמה' : 'כניסה'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {forced
                ? 'כדי להשתמש באפליקציה יש ליצור חשבון'
                : isSignUp ? 'ללא אימייל — רק שם משתמש וסיסמה' : 'המשך עם חשבון קיים'}
            </p>
          </div>
          {!forced && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <User size={13} /> שם משתמש
            </label>
            <input
              type="text"
              dir="ltr"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null); }}
              placeholder="myname123"
              autoComplete="username"
              required
              className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-sm outline-none transition placeholder:text-slate-600"
            />
            {isSignUp && (
              <p className="text-slate-600 text-xs">אותיות, ספרות, קו תחתון — 2 עד 24 תווים</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Lock size={13} /> סיסמה
            </label>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="לפחות 6 תווים"
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-sm outline-none transition placeholder:text-slate-600"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || password.length < 6}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition active:scale-95"
          >
            {loading
              ? <Loader2 size={20} className="animate-spin" />
              : isSignUp
                ? <><UserPlus size={20} /> הרשמה</>
                : <><LogIn size={20} /> כניסה</>
            }
          </button>

          {/* Toggle mode */}
          <p className="text-center text-slate-500 text-sm">
            {isSignUp ? 'כבר יש לך חשבון?' : 'עוד אין חשבון?'}
            {' '}
            <button
              type="button"
              onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(null); }}
              className="text-blue-400 hover:text-blue-300 font-bold transition"
            >
              {isSignUp ? 'כניסה' : 'הרשמה'}
            </button>
          </p>

          <p className="text-center text-slate-700 text-xs">
            🔒 לא נדרש אימייל — הנתונים שלך בטוחים
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
