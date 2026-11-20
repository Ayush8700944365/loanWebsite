import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LifeBuoy, Plus, Send, X } from 'lucide-react';
import { formatLeadUid } from '../../utils/leadIds';

export const PartnerTicketsPage = () => {
  const { tickets, leads, addTicket, addTicketMessage, showToast } = useApp();
  const [selectedTicket, setSelectedTicket] = useState(tickets[0] || null);
  const [replyText, setReplyText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [newForm, setNewForm] = useState({
    title: '',
    ticketType: 'Lead',
    leadType: 'SBI',
    leadId: 'RC-LD-8901',
    customerName: 'Vikram Malhotra',
    subcategory: 'Disbursement Delay',
    priority: 'High',
    description: '',
    createdBy: 'Apex Realty Finserve'
  });

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    addTicketMessage(selectedTicket.ticketId, replyText.trim(), 'Rajeshwar (Apex Realty)', false);
    selectedTicket.messages.push({
      id: 'msg-' + Date.now(),
      sender: 'Rajeshwar (Apex Realty)',
      role: 'Partner',
      isStaff: false,
      timestamp: 'Just Now',
      text: replyText.trim()
    });
    setReplyText('');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newForm.title || !newForm.description) return;
    addTicket(newForm);
    setShowNewModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Partner Escalation & Support Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resolve disbursement queries, commission disputes and branch manager escalations.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Open Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-premium space-y-3">
          <h3 className="font-bold text-xs text-brand-navy pb-2 border-b">My Support Tickets</h3>
          <div className="space-y-2">
            {tickets.map((tkt) => (
              <div
                key={tkt.ticketId}
                onClick={() => setSelectedTicket(tkt)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedTicket?.ticketId === tkt.ticketId
                    ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] text-slate-400 font-bold">{tkt.ticketId}</span>
                  <StatusBadge status={tkt.status} size="sm" />
                </div>
                <h4 className="font-bold text-xs text-brand-navy line-clamp-1">{tkt.title}</h4>
                <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                  <span>{tkt.customerName}</span>
                  <span>{tkt.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium flex flex-col justify-between min-h-[500px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="pb-3 border-b">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-bold text-slate-600">{selectedTicket.ticketId}</span>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <h3 className="text-base font-bold text-brand-navy">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lead: {formatLeadUid(selectedTicket.leadId)} • {selectedTicket.customerName}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px] pr-1">
                {(selectedTicket.messages || []).map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.isStaff ? 'items-start' : 'items-end'}`}>
                    <div className="text-[10px] text-slate-400 mb-0.5">{msg.sender} • {msg.timestamp}</div>
                    <div className={`p-3 rounded-2xl max-w-md text-xs ${
                      msg.isStaff ? 'bg-slate-100 text-slate-800' : 'bg-amber-600 text-white'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="pt-3 border-t flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message to RealCred desk..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-brand-navy text-base">Raise Partner Escalation Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disbursement confirmation required"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Customer Lead</label>
                <select
                  value={newForm.leadId}
                  onChange={(e) => {
                    const l = leads.find((x) => x.id === e.target.value);
                    setNewForm({
                      ...newForm,
                      leadId: e.target.value,
                      customerName: l ? l.customerName : ''
                    });
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.id} - {l.customerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message Description *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail your request..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

