import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { formatLeadUid } from '../../utils/leadIds';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  FileText,
  Copy,
  TrendingUp
} from 'lucide-react';

export const AdminCustomersPage = () => {
  const { customers, addCustomer, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    activeLoan: '',
    totalBorrowed: '',
    creditScore: '',
  });

  const filteredCustomers = (customers || []).filter((c) => {
    if (kycFilter !== 'ALL' && c.kycStatus !== kycFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        String(c.cibilScore || "").includes(q)
      );
    }
    return true;
  });

  const totalBorrowedSum = (customers || []).reduce((acc, curr) => acc + (curr.totalBorrowed || 0), 0);
  const reportedScores = (customers || []).map((customer) => Number(customer.cibilScore)).filter((score) => score > 0);
  const avgCreditScore = reportedScores.length ? Math.round(reportedScores.reduce((sum, score) => sum + score, 0) / reportedScores.length) : null;

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Please enter customer name and phone', 'error');
      return;
    }
    try {
      await addCustomer(formData);
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', city: '', activeLoan: '', totalBorrowed: '', creditScore: '' });
    } catch { /* API error toast is shown by AppContext. */ }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showToast(`Copied ${text} to clipboard`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#18181B] tracking-tight">
            Customer Portfolio & Borrowers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized directory of verified loan clients, CBS bank accounts, and active portfolios.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md shadow-red-200 flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Borrowers</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">{customers?.length || 0}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            Lead records from CRM
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Portfolio</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">
            {formatINR(totalBorrowedSum)}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">Recorded loan amount across leads</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average reported CIBIL</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-700 mt-2 block">{avgCreditScore ?? "—"}</span>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Only recorded scores</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KYC Compliance</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">{customers.length ? `${Math.round(customers.filter((customer) => customer.kycStatus === 'Verified').length * 100 / customers.length)}%` : '—'}</span>
          <span className="text-[10px] text-purple-600 font-semibold mt-1 block">Verified lead records</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, mobile, email, CBS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#DC2626] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 pl-1">
            <Filter className="w-3 h-3" /> KYC:
          </span>
          {['ALL', 'Verified', 'Pending'].map((status) => (
            <button
              key={status}
              onClick={() => setKycFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                kycFilter === status
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Borrower Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Active Loan Product</th>
                <th className="py-3.5 px-4">Total Borrowed</th>
                <th className="py-3.5 px-4">Reported CIBIL</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const initials = cust.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <tr key={cust.id} className="hover:bg-red-50/20 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{cust.name}</p>
                            <p className="text-[10px] text-slate-400">Lead: {formatLeadUid(cust.leadCode)} · {cust.since ? new Date(cust.since).toLocaleDateString() : "date unavailable"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-700">{cust.phone}</p>
                        <p className="text-[10px] text-slate-400">{cust.email}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {cust.city}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {cust.activeLoan}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cust.totalBorrowed ? formatINR(cust.totalBorrowed) : "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            !cust.cibilScore ? 'bg-slate-100 text-slate-500' : cust.cibilScore >= 750
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.cibilScore >= 700
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {cust.cibilScore || "Not recorded"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.kycStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {cust.kycStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <a
                            href={`tel:${cust.phone}`}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#DC2626] hover:text-white text-slate-700 font-semibold transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Add New Borrower</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Deshmukh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="customer@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Active Loan Type</label>
                  <select
                    required
                    value={formData.activeLoan}
                    onChange={(e) => setFormData({ ...formData, activeLoan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  >
                    <option value="">Select loan type</option>
                    <option value="Home Loan">Home Loan</option>
                    <option value="Balance Transfer">Balance Transfer</option>
                    <option value="Plot Loan">Plot Loan</option>
                    <option value="Loan Against Property">Loan Against Property</option>
                    <option value="Top-Up Loan">Top-Up Loan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Requested Loan Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalBorrowed}
                    onChange={(e) => setFormData({ ...formData, totalBorrowed: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Reported CIBIL Score (optional)</label>
                  <input
                    type="number"
                    value={formData.creditScore}
                    onChange={(e) => setFormData({ ...formData, creditScore: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-[11px] text-slate-400">Customer ID: {selectedCustomer.id}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-red-50/40 rounded-xl border border-red-100">
                <p className="text-[10px] uppercase font-bold text-red-600">Active Facility</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedCustomer.activeLoan}</p>
                <p className="text-slate-600 font-semibold">{formatINR(selectedCustomer.totalBorrowed)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Phone</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.phone}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">{selectedCustomer.email}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">CBS Account</span>
                  <span className="font-mono text-slate-800">Not recorded</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Credit Score</span>
                  <span className="font-bold text-slate-700">{selectedCustomer.cibilScore || "Not recorded"}</span>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center text-xs flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </a>
                <Link to="/admin/tasks-followups" className="flex-1 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-center text-white font-bold text-xs">Schedule Follow-up</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

