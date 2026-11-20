import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RealCredLogo } from '../../components/common/RealCredLogo';
import { useApp } from '../../context/AppContext';
import { Briefcase, Lock, Mail, ArrowRight } from 'lucide-react';

export const PartnerLoginPage = () => {
  const [email, setEmail] = useState('rajesh@apexrealty.com');
  const [password, setPassword] = useState('••••••••••••');
  const { setCurrentUserRole, showToast } = useApp();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setCurrentUserRole('partner');
    localStorage.setItem('realcred_role', 'partner');
    showToast('Signed in as DSA Partner: Apex Realty Finserve', 'success');
    navigate('/partner');
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-premium space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <RealCredLogo />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold">
            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
            <span>CHANNEL PARTNER (DSA) PORTAL</span>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-navy">Partner Sign In</h2>
          <p className="text-xs text-slate-500">
            Submit leads, inspect live status timelines and track fortnightly commission payouts.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Partner Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-medium"
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
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Demo Mode: Pre-filled credentials</span>
            <span className="font-mono font-bold text-amber-700">PRT-301 (Apex Realty)</span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <span>Enter Partner Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link to="/" className="hover:text-brand-navy font-semibold">← Return to Website</Link>
          <Link to="/partner-register" className="text-amber-700 font-bold hover:underline">New Partner Register →</Link>
        </div>
      </div>
    </div>
  );
};

