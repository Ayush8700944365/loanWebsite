import React from 'react';
import { LoanEligibilityChecker } from '../../components/common/LoanEligibilityChecker';

export const EligibilityPage = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-white px-3.5 py-1.5 rounded-full border border-teal-200 shadow-xs">
            Credit Capacity Estimation
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Check Loan Eligibility Online
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Find out how much loan amount you can qualify for based on your net income and existing obligations.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <LoanEligibilityChecker />
      </div>
    </div>
  );
};

