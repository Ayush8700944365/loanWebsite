import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { RealCredLogo } from "../../components/common/RealCredLogo";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  KeyRound,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const CentralizedLoginPage = () => {
  const location = useLocation();
  const [identifier, setIdentifier] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(["admin", "partner", "employee"].includes(location.state?.role) ? location.state.role : "admin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg("Please enter both your email/username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        email: identifier.trim(),
        username: identifier.trim(),
        password: password.trim(),
        role: selectedRole,
        rememberMe,
      });

      if (res.success) {
        showToast(`Welcome back, ${res.user.name}!`, "success");

        // Check if there was a redirected location intended
        const fromPath = location.state?.from?.pathname;

        if (res.user.mustChangePassword) {
          navigate("/change-password", { replace: true });
          return;
        }

        // Auto-redirect based on authenticated role
        if (fromPath && fromPath.startsWith(`/${res.role}`)) {
          navigate(fromPath, { replace: true });
        } else {
          if (res.role === "admin") {
            navigate("/admin", { replace: true });
          } else if (res.role === "employee") {
            navigate("/employee", { replace: true });
          } else if (res.role === "partner") {
            navigate("/partner", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      }
    } catch (err) {
      setErrorMsg(
        err.message ||
          "Invalid credentials. Please verify your email and password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#DC2626] selection:text-white">
      {/* Container */}
      <div className="max-w-5xl w-full mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200">
        {/* Left Section: Branding, Illustration & Value Proposition (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B132B] via-[#142B4A] to-[#1E293B] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle geometric circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 space-y-4">
            <RealCredLogo theme="light" />
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Single Sign-On (SSO) • 256-Bit SSL</span>
            </div>
          </div>

          {/* Center Graphic & Mission */}
          <div className="my-8 sm:my-10 relative z-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-red-500 shadow-inner">
              <KeyRound className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Your Loan. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-white">
                One Guided Route.
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Unified enterprise access for Underwriters, Loan Officers, and DSA
              Channel Partners.
            </p>

            <div className="pt-2 space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Role-based access to the RealCred CRM</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Role Identification & Route Segregation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>CRM records and workflow tools</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span>© RealCred Technology Pvt. Ltd.</span>
            <Link
              to="/"
              className="text-blue-300 hover:text-white transition-colors"
            >
              Public Portal →
            </Link>
          </div>
        </div>

        {/* Right Section: Centralized Login Form (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Header */}
            <div className="pb-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Sign in to RealCred
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your corporate credentials to access your authorized
                  dashboard.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2 animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {/* Select Login Role */}
            <div className="mt-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Your Role
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "admin", label: "Admin" },
                  { value: "partner", label: "Partner" },
                  { value: "employee", label: "Employee" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSelectedRole(item.value);
                      setErrorMsg("");
                    }}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedRole === item.value
                        ? "bg-red-50 border-red-500 text-red-600 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4 mt-6">
              {/* Email / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="name@realcred.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#DC2626] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    state={{ role: selectedRole, email: identifier }}
                    className="text-[11px] font-bold text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter account security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#DC2626] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#DC2626] rounded-md border-slate-300 focus:ring-[#DC2626] cursor-pointer"
                  />
                  <span>Remember my login session</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-lg shadow-red-200 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In & Open Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer note */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Need Channel Partner registration?</span>
            <Link
              to="/partner-register"
              className="font-bold text-slate-800 hover:text-[#DC2626] transition-colors"
            >
              Apply as Partner (DSA) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
