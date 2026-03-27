import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tv, BookOpen, GraduationCap, Trophy, Swords, Layers, Home } from 'lucide-react';
import { useVocab } from '../context/VocabContext';

// ==========================================
// NavBar — Bottom navigation bar
//
// Clicking an already-active tab navigates to it again with a
// fresh location.key, which causes pages to detect the re-visit
// and reset their local state (e.g. exam goes back to setup screen).
// ==========================================

const SUBJECT_ROUTES = ['/english', '/math', '/hebrew'];

const STATIC_ITEMS = [
  { to: '/flashcards',  icon: Layers,        label: 'כרטיסים' },
  { to: '/battle',      icon: Swords,        label: 'קרב'     },
  { to: '/vocabulary',  icon: BookOpen,      label: 'מילים'   },
  { to: '/exam',        icon: GraduationCap, label: 'מבחן'    },
  { to: '/leaderboard', icon: Trophy,        label: 'טבלה'    },
  { to: '/watch',       icon: Tv,            label: 'צפייה'   },
];

const NavBar = () => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { currentSubject } = useVocab();

  if (location.pathname === '/hub') return null;

  // Home goes to the active subject dashboard (or /hub if none selected)
  const homeRoute = currentSubject ? `/${currentSubject}` : '/hub';
  const isHomeActive =
    location.pathname === homeRoute ||
    SUBJECT_ROUTES.includes(location.pathname) ||
    location.pathname === '/';

  const navItems = [
    { to: homeRoute, icon: Home, label: 'בית', isHome: true },
    ...STATIC_ITEMS,
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex justify-around items-center h-14 max-w-2xl mx-auto px-0">
        {navItems.map(({ to, icon: Icon, label, isHome }) => {
          const isActive = isHome ? isHomeActive : location.pathname === to;

          return (
            <li key={label} className="flex-1">
              <button
                onClick={() => navigate(to, { state: { resetAt: Date.now() } })}
                className={`w-full flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all
                  ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <span className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-500/15' : ''}`}>
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 1.75} />
                </span>
                <span className={`text-[8px] font-bold leading-none ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NavBar;
