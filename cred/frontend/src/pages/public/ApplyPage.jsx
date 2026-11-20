import React from 'react';
import { MultiStepLoanApplication } from '../../components/forms/MultiStepLoanApplication';

export const ApplyPage = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-royal bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
            Loan application
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Share your loan application
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Provide your details and any documents requested for the selected category. Submitting an application does not guarantee approval; a lender makes any credit decision after its review.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MultiStepLoanApplication />
      </div>
    </div>
  );
};

