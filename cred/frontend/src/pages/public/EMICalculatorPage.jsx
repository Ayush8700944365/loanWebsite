import React from 'react';
import { EMICalculator } from '../../components/common/EMICalculator';
import { ShieldCheck, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EMICalculatorPage = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-royal bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
            Financial Planning Utility
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Advanced EMI Calculator
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Plan your budget with precision. Adjust principal, interest rate, and tenure to visualize your exact monthly repayment and total interest outflow.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EMICalculator compact={false} showApplyCTA={true} />
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-lg font-bold text-brand-navy">How is EMI Calculated?</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Equated Monthly Installment (EMI) is calculated using the standard reducing balance mathematical formula:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-brand-navy text-center">
            EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Where <strong>P</strong> is the Loan Principal Amount, <strong>R</strong> is the monthly interest rate (Annual Rate / 12 / 100), and <strong>N</strong> is the number of monthly installments.
          </p>
        </div>
      </section>
    </div>
  );
};

