import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  CalendarClock,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  X,
  CreditCard
} from 'lucide-react';

export const EmployeeFollowupsPage = () => {
  const { followUps, addFollowUp, toggleFollowUpStatus, showToast } = useApp();
  const [filterView, setFilterView] = useState('ALL'); // 'ALL' | 'Scheduled' | 'Completed'
  const [showAddModal, setShowAddModal] = useState(false);

  const [newFollowUpForm, setNewFollowUpForm] = useState({
    customerName: '',
    phone: '',
    followUpDate: new Date().toISOString().split('T')[0],
    followUpTime: '',
    notes: '',
    leadType: 'SBI',
    task: 'Customer follow-up',
    priority: 'Medium'
  });

  const filtered = followUps.filter((f) => {
    if (filterView === 'Scheduled' && f.reminderStatus !== 'Scheduled') return false;
    if (filterView === 'Completed' && f.reminderStatus !== 'Completed') return false;
    return true;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newFollowUpForm.customerName || !newFollowUpForm.notes) return;
    try { await addFollowUp(newFollowUpForm); setShowAddModal(false); }
    catch { return; }
    setNewFollowUpForm({
      customerName: '',
      phone: '',
      followUpDate: new Date().toISOString().split('T')[0],
      followUpTime: '',
      notes: '',
      leadType: 'SBI',
      task: 'Customer follow-up',
      priority: 'Medium'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Follow-up & Task Reminder Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track scheduled telephonic touchpoints, document pickups, and borrower consultations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Follow-up Reminder</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs max-w-xs text-xs font-bold text-slate-600">
        {['ALL', 'Scheduled', 'Completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterView(tab)}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              filterView === tab ? 'bg-slate-900 text-white shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Follow-up Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const isDone = item.reminderStatus === 'Completed';
          return (
            <div
              key={item.id}
              className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                isDone
                  ? 'bg-slate-50/70 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200/80 shadow-premium'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{item.id}</span>
                  </div>
                  <button
                    onClick={() => toggleFollowUpStatus(item.id)}
                    className="focus:outline-hidden"
                  >
                    <StatusBadge status={item.reminderStatus} size="sm" />
                  </button>
                </div>

                <h3 className={`font-bold text-base text-brand-navy ${isDone ? 'line-through text-slate-400' : ''}`}>
                  {item.customerName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.phone}</p>

                <div className="my-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {item.notes}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.followUpDate} • {item.followUpTime}</span>
                </div>

                <button
                  onClick={() => toggleFollowUpStatus(item.id)}
                  className={`text-xs font-bold transition-colors ${
                    isDone ? 'text-slate-400 hover:text-slate-700' : 'text-emerald-600 hover:underline'
                  }`}
                >
                  {isDone ? 'Mark Pending' : 'Mark Completed'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">Schedule New Follow-up</h3>
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
                  value={newFollowUpForm.customerName}
                  onChange={(e) => setNewFollowUpForm({ ...newFollowUpForm, customerName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 XXXXX"
                  value={newFollowUpForm.phone}
                  onChange={(e) => setNewFollowUpForm({ ...newFollowUpForm, phone: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={newFollowUpForm.followUpDate}
                    onChange={(e) => setNewFollowUpForm({ ...newFollowUpForm, followUpDate: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time</label>
                  <input
                    type="text"
                    value={newFollowUpForm.followUpTime}
                    onChange={(e) => setNewFollowUpForm({ ...newFollowUpForm, followUpTime: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Objective / Notes *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Reason for call or task reminder..."
                  value={newFollowUpForm.notes}
                  onChange={(e) => setNewFollowUpForm({ ...newFollowUpForm, notes: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Add Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

