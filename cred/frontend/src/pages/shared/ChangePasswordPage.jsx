import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ChangePasswordPage = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) return setError("The new passwords do not match.");
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      navigate(user?.role === "admin" ? "/admin" : user?.role === "partner" ? "/partner" : "/employee", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div><h1 className="text-xl font-extrabold text-slate-900">Change your temporary password</h1><p className="mt-1 text-sm text-slate-600">Set a new password before continuing to your workspace.</p></div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <label className="block text-sm font-semibold">Temporary password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-semibold">New password<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="text-xs font-normal text-slate-500">Use 12-128 characters.</span></label>
        <label className="block text-sm font-semibold">Confirm new password<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <button disabled={saving} className="w-full rounded-lg bg-brand-royal px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Change password"}</button>
      </form>
    </main>
  );
};
