import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '../../utils/formatters';
import { Calculator, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EMICalculator = ({ compact = false, showApplyCTA = true }) => {
  const [loanAmount, setLoanAmount] = useState(5000000); // 50 Lakhs
  const [interestRate, setInterestRate] = useState(8.5); // 8.5%
  const [tenureYears, setTenureYears] = useState(20); // 20 years

  const calculation = useMemo(() => {
    const P = Number(loanAmount);
    const r = Number(interestRate) / 12 / 100;
    const n = Number(tenureYears) * 12;

    if (P <= 0 || r <= 0 || n <= 0) {
      return { emi: 0, totalPayment: 0, totalInterest: 0 };
    }

    // Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    return {
      emi,
      totalPayment,
      totalInterest
    };
  }, [loanAmount, interestRate, tenureYears]);

  const chartData = [
    { name: 'Principal Amount', value: Number(loanAmount), color: '#DC2626' },
    { name: 'Total Interest', value: Math.max(0, calculation.totalInterest), color: '#1E293B' }
  ];

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-premium card-3d overflow-hidden ${compact ? 'p-5' : 'p-6 sm:p-10'}`}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-100 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-brand-royal text-xs font-semibold mb-2">
              <Calculator className="w-3.5 h-3.5 text-brand-royal" />
              <span>LOCAL ESTIMATE</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
              Interactive Loan EMI Calculator
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Estimate your monthly repayment schedule and interest breakout instantly with live sliders.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>For illustration only</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Loan Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">Loan Amount</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-royal">
                <span className="text-brand-royal font-bold text-sm mr-1">₹</span>
                <input
                  type="number"
                  min="100000"
                  max="100000000"
                  step="50000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-32 bg-transparent text-right font-bold text-brand-navy focus:outline-hidden text-sm"
                />
              </div>
            </div>
            <input
              type="range"
              min="500000"
              max="50000000"
              step="100000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-royal"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>₹5 Lakhs</span>
              <span>₹2.5 Crores</span>
              <span>₹5 Crores</span>
            </div>
          </div>

          {/* 2. Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">Interest Rate (% p.a.)</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-royal">
                <input
                  type="number"
                  min="6.5"
                  max="20"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-16 bg-transparent text-right font-bold text-brand-navy focus:outline-hidden text-sm"
                />
                <span className="text-slate-500 font-bold text-sm ml-1">%</span>
              </div>
            </div>
            <input
              type="range"
              min="6.5"
              max="18"
              step="0.05"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-royal"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>6.5%</span>
              <span>10.5%</span>
              <span>18.0%</span>
            </div>
          </div>

          {/* 3. Loan Tenure */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">Loan Tenure (Years)</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-royal">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-14 bg-transparent text-right font-bold text-brand-navy focus:outline-hidden text-sm"
                />
                <span className="text-slate-500 font-bold text-sm ml-1">Yrs</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-royal"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>1 Year</span>
              <span>15 Years</span>
              <span>30 Years</span>
            </div>
          </div>

        </div>

        {/* Results & Donut Chart Column (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#142B4A] via-[#1B355A] to-[#0F223D] text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-white/10 flex flex-col justify-between">
          
          <div className="text-center sm:text-left mb-4">
            <span className="text-xs uppercase tracking-wider text-blue-200/80 font-bold">
              Calculated Monthly Repayment
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight flex items-baseline justify-center sm:justify-start">
              <span>{formatINR(calculation.emi)}</span>
              <span className="text-xs text-blue-200 font-normal ml-1.5">/ month</span>
            </div>
          </div>

          {/* Interactive Donut Chart */}
          <div className="relative h-44 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatINR(val)}
                  contentStyle={{
                    backgroundColor: '#142B4A',
                    borderRadius: '10px',
                    border: '1px solid #4385F5',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Total</span>
              <span className="text-xs font-bold text-white">
                ₹{((calculation.totalPayment) / 100000).toFixed(1)}L
              </span>
            </div>
          </div>

          {/* Key Figures Breakdown */}
          <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-royal" />
                <span className="text-slate-300">Principal Amount</span>
              </div>
              <span className="font-bold text-white">{formatINR(loanAmount)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-teal" />
                <span className="text-slate-300">Total Interest Payable</span>
              </div>
              <span className="font-bold text-brand-teal">{formatINR(calculation.totalInterest)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10 font-bold">
              <span className="text-white">Total Amount (P + I)</span>
              <span className="text-white text-sm">{formatINR(calculation.totalPayment)}</span>
            </div>
          </div>

          {showApplyCTA && (
            <Link
              to="/apply"
              className="mt-6 w-full py-3 bg-brand-royal hover:bg-brand-electric text-white font-bold text-xs rounded-xl shadow-glow transition-all flex items-center justify-center space-x-2 group"
            >
              <span>Apply With These Terms</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

        </div>

      </div>
    </div>
  );
};

