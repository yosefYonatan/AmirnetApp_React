import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tv, BookOpen, GraduationCap, FolderOpen, Trophy, Swords, Layers } from 'lucide-react';

// ==========================================
// NavBar — Bottom navigation bar
//
// Clicking an already-active tab navigates to it again with a
// fresh location.key, which causes pages to detect the re-visit
// and reset their local state (e.g. exam goes back to setup screen).
// ==========================================

const NAV_ITEMS = [
  { to: '/vocabulary',  icon: BookOpen,      label: 'מילים'   },
  { to: '/flashcards',  icon: Layers,        label: 'כרטיסים' },
  { to: '/exam',        icon: GraduationCap, label: 'מבחן'    },
  { to: '/folders',     icon: FolderOpen,    label: 'תיקיות'  },
  { to: '/battle',      icon: Swords,        label: 'קרב'     },
  { to: '/leaderboard', icon: Trophy,        label: 'טבלה'    },
  { to: '/watch',       icon: Tv,            label: 'צפייה'   },
];

const NavBar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-md border-t bg-white/98 border-slate-200/60 dark:bg-slate-950/98 dark:border-slate-800/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex justify-around items-center h-20 max-w-2xl mx-auto px-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;

          return (
            <li key={to} className="flex-1">
              <button
                onClick={() => navigate(to, { state: { resetAt: Date.now() } })}
                className={`w-full flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all min-h-[56px]
                  ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <span className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-500/20' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                </span>
                <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
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
