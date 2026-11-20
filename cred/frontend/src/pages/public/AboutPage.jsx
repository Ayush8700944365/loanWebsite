import React from 'react';
import {
  ShieldCheck,
  Target,
  Eye,
  HeartHandshake,
  CheckCircle2,
  Building2,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Home,
  Building,
  Briefcase,
  Wallet,
  Zap,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage = () => {
  const coreValues = [
    {
      title: 'Customer Convenience',
      desc: 'Simplifying the borrowing experience with a single dedicated point of contact throughout the loan journey.',
      icon: Users
    },
    {
      title: 'Partner Commitment',
      desc: 'Empowering DSA channel partners with dependable operational support and faster payout releases.',
      icon: HeartHandshake
    },
    {
      title: 'Transparency',
      desc: 'Clear communication, open processes, and transparent loan terms across every banking relationship.',
      icon: Eye
    },
    {
      title: 'Operational Speed',
      desc: 'Swift application logins, prompt documentation audits, and proactive lender coordination.',
      icon: Zap
    },
    {
      title: 'Responsible Business Practices',
      desc: 'Ethical credit guidance aligned with institutional lending norms and borrower suitability.',
      icon: Scale
    },
    {
      title: 'Long-Term Relationships',
      desc: 'Building enduring trust with retail borrowers, commercial clients, and financial partners.',
      icon: Building2
    }
  ];

  const products = [
    {
      title: 'Home Loans',
      desc: 'Competitive rates and end-to-end guidance from property valuation to disbursement with leading PSU and private lenders.',
      icon: Home
    },
    {
      title: 'Loan Against Property',
      desc: 'Unlock substantial liquidity against residential or commercial assets with customized repayment tenures.',
      icon: Building
    },
    {
      title: 'Business Loans',
      desc: 'Working capital and term credit facilities designed to fuel enterprise expansion and operational agility.',
      icon: Briefcase
    },
    {
      title: 'Personal Loans',
      desc: 'Unsecured personal financing with streamlined digital documentation and expedited bank sanction approvals.',
      icon: Wallet
    }
  ];

  return (
    <div className="space-y-16 pb-20 selection:bg-[#DC2626] selection:text-white">
      {/* 1. Header Banner */}
      <section className="bg-gradient-to-b from-slate-900 via-[#142B4A] to-[#1E293B] text-white pt-16 pb-24 border-b border-slate-200/20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-red-300 bg-white/10 px-4 py-1.5 rounded-full border border-white/15">
            Corporate Profile
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            REALCRED TECHNOLOGY PRIVATE LIMITED
          </h1>
          <p className="text-lg sm:text-xl font-bold text-red-400 max-w-2xl mx-auto">
            Your Loan. One Guided Route.
          </p>
        </div>
      </section>

      {/* 2. About Us Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 text-[#DC2626] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Corporate Loan Distribution & Financial Services</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            A Single Point of Contact for Your Loan Requirements.
          </h2>

          <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            <p>
              RealCred Technology Private Limited is a corporate loan distribution and financial services company connecting customers with suitable banking and NBFC solutions.
            </p>
            <p>
              We understand that approaching multiple banks, managing documentation and coordinating loan applications can be complicated. RealCred simplifies this experience by providing customers with one dedicated point of contact.
            </p>
            <p>
              From understanding financial requirements and identifying suitable lending institutions to application processing, documentation and bank coordination, our team assists customers throughout their loan journey, up to disbursement.
            </p>
            <p>
              We also work towards building a stronger business ecosystem for our DSA and Channel Partners through dedicated support, transparent processes and faster payout commitments.
            </p>
            <p className="font-semibold text-slate-800">
              Our focus is to make loan facilitation more organised for customers and business relationships more dependable for partners.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Vision & Mission Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vision */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-4 hover:border-red-200 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Our Vision</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                A Better Way to Connect with Credit.
              </h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              To create a simpler and more accessible loan distribution experience where customers can explore suitable banking solutions through one trusted relationship, without having to independently navigate multiple institutions.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              We aspire to build a business ecosystem where customer convenience and partner growth progress together.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-4 hover:border-red-200 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Our Mission</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                We Coordinate. We Support. We Stay Connected.
              </h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Our mission is to simplify the loan application journey by understanding customer requirements, identifying suitable Banks and NBFCs and coordinating the process from application login to disbursement.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              For our DSA and Channel Partners, our commitment is to provide reliable business support, transparent payout processes and faster payout releases through clear operational commitments.
            </p>
            <p className="text-slate-700 font-semibold text-xs pt-1">
              We aim to make every loan application easier to manage and every business relationship stronger.
            </p>
          </div>

        </div>
      </section>

      {/* 4. Our Commitment (Two Distinct Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full">
            Our Stakeholder Commitment
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Our Commitment
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* For Customers */}
          <div className="p-8 rounded-3xl bg-linear-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900">For Customers</h3>
            <p className="text-slate-700 text-sm leading-relaxed font-medium">
              One dedicated relationship for loan guidance, documentation and bank coordination throughout the application journey.
            </p>
          </div>

          {/* For Channel Partners */}
          <div className="p-8 rounded-3xl bg-linear-to-br from-red-50/70 to-rose-50/40 border border-red-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] text-white flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900">For Channel Partners</h3>
            <p className="text-slate-700 text-sm leading-relaxed font-medium">
              Dependable business support, transparent communication and timely payout commitments.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Our Core Values (6 attractive icon cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Principles
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Our Core Values
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreValues.map((val) => {
            const Icon = val.icon;
            return (
              <div
                key={val.title}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-red-300 hover:shadow-md hover:-translate-y-1 transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">{val.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{val.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Our Products (4 cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full">
            Financial Offerings
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Our Products
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((prod) => {
            const Icon = prod.icon;
            return (
              <div
                key={prod.title}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-red-300 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">{prod.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{prod.desc}</p>
                </div>
                <div className="pt-4 mt-2">
                  <Link
                    to="/apply"
                    className="text-xs font-bold text-[#DC2626] hover:text-[#B91C1C] flex items-center gap-1"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Final Brand Message Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-linear-to-r from-slate-900 via-[#CF2626] to-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white space-y-4 shadow-2xl border border-black/10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black">
            REALCRED – Your Loan. One Guided Route.
          </h2>
          <p className="text-black text-xs sm:text-sm max-w-xl mx-auto ">
            Experience structured lending coordination backed by India's premier banking institutions.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/apply"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md"
            >
              Apply for Loan
            </Link>
            <Link
              to="/partner-register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
