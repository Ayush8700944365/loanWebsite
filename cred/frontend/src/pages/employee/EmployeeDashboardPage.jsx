import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatLakhCrore, exportToExcel, exportToPDF } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MonthExportBar } from '../../components/common/MonthExportBar';
import { formatLeadUid } from '../../utils/leadIds';
import {
  FileCheck2,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Phone,
  UserCheck,
  Calendar,
  ArrowRight,
  Eye,
  AlertCircle,
  Clock3,
  Layers,
  Sparkles,
  PhoneCall,
  Check,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export const EmployeeDashboardPage = () => {
  const { leads, followUps, activities, setActiveLeadModal, showToast, apiLoading, refreshFromApi } = useApp();
  const { user } = useAuth();

  const officerName = user?.name || 'Employee';
  const officerRole = user?.designation || user?.role || 'Employee';

  // The API already scopes employee leads; keep the dashboard scoped as well.
  const myLeads = leads.filter(
    (l) =>
      l.assignedEmployeeId === user?.employeeCode ||
      l.assignedEmployeeId === user?.id
  );

  // Status metrics according to specifications:
  // Pending, In Process, Approved, Disbursed, Rejected
  const totalAssigned = myLeads.length;
  const pendingLeads = myLeads.filter((l) => ['Pending', 'New'].includes(l.currentStatus)).length;
  const inProcessLeads = myLeads.filter((l) =>
    ['In Process', 'Contacted', 'Follow-up', 'Interested', 'Verified'].includes(l.currentStatus)
  ).length;
  const approvedLeads = myLeads.filter((l) =>
    ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)
  ).length;
  const disbursedLeads = myLeads.filter((l) =>
    ['Disbursed', 'Payout Complete'].includes(l.currentStatus)
  ).length;
  const rejectedLeads = myLeads.filter((l) =>
    ['Rejected', 'Invoice Rejected'].includes(l.currentStatus)
  ).length;

  // Follow-up metrics
  const todayStr = new Date().toLocaleDateString('en-CA');
  const followupsDueToday = followUps.filter(
    (f) => f.reminderStatus === 'Scheduled' && f.followUpDate === todayStr
  );
  const upcomingFollowups = followUps.filter((f) => f.reminderStatus === 'Scheduled');

  // Distribution chart data
  const statusDistributionData = [
    { name: 'Pending', count: pendingLeads, color: '#F59E0B' },
    { name: 'In Process', count: inProcessLeads, color: '#3B82F6' },
    { name: 'Approved', count: approvedLeads, color: '#10B981' },
    { name: 'Disbursed', count: disbursedLeads, color: '#14B8A6' },
    { name: 'Rejected', count: rejectedLeads, color: '#EF4444' }
  ].filter((item) => item.count > 0 || totalAssigned === 0);

  // Filter recent activities relevant to loans/leads
  const officerActivities = (activities || []).slice(0, 5);

  const getOfficerLeadsForMonth = (mStr, yStr) => {
    return myLeads.filter((lead) => {
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
    const monthly = getOfficerLeadsForMonth(month, year);
    const dataset = monthly.length ? monthly : myLeads;
    const exportData = dataset.map((l) => ({
      'Lead ID': formatLeadUid(l.id),
      'Customer Name': l.customerName,
      'Phone': l.phone,
      'Loan Category': l.loanCategory,
      'Lead Type': l.leadType || 'SBI',
      'Loan Amount (₹)': l.loanAmount,
      'Current Status': l.currentStatus,
      'Partner / Sourcing': l.partnerName || l.source || 'Direct',
      'Created Date': l.createdDate || l.addedOn,
      'Reporting Period': `${monthName} ${year}`
    }));

    exportToExcel(exportData, `realcred_officer_leads_${year}_${month}.xls`);
    showToast(`Exported ${exportData.length} records for ${monthName} ${year} to Excel`, 'success');
  };

  const handleMonthExportPDF = (month, year, monthName) => {
    const monthly = getOfficerLeadsForMonth(month, year);
    const dataset = monthly.length ? monthly : myLeads;

    const pCount = dataset.filter((l) => ['Pending', 'New'].includes(l.currentStatus)).length;
    const procCount = dataset.filter((l) => ['In Process', 'Contacted', 'Verified', 'Follow-up'].includes(l.currentStatus)).length;
    const appCount = dataset.filter((l) => ['Approved', 'Sanctioned', 'Invoice Generated'].includes(l.currentStatus)).length;
    const disbCount = dataset.filter((l) => ['Disbursed', 'Payout Complete'].includes(l.currentStatus)).length;
    const rejCount = dataset.filter((l) => ['Rejected', 'Invoice Rejected'].includes(l.currentStatus)).length;
    const totalVolume = dataset.reduce((s, l) => s + (l.loanAmount || 0), 0);

    const summaryCards = [
      { label: 'Assigned Cases', value: dataset.length },
      { label: 'Pending', value: pCount },
      { label: 'In Process', value: procCount },
      { label: 'Approved', value: appCount },
      { label: 'Disbursed', value: disbCount },
      { label: 'Rejected', value: rejCount },
      { label: 'Total Volume', value: formatLakhCrore(totalVolume) }
    ];

    const tableHeaders = ['Lead ID', 'Customer Name', 'Phone', 'Category', 'Bank Type', 'Loan Amount (₹)', 'Status', 'Date'];
    const tableRows = dataset.map((l) => [
      l.id,
      l.customerName,
      l.phone,
      l.loanCategory,
      l.leadType || 'SBI',
      formatINR(l.loanAmount),
      l.currentStatus,
      l.createdDate || l.addedOn
    ]);

    exportToPDF({
      title: `REALCRED Officer Portfolio Report – ${monthName} ${year}`,
      subtitle: `Official Loan Underwriting & Desk Pipeline for ${officerName} • Period: ${monthName} ${year}`,
      summaryCards,
      tableHeaders,
      tableRows,
      role: 'Loan Underwriting Officer'
    });

    showToast(`PDF Statement generated for ${monthName} ${year}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Officer Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-navy rounded-3xl p-6 sm:p-8 text-white shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4 card-3d">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              On Duty • RealCred Sourcing Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Welcome back, {officerName}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {officerRole} • You have <strong>{followupsDueToday.length} follow-ups due today</strong> and{' '}
            <strong>{totalAssigned} assigned leads</strong> in your queue.
          </p>
        </div>

        {/* Quick Access to My Leads & Follow-ups */}
        <div className="flex items-center space-x-2.5">
          <button type="button" onClick={refreshFromApi} disabled={apiLoading} className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold disabled:opacity-60" aria-label="Refresh dashboard data">{apiLoading ? "Refreshing..." : "Refresh data"}</button>
          <Link
            to="/employee/leads"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all btn-3d flex items-center space-x-1.5"
          >
            <FileCheck2 className="w-4 h-4 text-sky-400" />
            <span>My Leads ({totalAssigned})</span>
          </Link>
          <Link
            to="/employee/followups"
            className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md shadow-red-900/40 transition-all btn-3d flex items-center space-x-1.5"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Follow-ups ({upcomingFollowups.length})</span>
          </Link>
        </div>
      </div>

      {/* Month-Wise Data Export Toolbar */}
      <MonthExportBar
        onExportExcel={handleMonthExportExcel}
        onExportPDF={handleMonthExportPDF}
        title="Officer Monthly Case Portfolio & Underwriting Export"
      />

      {/* 8 Required Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
        {/* 1. Total Assigned Leads */}
        <div className="card-3d card-tint-total-leads p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Assigned
          </span>
          <span className="text-2xl font-black text-brand-navy mt-1 block">{totalAssigned}</span>
          <span className="text-[10px] text-blue-700 font-semibold">Active Queue</span>
        </div>

        {/* 2. Pending Leads */}
        <div className="card-3d card-tint-pending p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Pending Leads
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingLeads}</span>
          <span className="text-[10px] text-amber-700 font-semibold">Needs Attention</span>
        </div>

        {/* 3. Leads In Process */}
        <div className="card-3d card-tint-new-leads p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
            In Process
          </span>
          <span className="text-2xl font-black text-sky-600 mt-1 block">{inProcessLeads}</span>
          <span className="text-[10px] text-sky-700 font-semibold">Active Review</span>
        </div>

        {/* 4. Approved Leads */}
        <div className="card-3d card-tint-payout-completed p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Approved Leads
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{approvedLeads}</span>
          <span className="text-[10px] text-emerald-700 font-semibold">Sanctions Done</span>
        </div>

        {/* 5. Disbursed Leads */}
        <div className="card-3d card-tint-verified p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
            Disbursed
          </span>
          <span className="text-2xl font-black text-teal-600 mt-1 block">{disbursedLeads}</span>
          <span className="text-[10px] text-teal-700 font-semibold">Lender Released</span>
        </div>

        {/* 6. Rejected Leads */}
        <div className="card-3d card-tint-rejected p-4 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            Rejected Leads
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{rejectedLeads}</span>
          <span className="text-[10px] text-rose-700 font-semibold">Ineligible/Dropped</span>
        </div>

        {/* 7. Follow-ups Due Today */}
        <div className="card-3d card-tint-invoice-generated p-4 rounded-2xl border border-purple-200">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Due Today
          </span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">{followupsDueToday.length}</span>
          <span className="text-[10px] text-purple-700 font-semibold">Urgent Calls</span>
        </div>

        {/* 8. Upcoming Follow-ups */}
        <div className="card-3d card-tint-total-leads p-4 rounded-2xl border border-indigo-200">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
            Upcoming
          </span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">{upcomingFollowups.length}</span>
          <span className="text-[10px] text-indigo-700 font-semibold">Scheduled Tasks</span>
        </div>
      </div>

      {/* Row 2: Lead Status Distribution + Upcoming Follow-up List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lead Status Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Lead Status Distribution</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {totalAssigned} Files
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <div className="relative w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData.length ? statusDistributionData : [{ name: 'None', count: 1, color: '#e2e8f0' }]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {(statusDistributionData.length ? statusDistributionData : [{ color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-brand-navy">{totalAssigned}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assigned</span>
                </div>
              </div>

              {/* Status Breakdown Legend */}
              <div className="space-y-2 flex-1 w-full">
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
            <span className="text-slate-500 font-medium">Conversion Focus</span>
            <Link to="/employee/leads" className="text-brand-royal font-bold hover:underline">
              Review Pipeline →
            </Link>
          </div>
        </div>

        {/* Upcoming Follow-up List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarClock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Upcoming Follow-up List</h3>
              </div>
              <Link to="/employee/followups" className="text-xs text-emerald-700 font-bold hover:underline">
                View All ({upcomingFollowups.length}) →
              </Link>
            </div>

            <div className="space-y-2.5 pt-3">
              {upcomingFollowups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No upcoming follow-ups scheduled. Great job clearing your tasks!
                </div>
              ) : (
                upcomingFollowups.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-brand-navy truncate">
                          {f.customerName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          {f.followUpTime || 'Scheduled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{f.notes}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {f.phone} • {formatINR(f.loanAmount)}
                      </span>
                    </div>

                    <a
                      href={`tel:${f.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center space-x-1 flex-shrink-0 transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Priority: Complete today's telephonic contacts first</span>
            <Link to="/employee/followups" className="text-emerald-700 font-bold hover:underline">
              Open Schedule →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Lead Activity & Assigned Leads Quick Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Lead Activity (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-brand-navy text-base">Recent Activity</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Live Feed</span>
            </div>

            <div className="space-y-3 pt-3">
              {officerActivities.map((act, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-slate-800 line-clamp-2">{act.title || act.action}</p>
                    <span className="text-[10px] text-slate-400">{act.time || 'Recently logged'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/employee/leads"
            className="w-full mt-4 py-2 text-center text-xs font-bold text-slate-600 hover:text-brand-royal bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors block"
          >
            Go to Full Audit History →
          </Link>
        </div>

        {/* Assigned Cases Table (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-brand-navy text-base">My Assigned Cases</h3>
              <p className="text-xs text-slate-500">Live files allocated to your officer ID</p>
            </div>
            <Link to="/employee/leads" className="text-xs font-bold text-brand-royal hover:underline">
              View All ({myLeads.length}) →
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Loan Details</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Added</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myLeads.slice(0, 5).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{l.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.phone}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-brand-navy">{formatINR(l.loanAmount)}</div>
                      <div className="text-[10px] text-slate-500">{l.loanCategory}</div>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={l.currentStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{l.addedOn || l.createdDate}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveLeadModal && setActiveLeadModal(l)}
                        className="px-3 py-1 bg-slate-100 hover:bg-brand-navy hover:text-white text-slate-700 font-bold rounded-lg transition-colors text-[11px] cursor-pointer"
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
