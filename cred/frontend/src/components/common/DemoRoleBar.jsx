import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Briefcase, Globe, Sparkles } from 'lucide-react';

export const DemoRoleBar = () => {
  const { currentUserRole, setCurrentUserRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isPublic = !location.pathname.startsWith('/admin') &&
                   !location.pathname.startsWith('/employee') &&
                   !location.pathname.startsWith('/partner');

  const isAdmin = location.pathname.startsWith('/admin');
  const isEmployee = location.pathname.startsWith('/employee');
  const isPartner = location.pathname.startsWith('/partner');

  const switchPortal = (role, path) => {
    setCurrentUserRole(role);
    localStorage.setItem('realcred_role', role);
    navigate(path);
  };

  return (
    <aside aria-label="Demo Portal Switcher" className="bg-brand-navy text-white text-xs border-b border-brand-royal/20 py-2 px-4 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-royal/30 text-blue-200 border border-brand-royal/40">
            <Sparkles className="w-3 h-3 mr-1 text-brand-teal" />
            ENTERPRISE FINTECH DEMO
          </span>
          <span className="hidden sm:inline text-slate-300 font-medium">
            Switch between the 4 complete portals:
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => switchPortal('public', '/')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
              isPublic
                ? 'bg-brand-royal text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>

          <button
            onClick={() => switchPortal('admin', '/admin')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
              isAdmin
                ? 'bg-brand-royal text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-teal" />
            <span>Admin Portal</span>
          </button>

          <button
            onClick={() => switchPortal('employee', '/employee')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
              isEmployee
                ? 'bg-brand-royal text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-300" />
            <span>Employee Portal</span>
          </button>

          <button
            onClick={() => switchPortal('partner', '/partner')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
              isPartner
                ? 'bg-brand-royal text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-300" />
            <span>Partner Portal</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

