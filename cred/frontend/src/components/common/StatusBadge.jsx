import React from 'react';

export const StatusBadge = ({ status, size = 'md', className = '' }) => {
  if (!status) return null;

  const normalized = String(status).trim().toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';

  // Green / Success states
  if (
    normalized === 'verified' ||
    normalized === 'approved' ||
    normalized === 'disbursed' ||
    normalized === 'paid' ||
    normalized === 'payout complete' ||
    normalized === 'payout completed' ||
    normalized === 'active' ||
    normalized === 'completed' ||
    normalized === 'resolved'
  ) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    dotClass = 'bg-emerald-500';
  }
  // Blue / Info / Progress states
  else if (
    normalized === 'new' ||
    normalized === 'in process' ||
    normalized === 'contacted' ||
    normalized === 'invoice generated' ||
    normalized === 'scheduled' ||
    normalized === 'consultation scheduled' ||
    normalized === 'low'
  ) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
    dotClass = 'bg-blue-600';
  }
  // Amber / Warning / Hold states
  else if (
    normalized === 'hold' ||
    normalized === 'pending' ||
    normalized === 'invoice uploaded' ||
    normalized === 'payment initiated' ||
    normalized === 'in progress' ||
    normalized === 'design finalized' ||
    normalized === 'medium'
  ) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80';
    dotClass = 'bg-amber-500 animate-pulse';
  }
  // Red / Danger / Rejected states
  else if (
    normalized === 'rejected' ||
    normalized === 'invoice rejected' ||
    normalized === 'payout failed' ||
    normalized === 'payment failed' ||
    normalized === 'inactive' ||
    normalized === 'overdue' ||
    normalized === 'high'
  ) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotClass = 'bg-rose-500';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-medium rounded-full border shadow-xs transition-colors ${colorClasses} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      <span>{status}</span>
    </span>
  );
};

