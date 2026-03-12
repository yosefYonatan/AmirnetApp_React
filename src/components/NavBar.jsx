import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tv, BookOpen, GraduationCap, FolderOpen } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/watch',      icon: Tv,             label: 'צפייה'    },
  { to: '/review',     icon: BookOpen,        label: 'סקירה'    },
  { to: '/exam',       icon: GraduationCap,   label: 'מבחן'     },
  { to: '/categories', icon: FolderOpen,      label: 'קטגוריות' },
];

const NavBar = () => (
  <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/98 backdrop-blur-md border-t border-slate-800/60"
       style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <ul className="flex justify-around items-center h-20 max-w-2xl mx-auto px-1">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <li key={to} className="flex-1">
          <NavLink
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all min-h-[56px]
               ${isActive ? 'text-blue-400' : 'text-slate-500'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`p-2 rounded-2xl transition-all
                  ${isActive ? 'bg-blue-500/20' : ''}`}>
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 1.75} />
                </span>
                <span className={`text-[11px] font-bold leading-none
                  ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

export default NavBar;
