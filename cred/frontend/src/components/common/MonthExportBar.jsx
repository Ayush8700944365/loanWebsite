import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';

export const MonthExportBar = ({
  onExportExcel,
  onExportPDF,
  defaultMonth = '11',
  defaultYear = '2026',
  title = 'Monthly Statement & Report Export'
}) => {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' }
  ];

  const years = ['2024', '2025', '2026', '2027'];

  const monthName = months.find((m) => m.value === selectedMonth)?.name || 'November';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs card-3d flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center space-x-2.5">
        <div className="w-9 h-9 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-500">
            Selected Period: <strong>{monthName} {selectedYear}</strong>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Month Selector */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden focus:border-[#DC2626] cursor-pointer"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden focus:border-[#DC2626] cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Download Excel */}
        <button
          onClick={() => onExportExcel && onExportExcel(selectedMonth, selectedYear, monthName)}
          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
          title="Download Excel spreadsheet for selected month"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Download Excel</span>
        </button>

        {/* Download PDF */}
        <button
          onClick={() => onExportPDF && onExportPDF(selectedMonth, selectedYear, monthName)}
          className="px-3 py-1.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-[#DC2626] text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
          title="Download PDF report for selected month"
        >
          <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Download PDF</span>
        </button>
      </div>
    </div>
  );
};

