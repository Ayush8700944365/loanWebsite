import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatLakhCrore, exportToExcel, exportToPDF } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MonthExportBar } from '../../components/common/MonthExportBar';
import { formatLeadUid } from '../../utils/leadIds';
import {
  Briefcase,
  PlusCircle,
  FileCheck2,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  TrendingUp,
  ArrowRight,
  Eye,
  Award,
  IndianRupee,
  Layers,
  History,
  ShieldCheck,
  Building,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const PartnerDashboardPage = () => {
  const { leads, payouts, setActiveLeadModal, showToast, apiLoading, refreshFromApi } = useApp();
  const { user } = useAuth();

  const partnerDisplayName = user?.companyName || user?.name || 'Partner';
  const partnerCode = user?.partnerCode || '';

  // Partner lead API responses are already scoped; reinforce the identity here.
  const myPartnerLeads = leads.filter(
    (lead) => Boolean(partnerCode) && lead.partnerId === partnerCode
  );

  // Exact 9 metrics required:
  // 1. Total Leads Submitted
  const totalLeadsSubmitted = myPartnerLeads.length;

  // 2. Pending Leads
  const pendingLeads = myPartnerLeads.filter((l) => ['Pending', 'New'].includes(l.currentStatus)).length;

  // 3. Leads In Process
  const inProcessLeads = myPartnerLeads.filter((l) =>
    ['In Process', 'Contacted', 'Verified', 'Follow-up'].includes(l.currentStatus)
  ).length;

  // 4. Approved Leads
  const approvedLeads = myPartnerLeads.filter((l) =>
    ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)
  ).length;

  // 5. Disbursed Leads
  const disbursedLeads = myPartnerLeads.filter((l) =>
    ['Disbursed', 'Payout Complete'].includes(l.currentStatus)
  ).length;

  // 6. Rejected Leads
  const rejectedLeads = myPartnerLeads.filter((l) =>
    ['Rejected', 'Invoice Rejected'].includes(l.currentStatus)
  ).length;

  // 7. Total Commission Earned
  const validPayouts = (payouts || []).filter((payout) => !['Rejected', 'Payout Failed'].includes(payout.status));
  const totalCommissionEarned = validPayouts.reduce((sum, payout) => sum + Number(payout.totalAmount || 0), 0);

  // 8. Pending Commission
  const pendingCommission = validPayouts
    .filter((payout) => ['Pending', 'Approved', 'Payment Initiated'].includes(payout.status))
    .reduce((sum, payout) => sum + Number(payout.totalAmount || 0), 0);

  // 9. Total Payouts Received
  const totalPayoutsReceived = validPayouts
    .filter((payout) => payout.status === 'Paid')
    .reduce((sum, payout) => sum + Number(payout.totalAmount || 0), 0);

  // Status distribution for overview
  const leadStatusData = [
    { name: 'Pending', count: pendingLeads, color: '#F59E0B' },
    { name: 'In Process', count: inProcessLeads, color: '#3B82F6' },
    { name: 'Approved', count: approvedLeads, color: '#10B981' },
    { name: 'Disbursed', count: disbursedLeads, color: '#14B8A6' },
    { name: 'Rejected', count: rejectedLeads, color: '#EF4444' }
  ].filter((d) => d.count > 0 || totalLeadsSubmitted === 0);

  const partnerTrend = Object.values(validPayouts.reduce((months, payout) => {
    const date = new Date(payout.paymentDate || payout.createdAt);
    if (Number.isNaN(date.getTime())) return months;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months[key] ||= { month: date.toLocaleDateString('en-IN', { month: 'short' }), files: 0, commission: 0, sort: date.getTime() };
    months[key].files += 1;
    months[key].commission += Number(payout.totalAmount || 0);
    return months;
  }, {})).sort((a, b) => a.sort - b.sort).slice(-12);

  // Recent Payout history items derived from invoices / settled cases
  const recentPayoutHistory = (payouts || []).slice(0, 3).map((payout) => ({
    id: payout.paymentNumber || payout._id,
    date: payout.paymentDate || payout.createdAt,
    customer: payout.customerName,
    amount: Number(payout.totalAmount || 0),
    utr: payout.utr || '',
    status: payout.status,
  }));

  const payoutForLead = (lead) => (payouts || []).find((payout) => payout.leadId === lead.leadCode || payout.leadId === lead.id);

  const getPartnerLeadsForMonth = (mStr, yStr) => {
    return myPartnerLeads.filter((lead) => {
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

  const handleMonthExportExcel = (month, year, monthName) => {
    const monthly = getPartnerLeadsForMonth(month, year);
    const dataset = monthly.length ? monthly : myPartnerLeads;
    const exportData = dataset.map((l) => ({
      'Lead ID': formatLeadUid(l.id),
      'Customer Name': l.customerName,
      'Phone': l.phone,
      'Loan Category': l.loanCategory,
      'Loan Amount (₹)': l.loanAmount,
      'Current Status': l.currentStatus,
      'Partner Payout (₹)': Number(payoutForLead(l)?.totalAmount || 0),
      'Created Date': l.createdDate || l.addedOn,
      'Month/Year': `${monthName} ${year}`
    }));

    exportToExcel(exportData, `realcred_partner_payouts_${year}_${month}.xls`);
    showToast(`Exported ${exportData.length} records for ${monthName} ${year} to Excel`, 'success');
  };

  const handleMonthExportPDF = (month, year, monthName) => {
    const monthly = getPartnerLeadsForMonth(month, year);
    const dataset = monthly.length ? monthly : myPartnerLeads;

    const pCount = dataset.filter((l) => ['Pending', 'New'].includes(l.currentStatus)).length;
    const procCount = dataset.filter((l) => ['In Process', 'Contacted', 'Verified', 'Follow-up'].includes(l.currentStatus)).length;
    const appCount = dataset.filter((l) => ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)).length;
    const disbCount = dataset.filter((l) => ['Disbursed', 'Payout Complete'].includes(l.currentStatus)).length;
    const totalPayout = dataset.reduce((sum, lead) => sum + Number(payoutForLead(lead)?.totalAmount || 0), 0);

    const summaryCards = [
      { label: 'Sourced Files', value: dataset.length },
      { label: 'Pending', value: pCount },
      { label: 'In Process', value: procCount },
      { label: 'Approved', value: appCount },
      { label: 'Disbursed', value: disbCount },
      { label: 'Total Payout', value: formatINR(totalPayout) }
    ];

    const tableHeaders = ['Lead ID', 'Customer Name', 'Phone', 'Category', 'Loan Amount (₹)', 'Status', 'Payout (₹)', 'Date'];
    const tableRows = dataset.map((l) => [
      l.id,
      l.customerName,
      l.phone,
      l.loanCategory,
      formatINR(l.loanAmount),
      l.currentStatus,
      formatINR(payoutForLead(l)?.totalAmount || 0),
      l.createdDate || l.addedOn
    ]);

    exportToPDF({
      title: `REALCRED Partner Payout Statement – ${monthName} ${year}`,
      subtitle: `Official Channel Partner Sourcing & Payout Report for ${partnerDisplayName} (Code: ${partnerCode}) • Period: ${monthName} ${year}`,
      summaryCards,
      tableHeaders,
      tableRows,
      role: 'Channel Partner (DSA)'
    });

    showToast(`PDF Statement generated for ${monthName} ${year}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0d1e33] via-[#162f4e] to-[#0d1e33] rounded-3xl p-6 sm:p-8 text-white shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-500/20 card-3d">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Channel Partner
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {partnerDisplayName}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Partner Code: <strong>{partnerCode}</strong> • Assigned Relationship Mgr:{' '}
            <strong>Relationship manager details are not available.</strong>
          </p>
        </div>

        {/* Quick action to Submit New Lead */}
        <div className="flex items-center space-x-2">
          <button type="button" onClick={refreshFromApi} disabled={apiLoading} className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold disabled:opacity-60" aria-label="Refresh dashboard data">{apiLoading ? "Refreshing..." : "Refresh data"}</button>
          <Link
            to="/partner/submit-lead"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all btn-3d"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New Lead</span>
          </Link>
        </div>
      </div>

      {/* Month-Wise Data Export Toolbar */}
      <MonthExportBar
        onExportExcel={handleMonthExportExcel}
        onExportPDF={handleMonthExportPDF}
        title="Partner Monthly Sourced Files & Payout Statement"
      />

      {/* 9 Required Partner Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        {/* 1. Total Leads Submitted */}
        <div className="card-3d card-tint-total-leads p-3.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Submitted
          </span>
          <span className="text-xl font-black text-brand-navy mt-1 block">{totalLeadsSubmitted}</span>
          <span className="text-[9px] text-blue-700 font-semibold">Total Sourced</span>
        </div>

        {/* 2. Pending Leads */}
        <div className="card-3d card-tint-pending p-3.5 rounded-2xl border border-amber-200">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Pending
          </span>
          <span className="text-xl font-black text-amber-700 mt-1 block">{pendingLeads}</span>
          <span className="text-[9px] text-amber-700 font-semibold">Awaiting Docs</span>
        </div>

        {/* 3. Leads In Process */}
        <div className="card-3d card-tint-new-leads p-3.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
            In Process
          </span>
          <span className="text-xl font-black text-sky-700 mt-1 block">{inProcessLeads}</span>
          <span className="text-[9px] text-sky-700 font-semibold">Underwriting</span>
        </div>

        {/* 4. Approved Leads */}
        <div className="card-3d card-tint-payout-completed p-3.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Approved
          </span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{approvedLeads}</span>
          <span className="text-[9px] text-emerald-700 font-semibold">Sanctions Ready</span>
        </div>

        {/* 5. Disbursed Leads */}
        <div className="card-3d card-tint-verified p-3.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
            Disbursed
          </span>
          <span className="text-xl font-black text-teal-700 mt-1 block">{disbursedLeads}</span>
          <span className="text-[9px] text-teal-700 font-semibold">Loan Released</span>
        </div>

        {/* 6. Rejected Leads */}
        <div className="card-3d card-tint-rejected p-3.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
            Rejected
          </span>
          <span className="text-xl font-black text-rose-700 mt-1 block">{rejectedLeads}</span>
          <span className="text-[9px] text-rose-700 font-semibold">Ineligible</span>
        </div>

        {/* 7. Total Payout Earned */}
        <div className="card-3d card-tint-total-leads p-3.5 rounded-2xl border border-indigo-200">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
            Total Payout
          </span>
          <span className="text-base font-black text-indigo-900 mt-1 block truncate">
            {formatINR(totalCommissionEarned)}
          </span>
          <span className="text-[9px] text-indigo-700 font-semibold">Lifetime Gross</span>
        </div>

        {/* 8. Pending Payout */}
        <div className="card-3d card-tint-pending p-3.5 rounded-2xl border border-amber-200">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Pending Payout
          </span>
          <span className="text-base font-black text-amber-900 mt-1 block truncate">
            {formatINR(pendingCommission)}
          </span>
          <span className="text-[9px] text-amber-700 font-semibold">In Clearance</span>
        </div>

        {/* 9. Total Payouts Received */}
        <div className="card-3d card-tint-payout-completed p-3.5 rounded-2xl border border-emerald-200">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Payout Settled
          </span>
          <span className="text-base font-black text-emerald-900 mt-1 block truncate">
            {formatINR(totalPayoutsReceived)}
          </span>
          <span className="text-[9px] text-emerald-700 font-semibold">Bank Credited</span>
        </div>
      </div>

      {/* Row 2: Lead Status Overview + Payout Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lead Status Overview (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Lead Status Overview</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {totalLeadsSubmitted} Files
              </span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="relative w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadStatusData.length ? leadStatusData : [{ name: 'None', count: 1, color: '#e2e8f0' }]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {(leadStatusData.length ? leadStatusData : [{ color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-brand-navy">{totalLeadsSubmitted}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                </div>
              </div>

              <div className="space-y-2 flex-1 pl-4">
                {[
                  { label: 'Pending', count: pendingLeads, color: 'bg-amber-500' },
                  { label: 'In Process', count: inProcessLeads, color: 'bg-blue-600' },
                  { label: 'Approved', count: approvedLeads, color: 'bg-emerald-600' },
                  { label: 'Disbursed', count: disbursedLeads, color: 'bg-teal-600' },
                  { label: 'Rejected', count: rejectedLeads, color: 'bg-rose-500' }
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="font-semibold text-slate-700">{s.label}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Lead status overview</span>
            <Link to="/partner/leads" className="text-brand-royal font-bold hover:underline">
              View All Files →
            </Link>
          </div>
        </div>

        {/* Payout Summary (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Payout Summary & Sourcing Growth</h3>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Admin-configured rules
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Sourced</span>
                <p className="text-base font-extrabold text-brand-navy mt-0.5">{formatINR(totalCommissionEarned)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid Out</span>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5">{formatINR(totalPayoutsReceived)}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Pipeline Value</span>
                <p className="text-base font-extrabold text-amber-700 mt-0.5">{formatINR(pendingCommission)}</p>
              </div>
            </div>

            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={partnerTrend}>
                  <defs>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val) => [`₹${val}`, 'Payout']}
                    contentStyle={{ backgroundColor: '#142B4A', color: '#fff', borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#commGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Next settlement cycle: 15th of this month</span>
            <Link to="/partner/commission" className="text-amber-700 font-bold hover:underline">
              Detailed Ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Submitted Leads & Recent Payout History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Submitted Leads (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-brand-navy text-base">Recent Submitted Leads</h3>
              <p className="text-xs text-slate-500">Live tracker of customer files logged under your DSA code</p>
            </div>
            <Link to="/partner/leads" className="text-xs font-bold text-brand-royal hover:underline">
              View All ({myPartnerLeads.length}) →
            </Link>
          </div>

          <div className="space-y-3 pt-3">
            {myPartnerLeads.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No customer leads logged yet. Click 'Submit New Lead' to register your first file.
              </div>
            ) : (
              myPartnerLeads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setActiveLeadModal && setActiveLeadModal(lead)}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-brand-navy">{lead.customerName}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {lead.loanCategory} • {formatINR(lead.loanAmount)}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Sourced: {lead.createdDate || lead.addedOn}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={lead.currentStatus} size="sm" />
                    <span className="text-[10px] font-bold text-purple-700 block mt-1">
                      Payout: {payoutForLead(lead) ? formatINR(payoutForLead(lead).totalAmount) : 'Not created'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payout History (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Recent Payout History</h3>
              </div>
              <Link to="/partner/payouts" className="text-xs text-emerald-700 font-bold hover:underline">
                Full Ledger →
              </Link>
            </div>

            <div className="space-y-3 pt-3">
              {recentPayoutHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{item.customer}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {item.id} • UTR: {item.utr}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-700 text-sm block">
                      {formatINR(item.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/partner/submit-lead"
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all mt-4 shadow-xs btn-3d"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Submit Another Customer File</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
