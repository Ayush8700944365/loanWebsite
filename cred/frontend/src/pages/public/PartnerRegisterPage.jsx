import React from 'react';
import { PartnerRegistrationForm } from '../../components/forms/PartnerRegistrationForm';
import { Briefcase, CheckCircle2, TrendingUp, Award, Zap } from 'lucide-react';

export const PartnerRegisterPage = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-white px-3.5 py-1.5 rounded-full border border-amber-200 shadow-xs">
            DSA Channel Network
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Partner With REALCRED
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Apply to join our partner network and track approved referrals through the partner portal.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PartnerRegistrationForm />

        {/* Partner Benefits */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-brand-navy text-sm">Agreed Commission Terms</h4>
            <p className="text-xs text-slate-500">Commission terms are configured from the approved partner agreement.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-royal flex items-center justify-center mx-auto font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-brand-navy text-sm">Automated Settlement</h4>
            <p className="text-xs text-slate-500">Payout status is available for approved partner accounts.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-brand-navy text-sm">Dedicated Relationship Mgr</h4>
            <p className="text-xs text-slate-500">Direct phone support for priority logins and faster file clearance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

