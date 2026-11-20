import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Edit3, LogOut, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmployeeProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast('Name is required.', 'error');
    if (form.phone.trim() && form.phone.trim().length < 8) return showToast('Enter a valid phone number.', 'error');
    setSaving(true);
    try {
      const response = await authApi.updateCurrentUser({ name: form.name.trim(), phone: form.phone.trim() });
      if (!response?.success || !response.user) throw new Error(response?.message || 'Profile update failed.');
      updateUser(response.user);
      setEditing(false);
      showToast('Profile updated.', 'success');
    } catch (error) { showToast(error.message || 'Profile update failed.', 'error'); }
    finally { setSaving(false); }
  };

  const signOut = async () => { await logout(); navigate('/login'); };

  return (
    <main className="max-w-3xl space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-brand-navy">Employee Profile</h1><p className="mt-1 text-xs text-slate-500">Profile information from your account record.</p></div>
        <div className="flex gap-2">
          {editing ? <button type="button" onClick={() => { setForm({ name: user?.name || '', phone: user?.phone || '' }); setEditing(false); }} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700"><X className="mr-1 inline h-4 w-4"/>Cancel</button> : <button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"><Edit3 className="mr-1 inline h-4 w-4"/>Edit</button>}
          <button type="button" onClick={signOut} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700"><LogOut className="mr-1 inline h-4 w-4"/>Sign out</button>
        </div>
      </header>
      <form onSubmit={save} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Name {editing && <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm"/>}{!editing && <span className="mt-1 block text-sm text-slate-900">{user?.name || '—'}</span>}</label>
          <label className="text-xs font-bold text-slate-600">Email <span className="mt-1 block text-sm text-slate-900">{user?.email || '—'}</span></label>
          <label className="text-xs font-bold text-slate-600">Phone {editing && <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm"/>}{!editing && <span className="mt-1 block text-sm text-slate-900">{user?.phone || '—'}</span>}</label>
          <label className="text-xs font-bold text-slate-600">Employee code <span className="mt-1 block text-sm text-slate-900">{user?.employeeCode || '—'}</span></label>
          <label className="text-xs font-bold text-slate-600">Role <span className="mt-1 block text-sm capitalize text-slate-900">{user?.role || '—'}</span></label>
        </div>
        {editing && <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="mr-1 inline h-4 w-4"/>{saving ? 'Saving…' : 'Save profile'}</button></div>}
      </form>
    </main>
  );
};
