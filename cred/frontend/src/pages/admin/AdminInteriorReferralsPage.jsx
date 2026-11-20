import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Sofa,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  X,
  Building,
  Sparkles
} from 'lucide-react';

export const AdminInteriorReferralsPage = () => {
  const { interiorReferrals, addInteriorReferral, updateInteriorStatus, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newRefForm, setNewRefForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    city: '',
    propertyDetails: '',
    possessionTimeline: '',
    estimatedBudget: ''
  });

  const filtered = interiorReferrals.filter((ref) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ref.customerName?.toLowerCase().includes(q) ||
        ref.phone?.toLowerCase().includes(q) ||
        ref.city?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRefForm.customerName || !newRefForm.phone) return;
    try { await addInteriorReferral(newRefForm); setShowAddModal(false); }
    catch { return; }
    setNewRefForm({
      customerName: '',
      phone: '',
      email: '',
      city: '',
      propertyDetails: '',
      possessionTimeline: '',
      estimatedBudget: ''
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Interior & Modular Design Referrals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monetize home loan closures with premium interior design partner tie-ups (LivSpace, Design Cafe).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Referral</span>
        </button>
      </div>

      {/* Search & Counter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total Referrals: <strong className="text-slate-800">{interiorReferrals.length}</strong>
        </span>
      </div>

      {/* Referrals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ref) => (
          <div
            key={ref.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-premium transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-brand-royal">{ref.id}</span>
                <StatusBadge status={ref.status} size="sm" />
              </div>

              <h3 className="font-bold text-sm text-brand-navy mb-1">{ref.customerName}</h3>
              <p className="text-xs text-slate-500 mb-3">{ref.propertyDetails || 'Apartment'}</p>

              <div className="space-y-1.5 text-xs text-slate-600 py-3 border-y border-slate-100">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ref.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ref.city}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-brand-royal">Timeline: {ref.possessionTimeline}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Budget: {ref.estimatedBudget}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400">{ref.createdDate}</span>
              <select
                defaultValue={ref.status}
                onChange={(e) => updateInteriorStatus(ref.id, e.target.value).catch(() => {})}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 font-semibold text-brand-navy"
              >
                <option value="New Lead">New Lead</option>
                <option value="Consultation Scheduled">Consultation Scheduled</option>
                <option value="Design Finalized">Design Finalized</option>
                <option value="Work Commenced">Work Commenced</option>
                <option value="Commission Paid">Commission Paid</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Add Referral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">New Interior Lead Referral</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newRefForm.customerName}
                  onChange={(e) => setNewRefForm({ ...newRefForm, customerName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="+91 98200 XXXXX"
                    value={newRefForm.phone}
                    onChange={(e) => setNewRefForm({ ...newRefForm, phone: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={newRefForm.city}
                    onChange={(e) => setNewRefForm({ ...newRefForm, city: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Possession Timeline</label>
                <select
                  value={newRefForm.possessionTimeline}
                  onChange={(e) => setNewRefForm({ ...newRefForm, possessionTimeline: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                >
                  <option value="Immediate (Within 1 Month)">Immediate (Within 1 Month)</option>
                  <option value="1 - 3 Months">1 - 3 Months</option>
                  <option value="3 - 6 Months">3 - 6 Months</option>
                  <option value="Under Construction (>6 Months)">Under Construction (&gt;6 Months)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Property Layout & Budget</label>
                <input
                  type="text"
                  placeholder="3BHK (1,450 sq.ft) • ₹20 - ₹25 Lakhs"
                  value={newRefForm.propertyDetails}
                  onChange={(e) => setNewRefForm({ ...newRefForm, propertyDetails: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-royal hover:bg-brand-navy text-white font-bold rounded-xl shadow-xs"
                >
                  Log Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

