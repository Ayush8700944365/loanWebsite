import React, { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { RealCredLogo } from "../../components/common/RealCredLogo";
import { authApi } from "../../services/api";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "partner", label: "Partner" },
  { value: "employee", label: "Employee" },
];

export const PasswordRecoveryPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get("token") || "";
  const [role, setRole] = useState(roles.some((item) => item.value === location.state?.role) ? location.state.role : "admin");
  const [email, setEmail] = useState(location.state?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const [resetComplete, setResetComplete] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setDevelopmentResetUrl("");
    try {
      const response = await authApi.requestPasswordReset({ email: email.trim(), role });
      setMessage(response.message || "If an active account matches those details, a reset link will be sent.");
      setDevelopmentResetUrl(response.developmentResetUrl || "");
    } catch (requestError) {
      setError(requestError.message || "Unable to request a password reset. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Choose a password between 12 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.resetPassword({ token, newPassword });
      setMessage(response.message || "Password reset successfully.");
      setResetComplete(true);
    } catch (requestError) {
      setError(requestError.message || "This reset link is invalid or has expired.");
    } finally {
      setBusy(false);
    }
  };

  const resetting = Boolean(token);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-6 flex justify-center"><RealCredLogo /></div>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-700">{resetting ? <KeyRound size={22} /> : <ShieldCheck size={22} />}</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{resetting ? "Set a new password" : "Forgot your password?"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{resetting ? "Choose a strong password with at least 12 characters." : "Enter your account email and role. We’ll send a secure, one-time reset link if they match an active account."}</p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p>}

        {resetting ? resetComplete ? (
          <Link to="/login" className="flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">Go to sign in</Link>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
            <label className="block text-sm font-semibold text-slate-700">Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
            <button disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">{busy && <Loader2 size={16} className="animate-spin" />}Reset password</button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Account role</legend>
              <div className="grid grid-cols-3 gap-2">{roles.map((item) => <button key={item.value} type="button" aria-pressed={role === item.value} onClick={() => setRole(item.value)} className={`rounded-xl border px-2 py-2.5 text-sm font-bold ${role === item.value ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200"}`}>{item.label}</button>)}</div>
            </fieldset>
            <label className="block text-sm font-semibold text-slate-700">Account email<div className="relative mt-1.5"><Mail size={17} className="absolute left-3 top-3 text-slate-400" /><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></div></label>
            <button disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}Send reset link</button>
            {developmentResetUrl && <a href={developmentResetUrl} className="block break-all rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 underline">Open development reset link</a>}
          </form>
        )}
        <Link to="/login" state={{ role, email }} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16} />Back to sign in</Link>
      </section>
    </main>
  );
};
