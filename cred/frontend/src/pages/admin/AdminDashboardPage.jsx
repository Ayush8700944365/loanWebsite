import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR, formatLakhCrore, exportToCSV, exportToExcel, exportToPDF } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MonthExportBar } from '../../components/common/MonthExportBar';
import { formatLeadUid } from '../../utils/leadIds';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Users,
  FileText,
  CheckCircle2,
  IndianRupee,
  Plus,
  Phone,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Download,
  Trash2,
  Columns,
  X,
  Filter,
  Layers,
  ShieldCheck,
  Check,
  AlertCircle,
  Edit3,
  Building,
  KeyRound,
  FileSpreadsheet,
  Settings2,
  ChevronDown
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const {
    leads,
    applications,
    activities,
    setActiveLeadModal,
    updateLeadStatus,
    addApplication,
    deleteApplication,
    showToast,
    apiLoading,
    apiError,
    refreshFromApi
  } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  // A. Date Filter State: "This Month" vs "Last 15 Days"
  const [dateFilter, setDateFilter] = useState('THIS_MONTH'); // 'THIS_MONTH' | 'LAST_15_DAYS'

  // Application Management: Modal & Dynamic Column states
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showManageColsModal, setShowManageColsModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  // Default & dynamic columns for the Applications table
  const defaultAppColumns = [
    { key: 'id', label: 'App ID', isCustom: false },
    { key: 'customerName', label: 'Customer Name', isCustom: false },
    { key: 'loanType', label: 'Loan Category', isCustom: false },
    { key: 'bankName', label: 'Lending Bank', isCustom: false },
    { key: 'requestedAmount', label: 'Requested (₹)', isCustom: false },
    { key: 'sanctionedAmount', label: 'Sanctioned (₹)', isCustom: false },
    { key: 'roi', label: 'ROI / LTV', isCustom: false },
    { key: 'status', label: 'Status', isCustom: false }
  ];

  const [configuredColumns, setConfiguredColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('realcred_admin_app_columns');
      return saved ? JSON.parse(saved) : defaultAppColumns;
    } catch {
      return defaultAppColumns;
    }
  });

  // New Application Form State
  const [newAppForm, setNewAppForm] = useState({
    customerName: '',
    phone: '',
    loanType: 'Home Loan',
    bankName: '',
    requestedAmount: '',
    status: 'In Process',
    customFields: {}
  });

  // Filter leads based on selected date filter
  const filteredLeads = useMemo(() => {
    if (!leads || !leads.length) return [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return leads.filter((lead) => {
      const itemDate = lead.createdAt ? new Date(lead.createdAt) : null;
      if (!itemDate || Number.isNaN(itemDate.getTime()) || itemDate > now) return false;
      const cutoff = dateFilter === 'LAST_15_DAYS'
        ? new Date(now.getTime() - 15 * 86400000)
        : monthStart;
      return itemDate >= cutoff;
    });
  }, [leads, dateFilter]);

  // Filter applications based on selected date filter
  const filteredApplications = useMemo(() => {
    if (!applications || !applications.length) return [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return applications.filter((app) => {
      const itemDate = app.createdAt || app.submissionDate ? new Date(app.createdAt || app.submissionDate) : null;
      if (!itemDate || Number.isNaN(itemDate.getTime()) || itemDate > now) return false;
      const cutoff = dateFilter === 'LAST_15_DAYS'
        ? new Date(now.getTime() - 15 * 86400000)
        : monthStart;
      return itemDate >= cutoff;
    });
  }, [applications, dateFilter]);

  // B. Lead Statistics for Required 5 Statuses:
  // 1. Pending
  // 2. In Process
  // 3. Approved
  // 4. Disbursed
  // 5. Rejected
  const pendingLeadsCount = filteredLeads.filter((l) =>
    ['Pending', 'New'].includes(l.currentStatus)
  ).length;

  const inProcessLeadsCount = filteredLeads.filter((l) =>
    ['In Process', 'Contacted', 'Verified', 'Follow-up', 'Interested'].includes(l.currentStatus)
  ).length;

  const approvedLeadsCount = filteredLeads.filter((l) =>
    ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)
  ).length;

  const disbursedLeadsCount = filteredLeads.filter((l) =>
    ['Disbursed', 'Payout Complete'].includes(l.currentStatus)
  ).length;

  const rejectedLeadsCount = filteredLeads.filter((l) =>
    ['Rejected', 'Invoice Rejected'].includes(l.currentStatus)
  ).length;

  const totalFilteredLeads = filteredLeads.length;

  // Status distribution chart data
  const statusChartData = [
    { name: 'Pending', count: pendingLeadsCount, color: '#F59E0B' },
    { name: 'In Process', count: inProcessLeadsCount, color: '#3B82F6' },
    { name: 'Approved', count: approvedLeadsCount, color: '#10B981' },
    { name: 'Disbursed', count: disbursedLeadsCount, color: '#14B8A6' },
    { name: 'Rejected', count: rejectedLeadsCount, color: '#EF4444' }
  ];

  // Calculation of total disbursed value from disbursed leads
  const totalDisbursedAmount = filteredLeads
    .filter((l) => ['Disbursed', 'Payout Complete'].includes(l.currentStatus))
    .reduce((sum, l) => sum + (l.loanPayoutAmount || l.loanAmount || 0), 0);

  // F. CSV and Excel Export Handlers respecting selected date filter
  const handleExportCSV = () => {
    const exportData = filteredLeads.map((l) => ({
      'Lead ID': formatLeadUid(l.id),
      'Customer Name': l.customerName,
      'Phone': l.phone,
      'Email': l.email,
      'Loan Category': l.loanCategory,
      'Loan Amount (₹)': l.loanAmount,
      'Current Status': l.currentStatus,
      'Assigned Officer': l.assignedEmployee || 'Unassigned',
      'Partner (DSA)': l.partnerName || 'Direct',
      'Created Date': l.createdDate || l.addedOn,
      'Date Filter Range': dateFilter === 'THIS_MONTH' ? 'This Month' : 'Last 15 Days'
    }));

    exportToCSV(exportData, `realcred_leads_${dateFilter.toLowerCase()}_${Date.now()}.csv`);
    showToast(`Exported ${exportData.length} records to CSV (${dateFilter === 'THIS_MONTH' ? 'This Month' : 'Last 15 Days'})`, 'success');
  };

  const handleExportExcel = () => {
    const exportData = filteredLeads.map((l) => ({
      'Lead ID': formatLeadUid(l.id),
      'Customer Name': l.customerName,
      'Phone': l.phone,
      'Email': l.email,
      'Loan Category': l.loanCategory,
      'Loan Amount (₹)': l.loanAmount,
      'Current Status': l.currentStatus,
      'Assigned Officer': l.assignedEmployee || 'Unassigned',
      'Partner (DSA)': l.partnerName || 'Direct',
      'Created Date': l.createdDate || l.addedOn,
      'Date Filter Range': dateFilter === 'THIS_MONTH' ? 'This Month' : 'Last 15 Days'
    }));

    exportToExcel(exportData, `realcred_leads_${dateFilter.toLowerCase()}_${Date.now()}.xls`);
    showToast(`Exported ${exportData.length} records to Excel (${dateFilter === 'THIS_MONTH' ? 'This Month' : 'Last 15 Days'})`, 'success');
  };

  // Month-Wise Data Filter Helper
  const getLeadsForMonth = (mStr, yStr) => {
    return leads.filter((lead) => {
      const dStr = lead.createdDate || lead.submissionDate || '';
      if (dStr.includes('-')) {
        const parts = dStr.split('-');
        if (parts.length >= 2) {
          return parts[0] === yStr && parts[1] === mStr;
        }
      }
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const y = String(d.getFullYear());
        return m === mStr && y === yStr;
      }
      return false;
    });
  };

  // Month-Wise Excel Export
  const handleMonthExportExcel = (month, year, monthName) => {
    const monthlyLeads = getLeadsForMonth(month, year);
    const dataset = monthlyLeads.length ? monthlyLeads : filteredLeads;
    const exportData = dataset.map((l) => ({
      'Lead ID': formatLeadUid(l.id),
      'Customer Name': l.customerName,
      'Phone': l.phone,
      'Email': l.email || 'N/A',
      'Loan Category': l.loanCategory,
      'Lead / Bank Type': l.leadType || 'SBI',
      'Loan Amount (₹)': l.loanAmount,
      'Current Status': l.currentStatus,
      'Assigned Officer': l.assignedEmployee || 'Unassigned',
      'Source / Partner': l.partnerName || l.source || 'Direct',
      'Created Date': l.createdDate || l.addedOn,
      'Statement Period': `${monthName} ${year}`
    }));

    exportToExcel(exportData, `realcred_admin_leads_${year}_${month}.xls`);
    showToast(`Exported ${exportData.length} leads for ${monthName} ${year} to Excel`, 'success');
  };

  // Month-Wise PDF Export
  const handleMonthExportPDF = (month, year, monthName) => {
    const monthlyLeads = getLeadsForMonth(month, year);
    const dataset = monthlyLeads.length ? monthlyLeads : filteredLeads;

    const pCount = dataset.filter((l) => ['Pending', 'New'].includes(l.currentStatus)).length;
    const procCount = dataset.filter((l) => ['In Process', 'Contacted', 'Verified', 'Follow-up', 'Interested'].includes(l.currentStatus)).length;
    const appCount = dataset.filter((l) => ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)).length;
    const disbCount = dataset.filter((l) => ['Disbursed', 'Payout Complete'].includes(l.currentStatus)).length;
    const rejCount = dataset.filter((l) => ['Rejected', 'Invoice Rejected'].includes(l.currentStatus)).length;
    const totalVolume = dataset.reduce((s, l) => s + (l.loanAmount || 0), 0);

    const summaryCards = [
      { label: 'Total Cases', value: dataset.length },
      { label: 'Pending', value: pCount },
      { label: 'In Process', value: procCount },
      { label: 'Approved', value: appCount },
      { label: 'Disbursed', value: disbCount },
      { label: 'Rejected', value: rejCount },
      { label: 'Total Volume', value: formatLakhCrore(totalVolume) }
    ];

    const tableHeaders = ['Lead ID', 'Customer Name', 'Phone', 'Category', 'Bank', 'Amount (₹)', 'Status', 'Officer', 'Source', 'Date'];
    const tableRows = dataset.map((l) => [
      l.id,
      l.customerName,
      l.phone,
      l.loanCategory,
      l.leadType || 'SBI',
      formatINR(l.loanAmount),
      l.currentStatus,
      l.assignedEmployee || 'Unassigned',
      l.partnerName || l.source || 'Direct',
      l.createdDate || l.addedOn
    ]);

    exportToPDF({
      title: `REALCRED Admin Portfolio Report – ${monthName} ${year}`,
      subtitle: `Official Underwriting & Sourcing Statement for Period: ${monthName} ${year} • Generated by Admin Desk`,
      summaryCards,
      tableHeaders,
      tableRows,
      role: 'Executive Administrator'
    });

    showToast(`PDF Statement generated for ${monthName} ${year}`, 'success');
  };

  // Add Dynamic Column to Application table
  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const key = newColName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (configuredColumns.some((c) => c.key === key)) {
      showToast('Column already exists', 'error');
      return;
    }
    const updated = [...configuredColumns, { key, label: newColName.trim(), isCustom: true }];
    setConfiguredColumns(updated);
    localStorage.setItem('realcred_admin_app_columns', JSON.stringify(updated));
    setNewColName('');
    showToast(`Added column "${newColName.trim()}"`, 'success');
  };

  // Remove Dynamic Column
  const handleRemoveColumn = (keyToRemove) => {
    const updated = configuredColumns.filter((c) => c.key !== keyToRemove);
    setConfiguredColumns(updated);
    localStorage.setItem('realcred_admin_app_columns', JSON.stringify(updated));
    showToast('Column removed from table view', 'info');
  };

  // Handle Create Application
  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!newAppForm.customerName) {
      showToast('Customer name is required', 'error');
      return;
    }
    try { await addApplication(newAppForm); setShowAddAppModal(false); }
    catch { return; }
    setNewAppForm({
      customerName: '',
      phone: '',
      loanType: 'Home Loan',
      bankName: '',
      requestedAmount: '',
      status: 'In Process',
      customFields: {}
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header with Title, Date Filters and CSV/Excel Exports */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs card-3d">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                Executive Control Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Admin Loan Management Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live oversight of loan sourcing, lead underwriting statuses, applications pipeline, and disbursements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={refreshFromApi} disabled={apiLoading} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60" aria-label="Refresh dashboard data">{apiLoading ? "Refreshing..." : "Refresh data"}</button>
            {/* A. Date Filters: This Month vs Last 15 Days */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'THIS_MONTH'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('LAST_15_DAYS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'LAST_15_DAYS'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 15 Days
              </button>
            </div>

            {/* F. Export CSV & Excel Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
                title="Export filtered records as CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
                title="Export filtered records as Microsoft Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* API Warning banner if API disconnected */}
        {apiError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 font-medium">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={refreshFromApi}
              disabled={apiLoading}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              {apiLoading ? 'Retrying...' : 'Retry Connection'}
            </button>
          </div>
        )}
      </div>

      {/* Month-Wise Data Export Toolbar */}
      <MonthExportBar
        onExportExcel={handleMonthExportExcel}
        onExportPDF={handleMonthExportPDF}
        title="Admin Monthly Portfolio & Underwriting Export"
      />

      {/* B. Summary Cards: Exact 5 Required Statuses */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Lead Status Breakdown • {dateFilter === 'THIS_MONTH' ? 'This Month' : 'Last 15 Days'}
          </h2>
          <span className="text-xs font-bold text-slate-600">
            Total Sourced: <strong className="text-slate-900">{totalFilteredLeads} Leads</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Pending */}
          <div className="card-3d card-tint-pending p-4 rounded-2xl border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Pending Leads
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                {pendingLeadsCount}
              </span>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                {totalFilteredLeads ? Math.round((pendingLeadsCount / totalFilteredLeads) * 100) : 0}% of pipeline
              </p>
            </div>
          </div>

          {/* 2. In Process */}
          <div className="card-3d card-tint-new-leads p-4 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                In Process
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                {inProcessLeadsCount}
              </span>
              <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                {totalFilteredLeads ? Math.round((inProcessLeadsCount / totalFilteredLeads) * 100) : 0}% active review
              </p>
            </div>
          </div>

          {/* 3. Approved */}
          <div className="card-3d card-tint-payout-completed p-4 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Approved
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {approvedLeadsCount}
              </span>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                {totalFilteredLeads ? Math.round((approvedLeadsCount / totalFilteredLeads) * 100) : 0}% sanction ready
              </p>
            </div>
          </div>

          {/* 4. Disbursed */}
          <div className="card-3d card-tint-verified p-4 rounded-2xl border border-teal-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                Disbursed
              </span>
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-teal-600 tracking-tight">
                {disbursedLeadsCount}
              </span>
              <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                {totalDisbursedAmount > 0 ? formatLakhCrore(totalDisbursedAmount) : 'Released by Bank'}
              </p>
            </div>
          </div>

          {/* 5. Rejected */}
          <div className="card-3d card-tint-rejected p-4 rounded-2xl border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                Rejected
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {rejectedLeadsCount}
              </span>
              <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                {totalFilteredLeads ? Math.round((rejectedLeadsCount / totalFilteredLeads) * 100) : 0}% declined
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Status Distribution Chart & Lead Management Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#DC2626]" />
                <h2 className="text-sm font-extrabold text-slate-900">Status Distribution Overview</h2>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {dateFilter === 'THIS_MONTH' ? 'Month to Date' : '15-Day Window'}
              </span>
            </div>

            <div className="h-60 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                    formatter={(val) => [`${val} Leads`, 'Volume']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Disbursement Velocity: <strong>High</strong></span>
            <Link to="/admin/reports" className="text-blue-600 font-bold hover:underline">
              Analytics Ledger →
            </Link>
          </div>
        </div>

        {/* C. Lead Management & Live Status Updates (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Lead Management & Status Tracking</h2>
              <p className="text-[11px] text-slate-500">Update customer lead stages live across loan lifecycle</p>
            </div>
            <Link
              to="/admin/leads"
              className="text-xs font-bold text-[#DC2626] hover:text-[#B91C1C] flex items-center gap-1"
            >
              <span>Manage All ({filteredLeads.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Lead Case</th>
                  <th className="py-2.5 px-3">Loan Amount</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{lead.customerName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{lead.phone}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {formatINR(lead.loanAmount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {lead.loanCategory}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={lead.currentStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {/* Live status updater dropdown preserving existing updateLeadStatus function */}
                      <select
                        value={lead.currentStatus}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-hidden focus:border-[#DC2626] cursor-pointer"
                      >
                        <option value="New">Pending (New)</option>
                        <option value="Contacted">In Process (Contacted)</option>
                        <option value="Verified">In Process (Verified)</option>
                        <option value="Approved">Approved</option>
                        <option value="Disbursed">Disbursed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* D. Application Management Section (Redesigned & Dynamic Columns) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 card-3d">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#DC2626]" />
              <h2 className="text-base font-extrabold text-slate-900">Application Management Pipeline</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurable applications table with dynamic column creation, removal, and rapid application intake.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Manage Columns Button */}
            <button
              onClick={() => setShowManageColsModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5 text-slate-500" />
              <span>Customize Columns</span>
            </button>

            {/* Add Application Button */}
            <button
              onClick={() => setShowAddAppModal(true)}
              className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md shadow-red-200 flex items-center space-x-1.5 transition-all btn-3d cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Application</span>
            </button>
          </div>
        </div>

        {/* Dynamic Applications Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                {configuredColumns.map((col) => (
                  <th key={col.key} className="py-3 px-3.5">
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      {col.isCustom && (
                        <button
                          onClick={() => handleRemoveColumn(col.key)}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                          title="Remove column from table"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={configuredColumns.length + 1} className="py-8 text-center text-slate-400 text-xs">
                    No applications available in this date range. Click 'Add Application' to register a new one.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    {configuredColumns.map((col) => {
                      if (col.key === 'id') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 font-mono font-bold text-slate-900">
                            {app.id}
                          </td>
                        );
                      }
                      if (col.key === 'customerName') {
                        return (
                          <td key={col.key} className="py-3 px-3.5">
                            <span className="font-bold text-slate-900">{app.customerName}</span>
                            {app.phone && <span className="block text-[10px] text-slate-400">{app.phone}</span>}
                          </td>
                        );
                      }
                      if (col.key === 'loanType') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 text-slate-700 font-medium">
                            {app.loanType}
                          </td>
                        );
                      }
                      if (col.key === 'bankName') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 text-slate-600">
                            {app.bankName}
                          </td>
                        );
                      }
                      if (col.key === 'requestedAmount') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 font-bold text-slate-900">
                            {formatINR(app.requestedAmount)}
                          </td>
                        );
                      }
                      if (col.key === 'sanctionedAmount') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 font-bold text-emerald-700">
                            {formatINR(app.sanctionedAmount || app.requestedAmount)}
                          </td>
                        );
                      }
                      if (col.key === 'roi') {
                        return (
                          <td key={col.key} className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                            {app.roi ? `${app.roi}%` : 'ROI not recorded'} {app.ltv ? `(${app.ltv}% LTV)` : ''}
                          </td>
                        );
                      }
                      if (col.key === 'status') {
                        return (
                          <td key={col.key} className="py-3 px-3.5">
                            <StatusBadge status={app.status || 'In Process'} size="sm" />
                          </td>
                        );
                      }
                      // Custom dynamic column rendering
                      return (
                        <td key={col.key} className="py-3 px-3.5 text-slate-600">
                          {app[col.key] || app.customFields?.[col.key] || '—'}
                        </td>
                      );
                    })}

                    {/* Row Deletion Action */}
                    <td key="actions" className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => deleteApplication(app.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Application"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Application Modal */}
      {showAddAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#DC2626]" />
                <span>Log New Loan Application</span>
              </h3>
              <button
                onClick={() => setShowAddAppModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newAppForm.customerName}
                  onChange={(e) => setNewAppForm({ ...newAppForm, customerName: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newAppForm.phone}
                    onChange={(e) => setNewAppForm({ ...newAppForm, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loan Category</label>
                  <select
                    value={newAppForm.loanType}
                    onChange={(e) => setNewAppForm({ ...newAppForm, loanType: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  >
                    <option value="Home Loan">Home Loan</option>
                    <option value="Balance Transfer">Balance Transfer</option>
                    <option value="Plot Loan">Plot Loan</option>
                    <option value="Top-Up Loan">Top-Up Loan</option>
                    <option value="Loan Against Property">Loan Against Property</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Requested Amount (₹)</label>
                  <input
                    type="number"
                    value={newAppForm.requestedAmount}
                    onChange={(e) =>
                      setNewAppForm({
                        ...newAppForm,
                        requestedAmount: Number(e.target.value),
                        sanctionedAmount: Number(e.target.value)
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-bold bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lending Bank</label>
                  <input
                    type="text"
                    value={newAppForm.bankName}
                    onChange={(e) => setNewAppForm({ ...newAppForm, bankName: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Interest Rate / ROI</label>
                  <input
                    type="text"
                    value={newAppForm.roi}
                    onChange={(e) => setNewAppForm({ ...newAppForm, roi: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={newAppForm.status}
                    onChange={(e) => setNewAppForm({ ...newAppForm, status: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                  >
                    <option value="In Process">In Process</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs for Configured Custom Fields */}
              {configuredColumns.filter((c) => c.isCustom).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Custom Configured Columns
                  </span>
                  {configuredColumns
                    .filter((c) => c.isCustom)
                    .map((col) => (
                      <div key={col.key}>
                        <label className="font-bold text-slate-700 block mb-1">{col.label}</label>
                        <input
                          type="text"
                          placeholder={`Enter ${col.label}...`}
                          value={newAppForm.customFields[col.key] || ''}
                          onChange={(e) =>
                            setNewAppForm({
                              ...newAppForm,
                              customFields: {
                                ...newAppForm.customFields,
                                [col.key]: e.target.value
                              }
                            })
                          }
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
                        />
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddAppModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customize Columns Modal */}
      {showManageColsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Columns className="w-4 h-4 text-slate-700" />
                <span>Configure Table Columns</span>
              </h3>
              <button
                onClick={() => setShowManageColsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Add new custom columns or remove user-added fields from the Application table.
            </p>

            {/* Add Column Form */}
            <form onSubmit={handleAddColumn} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Column name (e.g. Branch Code)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#DC2626]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Add Field
              </button>
            </form>

            {/* Active Columns List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Table Columns ({configuredColumns.length})
              </span>
              {configuredColumns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{col.label}</span>
                  {col.isCustom ? (
                    <button
                      onClick={() => handleRemoveColumn(col.key)}
                      className="text-rose-600 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">System Field</span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setShowManageColsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
