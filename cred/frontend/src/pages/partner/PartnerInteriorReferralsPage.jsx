import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Sofa,
  Plus,
  Search,
  Phone,
  Calendar,
  Sparkles,
  X
} from 'lucide-react';

export const PartnerInteriorReferralsPage = () => {
  const { interiorReferrals, addInteriorReferral } = useApp();
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRefForm.customerName || !newRefForm.phone) return;
    try { await addInteriorReferral(newRefForm); setShowAddModal(false); }
    catch { return; }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Interior Design Customer Referrals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit a homebuyer referral for the configured interiors service workflow.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Refer Homebuyer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interiorReferrals.map((ref) => (
          <div key={ref.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700">{ref.id}</span>
              <StatusBadge status={ref.status} size="sm" />
            </div>

            <div>
              <h3 className="font-bold text-base text-brand-navy">{ref.customerName}</h3>
              <p className="text-xs text-slate-500">{ref.propertyDetails}</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 p-3 bg-slate-50 rounded-xl">
              <div>Phone: <strong>{ref.phone}</strong></div>
              <div>Location: <strong>{ref.city}</strong></div>
              <div>Timeline: <strong>{ref.possessionTimeline}</strong></div>
              <div className="text-amber-800 font-semibold">Budget: {ref.estimatedBudget}</div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-brand-navy text-base">Refer Homebuyer for Interiors</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newRefForm.customerName}
                  onChange={(e) => setNewRefForm({ ...newRefForm, customerName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 XXXXX"
                  value={newRefForm.phone}
                  onChange={(e) => setNewRefForm({ ...newRefForm, phone: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={newRefForm.city}
                    onChange={(e) => setNewRefForm({ ...newRefForm, city: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Timeline</label>
                  <select
                    value={newRefForm.possessionTimeline}
                    onChange={(e) => setNewRefForm({ ...newRefForm, possessionTimeline: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Immediate (Within 1 Month)">Immediate</option>
                    <option value="1 - 3 Months">1 - 3 Months</option>
                    <option value="3 - 6 Months">3 - 6 Months</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Send Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

