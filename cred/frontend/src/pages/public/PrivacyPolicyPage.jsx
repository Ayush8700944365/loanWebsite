import React from 'react';
import { ShieldCheck, FileText, Lock, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-slate-900 to-[#142B4A] text-white pt-16 pb-20 border-b border-slate-200/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Corporate Disclosure</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            RealCred Technology Private Limited
          </p>
        </div>
      </section>

      {/* Main Policy Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-10">
          
          {/* Table of Contents */}
          <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs space-y-2.5">
            <h3 className="font-extrabold uppercase tracking-wider text-slate-800 text-[11px]">
              Document Overview
            </h3>
            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                <a href="#section-1" className="hover:text-[#DC2626] transition-colors">
                  1. Privacy Policy
                </a>
              </li>
              <li className="flex items-center space-x-2 pl-3">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <a href="#section-1-1" className="hover:text-[#DC2626] transition-colors">
                  1.1 Introduction
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                <a href="#contact-privacy" className="hover:text-[#DC2626] transition-colors">
                  2. Privacy Office Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Section 1 */}
          <section id="section-1" className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                1. PRIVACY POLICY
              </h2>
            </div>

            {/* Section 1.1 Introduction */}
            <div id="section-1-1" className="space-y-4">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#DC2626] text-xs font-bold">1.1</span>
                <span>Introduction</span>
              </h3>

              <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                <p>
                  RealCred Technology Private Limited (“RealCred”, “Company”, “we”, “our” or “us”) respects the privacy of its customers, visitors, business partners and other individuals who interact with our services.
                </p>

                <p>
                  This Privacy Policy explains how we collect, use, process, store and share personal information when individuals visit our website, submit enquiries or use our loan facilitation and distribution services.
                </p>

                <p>
                  RealCred operates as a corporate financial services and loan distribution company, facilitating access to loan products offered by Banks and Non-Banking Financial Companies (NBFCs).
                </p>
              </div>
            </div>
          </section>

          {/* Corporate Information Card */}
          <section id="contact-privacy" className="pt-6 border-t border-slate-100">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Details</p>
                <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                  RealCred Technology Private Limited
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Tagline: Your Loan. One Guided Route.
                </p>
              </div>

              <Link
                to="/contact"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#DC2626] text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

