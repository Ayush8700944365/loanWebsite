import React, { useEffect, useState } from 'react';
import { publicLoanCategoriesApi, websiteContentApi } from '../../services/api';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Home,
  Briefcase,
  Car,
  Building,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const iconMap = {
  Wallet,
  Home,
  Briefcase,
  Car,
  Building,
  GraduationCap
};

export const ServicesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    publicLoanCategoriesApi.getAll()
      .then((response) => { if (active) setCategories(response.categories || []); })
      .catch((error) => { if (active) setLoadError(error.message || "Loan categories could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <div className="space-y-16 pb-20">
      
      {/* Header */}
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-16 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-royal bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
            Comprehensive Credit Portfolio
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Our Loan Services & Categories
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Review the loan categories and details currently published by the RealCred team.
          </p>
        </div>
      </section>

      {/* Loan Details List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {loading && <p role="status" className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-600">Loading published loan categories…</p>}
        {!loading && loadError && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">{loadError}</div>}
        {!loading && !loadError && categories.length === 0 && <p role="status" className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-600">No loan categories are currently published.</p>}
        {!loadError && categories.map((cat, idx) => {
          const Icon = iconMap[cat.icon] || Home;
          const isReversed = idx % 2 === 1;
          const benefits = (cat.benefits || []).filter((benefit) => String(benefit || "").trim());
          const requirements = (cat.documentRequirements || []).filter((requirement) => String(requirement.documentType || "").trim());
          const parameters = [
            ["Interest rate", cat.minInterest],
            ["Maximum tenure", cat.maxTenure],
            ["Maximum facility", cat.maxAmount],
            ["Processing time", cat.processingTime],
          ].filter(([, value]) => String(value || "").trim());

          return (
            <div
              key={cat._id || cat.slug}
              id={cat.slug}
              className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-premium scroll-mt-24"
            >
              <div className={`grid grid-cols-1 ${parameters.length > 0 ? "lg:grid-cols-12" : ""} gap-8 lg:gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}>
                
                {/* Info Column (7 Cols) */}
                <div className={parameters.length > 0 ? "lg:col-span-7 space-y-5" : "space-y-5"}>
                  {cat.imageStorageKey && <img src={websiteContentApi.assetUrl(cat.imageStorageKey)} alt={`${cat.name} category`} loading="lazy" className="w-full max-h-56 rounded-2xl border border-slate-200 object-cover" />}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-royal/10 text-brand-royal flex items-center justify-center font-bold">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">{cat.name}</h2>
                      {cat.tagline && <span className="text-xs font-semibold text-brand-royal">{cat.tagline}</span>}
                    </div>
                  </div>

                  {cat.description && <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{cat.description}</p>}

                  {benefits.length > 0 && <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Key Benefits</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      {benefits.map((b, i) => (
                        <div key={i} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>}

                  {cat.eligibility && <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block mb-0.5">Eligibility Criteria:</span>
                    <span className="text-slate-600">{cat.eligibility}</span>
                  </div>}

                  {requirements.length > 0 && <section className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configured document requirements</h3>
                    <ul className="grid gap-2 sm:grid-cols-2 text-xs text-slate-700">{requirements.map((requirement) => <li key={`${requirement.documentType}-${(requirement.employmentTypes || []).join("-")}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="font-semibold">{requirement.documentType}</span>{requirement.employmentTypes?.length > 0 && <span className="mt-1 block text-slate-500">For: {requirement.employmentTypes.join(", ")}</span>}</li>)}</ul>
                  </section>}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      to={`/apply?category=${encodeURIComponent(cat.name)}`}
                      className="px-6 py-3 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2"
                    >
                      <span>Apply for {cat.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/emi-calculator"
                      className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                    >
                      Calculate EMI
                    </Link>
                  </div>
                </div>

                {/* Metrics Highlight Box (5 Cols) */}
                {parameters.length > 0 && <div className="lg:col-span-5 bg-gradient-to-br from-brand-navy to-[#18365B] rounded-2xl p-6 sm:p-8 text-white space-y-5 border border-white/10 shadow-lg">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal block">
                    Product Parameters
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parameters.map(([label, value]) => <div key={label} className="p-3.5 rounded-xl bg-white/5 border border-white/10"><span className="text-[10px] text-blue-200 uppercase font-semibold block">{label}</span><span className="mt-1 block text-base font-extrabold text-white">{value}</span></div>)}
                  </div>
                </div>}

              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
};
