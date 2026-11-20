import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Building,
  User,
  CreditCard,
  X,
  Download,
  Trash2
} from 'lucide-react';

export const AdminApplicationsPage = () => {
  const { applications, addApplication, updateApplicationStatus, deleteApplication, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newAppForm, setNewAppForm] = useState({
    customerName: '',
    phone: '',
    loanType: 'Home Loan',
    bankName: '',
    requestedAmount: ''
  });

  const filteredApps = applications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        app.customerName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.bankName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await addApplication(newAppForm); setShowAddModal(false); setNewAppForm({ customerName: '', phone: '', loanType: 'Home Loan', bankName: '', requestedAmount: '' }); } catch { /* API error is shown by context */ }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#18181B] tracking-tight">
            Loan Applications Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track bank appraisal workflows, sanction approvals and multi-lender LTV reviews.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Applications</span>
          <span className="text-3xl font-extrabold text-[#18181B] mt-1 block">{applications.length}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">All recorded applications</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Approved Sanctions</span>
          <span className="text-3xl font-extrabold text-emerald-700 mt-1 block">
            {applications.filter((a) => a.status === 'Approved').length}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Current status</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Under Processing</span>
          <span className="text-3xl font-extrabold text-amber-700 mt-1 block">
            {applications.filter((a) => a.status === 'In Process').length}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">Current status</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Declined / Ineligible</span>
          <span className="text-3xl font-extrabold text-rose-700 mt-1 block">
            {applications.filter((a) => a.status === 'Rejected').length}
          </span>
          <span className="text-[10px] text-rose-600 font-semibold">Current status</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, application ID or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
          />
        </div>

        <div className="flex space-x-1 text-xs">
          {['ALL', 'Approved', 'In Process', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === st ? 'bg-[#DC2626] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Lending Bank</th>
                <th className="py-3.5 px-4">Requested Amount</th>
                <th className="py-3.5 px-4">Sanctioned Amount</th>
                <th className="py-3.5 px-4">ROI & LTV</th>
                <th className="py-3.5 px-4">CIBIL Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#18181B]">
                    <div>{app.id}</div>
                    <span className="text-[10px] text-slate-400 font-normal">{app.submissionDate}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{app.customerName}</div>
                    <span className="text-[11px] text-slate-500">{app.loanType} • {app.phone}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {app.bankName}
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-[#18181B] text-sm">
                    {formatINR(app.requestedAmount)}
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-emerald-700 text-sm">
                    {formatINR(app.sanctionedAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-bold text-[#DC2626]">{app.roi ? `${app.roi}%` : 'Not recorded'}</div>
                    <span className="text-[10px] text-slate-400">LTV: {app.ltv ? `${app.ltv}%` : 'Not recorded'}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      app.cibilScore >= 750 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {app.cibilScore || 'Not recorded'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {app.status === 'In Process' && (
                        <>
                          <button
                            onClick={() => updateApplicationStatus(app.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === 'Approved' && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sanction Ready
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-[#18181B] text-base">Log Loan Application</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={newAppForm.customerName}
                  onChange={(e) => setNewAppForm({ ...newAppForm, customerName: e.target.value })}
                  className="w-full text-sm border rounded-xl px-3 py-2"
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
                    className="w-full text-sm border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loan Category</label>
                  <select
                    value={newAppForm.loanType}
                    onChange={(e) => setNewAppForm({ ...newAppForm, loanType: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Home Loan">Home Loan</option>
                    <option value="Balance Transfer">Balance Transfer</option>
                    <option value="Plot Loan">Plot Loan</option>
                    <option value="Top-Up Loan">Top-Up Loan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Requested Amount (₹)</label>
                  <input
                    type="number"
                    value={newAppForm.requestedAmount}
                    onChange={(e) => setNewAppForm({ ...newAppForm, requestedAmount: Number(e.target.value), sanctionedAmount: Number(e.target.value) })}
                    className="w-full text-sm border rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lending Bank</label>
                  <input
                    type="text"
                    value={newAppForm.bankName}
                    onChange={(e) => setNewAppForm({ ...newAppForm, bankName: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl shadow-xs"
                >
                  Create Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
