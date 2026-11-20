import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RealCredLogo } from '../../components/common/RealCredLogo';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('admin@realcred.in');
  const [password, setPassword] = useState('••••••••••••');
  const { setCurrentUserRole, showToast } = useApp();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setCurrentUserRole('admin');
    localStorage.setItem('realcred_role', 'admin');
    showToast('Authenticated as Administrator', 'success');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-premium space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <RealCredLogo />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand-navy text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-royal" />
            <span>CENTRAL CRM ADMIN PORTAL</span>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-navy">Sign In to Dashboard</h2>
          <p className="text-xs text-slate-500">
            Authorized management access for underwriting and finance control.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Corporate Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-brand-royal font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-brand-royal font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Demo Mode: Pre-filled credentials</span>
            <span className="font-mono font-bold text-brand-royal">Admin Role</span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-brand-navy hover:bg-brand-royal text-white font-extrabold text-xs rounded-xl shadow-glow transition-all flex items-center justify-center space-x-2"
          >
            <span>Authenticate & Enter Admin CRM</span>
            <ArrowRight className="w-4 h-4 text-brand-teal" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link to="/" className="hover:text-brand-navy font-semibold">← Return to Website</Link>
          <Link to="/employee/login" className="text-brand-royal font-bold hover:underline">Officer Login →</Link>
        </div>
      </div>
    </div>
  );
};

