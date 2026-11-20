import React, { useState } from 'react';
import { formatINR, formatLakhCrore } from '../../utils/formatters';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Local estimate shared with the public homepage teaser; no backend eligibility API is used.
export const calculateEligibleLoanAmount = (income, existingEMI) => {
  const maxAllowableEMI = Math.max(0, Number(income || 0) * 0.55 - Number(existingEMI || 0));
  return Math.round((maxAllowableEMI / 868) * 100000);
};

export const LoanEligibilityChecker = () => {
  const [income, setIncome] = useState(85000);
  const [employmentType, setEmploymentType] = useState('Salaried');
  const [existingEMI, setExistingEMI] = useState(12000);
  const [requiredAmount, setRequiredAmount] = useState(4500000);
  const [category, setCategory] = useState('Home Loan');
  const [hasCalculated, setHasCalculated] = useState(false);

  // Standard Banking FOIR (Fixed Obligation to Income Ratio) calculation:
  // Typically banks allow up to 50% - 60% of net monthly income for all EMIs combined.
  const maxAllowableEMI = Math.max(0, income * 0.55 - existingEMI);
  // Estimate loan eligibility at ~8.5% interest for 20 years (~₹868 per lakh)
  const estimatedEligibleAmount = Math.round((maxAllowableEMI / 868) * 100000);

  const isEligible = estimatedEligibleAmount >= requiredAmount;

  const handleCheck = (e) => {
    e.preventDefault();
    setHasCalculated(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-premium card-3d p-6 sm:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>LOCAL ELIGIBILITY ESTIMATE</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
            Check Your Loan Eligibility
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Estimate a possible borrowing amount from the values entered below. This local calculation is not a lender decision or pre-approval.
          </p>
        </div>

        <form onSubmit={handleCheck} className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Monthly Net Income (₹)
            </label>
            <input
              type="number"
              min="15000"
              max="5000000"
              step="5000"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">In-hand salary / net business profit</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
            >
              <option value="Salaried">Salaried (MNC / Corporate / Govt)</option>
              <option value="Self-Employed Professional">Self-Employed Professional (Doctor, CA, Architect)</option>
              <option value="Business Owner">Business Owner / Trader / Manufacturer</option>
              <option value="NRI">Non-Resident Indian (NRI)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Existing Monthly EMI Obligations (₹)
            </label>
            <input
              type="number"
              min="0"
              max="1000000"
              step="1000"
              value={existingEMI}
              onChange={(e) => setExistingEMI(Number(e.target.value))}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Current active car, personal, or bike EMIs</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Desired Loan Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
            >
              <option value="Home Loan">Home Loan (PSU & Private)</option>
              <option value="Personal Loan">Personal Loan (Instant Disbursal)</option>
              <option value="Business Loan">Business Loan (Working Capital)</option>
              <option value="Vehicle Loan">Vehicle Loan (Up to 100% On-road)</option>
              <option value="Loan Against Property">Loan Against Property (Mortgage)</option>
              <option value="Education Loan">Education Loan (Global Universities)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Required Loan Amount: <span className="text-brand-royal font-extrabold">{formatINR(requiredAmount)}</span>
            </label>
            <input
              type="range"
              min="500000"
              max="20000000"
              step="250000"
              value={requiredAmount}
              onChange={(e) => setRequiredAmount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-royal"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>₹5 Lakhs</span>
              <span>₹1 Crore</span>
              <span>₹2 Crores</span>
            </div>
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-brand-navy hover:bg-brand-royal text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Calculate Eligibility Score</span>
              <Sparkles className="w-4 h-4 text-brand-teal" />
            </button>
          </div>
        </form>

        {/* Results Screen */}
        {hasCalculated && (
          <div className={`p-6 sm:p-7 rounded-2xl border transition-all animate-in fade-in duration-300 ${
            isEligible ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isEligible ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {isEligible ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {isEligible
                      ? 'The estimate is above your requested amount'
                      : 'The estimate is below your requested amount'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isEligible
                      ? `This local estimate is above the requested ₹${(requiredAmount / 100000).toFixed(1)} Lakhs. A lender must assess the application independently.`
                      : `This local estimate is ₹${(estimatedEligibleAmount / 100000).toFixed(1)} Lakhs. A lender may calculate a different amount.`}
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Max Eligible Amount
                </span>
                <span className="text-2xl font-extrabold text-brand-navy block">
                  {formatINR(estimatedEligibleAmount)}
                </span>
                <span className="text-xs text-brand-royal font-semibold">
                  Max Permissible EMI: {formatINR(maxAllowableEMI)}/mo
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 italic">
                * This local calculator uses an illustrative 55% income allocation and ₹868 per lakh conversion assumption. Lender affordability methods and decisions differ.
              </span>
              <Link
                to="/apply"
                className="px-5 py-2.5 bg-brand-royal hover:bg-brand-navy text-white font-bold rounded-xl flex items-center justify-center space-x-2 flex-shrink-0 transition-colors shadow-xs"
              >
                <span>Proceed to Apply</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

