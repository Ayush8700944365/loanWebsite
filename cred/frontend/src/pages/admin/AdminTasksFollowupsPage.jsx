import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  Search,
  User,
  ChevronRight,
  X,
  PhoneCall,
  Check,
  CalendarDays
} from 'lucide-react';

export const AdminTasksFollowupsPage = () => {
  const { followUps, addFollowUp, toggleFollowUpStatus, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // ALL, TODAY, HIGH, COMPLETED
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    task: 'Call for documents',
    followUpDate: new Date().toISOString().split('T')[0],
    followUpTime: '',
    priority: 'High',
    notes: ''
  });

  const list = followUps || [];

  const filteredTasks = list.filter((task) => {
    if (tabFilter === 'TODAY' && new Date(task.followUpDate).toDateString() !== new Date().toDateString()) return false;
    if (tabFilter === 'HIGH' && task.priority !== 'High') return false;
    if (tabFilter === 'COMPLETED' && task.reminderStatus !== 'Completed') return false;
    if (tabFilter !== 'COMPLETED' && task.reminderStatus === 'Completed') {
      if (tabFilter !== 'ALL') return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        task.customerName.toLowerCase().includes(q) ||
        task.task.toLowerCase().includes(q) ||
        task.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleMarkComplete = async (id) => {
    try { await toggleFollowUpStatus(id); showToast('Task marked as completed.', 'success'); }
    catch { /* API error is shown by context */ }
  };

  const handleCreateFollowup = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone) {
      showToast('Please enter customer name and phone', 'error');
      return;
    }
    try { await addFollowUp(formData); setShowModal(false); setFormData({ customerName: '', phone: '', task: 'Call for documents', followUpDate: new Date().toISOString().split('T')[0], followUpTime: '', priority: 'Medium', notes: '' }); }
    catch { /* API error is shown by context */ }
  };

  const todayCount = list.filter((t) => new Date(t.followUpDate).toDateString() === new Date().toDateString()).length;
  const highPriorityCount = list.filter((t) => t.priority === 'High').length;
  const completedCount = list.filter((t) => t.reminderStatus === 'Completed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#18181B] tracking-tight">
            Tasks & Follow-up Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated call schedule, customer reminders, document follow-ups, and bank query resolutions.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md shadow-red-200 flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">{list.length}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Active across all leads</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Due Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-blue-800 mt-2 block">{todayCount}</span>
          <span className="text-[10px] text-blue-600 font-semibold mt-1 block">Requires action before 7 PM</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">High Priority</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-red-700 mt-2 block">{highPriorityCount}</span>
          <span className="text-[10px] text-red-600 font-semibold mt-1 block">Critical Sanction Closures</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-700 mt-2 block">{completedCount}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Successfully resolved</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tasks by borrower name, task title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#DC2626] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Tasks' },
            { id: 'TODAY', label: "Today's Calls" },
            { id: 'HIGH', label: 'High Priority' },
            { id: 'COMPLETED', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tabFilter === tab.id
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List (Visual Style identical to Image 2 with Call Action Button) */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/90 text-slate-400">
            No follow-up tasks match this view.
          </div>
        ) : (
          filteredTasks.map((item) => {
            const isCompleted = item.reminderStatus === 'Completed';
            return (
              <div
                key={item.id}
                className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10 opacity-75'
                    : 'border-slate-200/90 hover:border-red-200 hover:shadow-xs'
                }`}
              >
                {/* Left: Icon, Details, Notes */}
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.priority === 'High'
                        ? 'bg-red-100 text-[#DC2626]'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <PhoneCall className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {item.customerName}
                      </span>
                      <span className="text-slate-400 font-normal text-xs">–</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {item.task}
                      </span>
                      {item.priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DC2626]">
                          High Priority
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.timeDisplay || `${item.followUpDate} at ${item.followUpTime}`}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-600 font-semibold">{item.phone}</span>
                      {item.notes && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="italic text-slate-500 max-w-xs truncate">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Call & Complete Buttons */}
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <a
                    href={`tel:${item.phone}`}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    title={`Call ${item.customerName}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>

                  {!isCompleted ? (
                    <button
                      onClick={() => handleMarkComplete(item.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 px-3 py-1 bg-emerald-100 rounded-lg">
                      Done
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Schedule Customer Follow-up</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowup} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Borrower Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Task Subject</label>
                <select
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                >
                  <option value="Call for documents">Call for documents</option>
                  <option value="Loan eligibility check">Loan eligibility check</option>
                  <option value="Discuss loan amount">Discuss loan amount</option>
                  <option value="Sanction letter explanation">Sanction letter explanation</option>
                  <option value="Disbursement verification">Disbursement verification</option>
                  <option value="Bank legal verification visit">Bank legal verification visit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Due date</label>
                  <input
                    type="date" required
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Time</label>
                  <input type="time" required value={formData.followUpTime} onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Follow-up Notes</label>
                <textarea
                  rows={2}
                  placeholder="Details about documents to collect or offer to discuss..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

