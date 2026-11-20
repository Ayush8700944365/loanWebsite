import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BookOpen, Search, Download, Eye, FileText, CheckCircle2 } from 'lucide-react';

export const PartnerGuidesPage = () => {
  const { guides, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
          Partner Policy & Rate Matrix Library
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Confidential DSA payout grids, SBI home loan circulars and login checklists.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search rate cards and circulars..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((g) => (
          <div key={g.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
                {g.category}
              </span>
              <h3 className="font-bold text-sm text-brand-navy mt-3 mb-1">{g.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{g.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-mono">{g.fileSize} • PDF</span>
              <button
                onClick={() => showToast(`Downloading ${g.title}`, 'info')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center space-x-1 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

