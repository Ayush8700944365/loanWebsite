import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { RealCredLogo } from "../../components/common/RealCredLogo";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { UserCheck, Lock, Mail, ArrowRight } from "lucide-react";

export const EmployeeLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useApp();
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
      });

      if (!result?.success || !result.user) {
        throw new Error("Authentication failed. Please try again.");
      }

      if (result.role?.toLowerCase() !== "employee") {
        await logout();
        showToast(
          "Access denied. Please use the correct login portal.",
          "error",
        );
        return;
      }

      showToast("Employee login successful.", "success");
      navigate("/employee", { replace: true });
    } catch (error) {
      showToast(
        error?.message || "Login failed. Please check your credentials.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-premium space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <RealCredLogo />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>LOAN OFFICER WORKSPACE</span>
          </div>

          <h2 className="text-2xl font-extrabold text-brand-navy">
            Loan Officer Login
          </h2>

          <p className="text-xs text-slate-500">
            Assigned leads, field verifications and customer follow-up portal.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Officer Email Address
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Access Password
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            Sign in using the employee credentials registered by your
            administrator.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <span>
              {isSubmitting ? "Signing In..." : "Open Loan Officer Workspace"}
            </span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link to="/" className="hover:text-brand-navy font-semibold">
            ← Return to Website
          </Link>

          <Link
            to="/partner/login"
            className="text-amber-700 font-bold hover:underline"
          >
            DSA Partner Login →
          </Link>
        </div>
      </div>
    </div>
  );
};
