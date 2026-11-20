import React, { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
  CalendarClock,
  Building2,
  BadgeCheck,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <div className="flex items-center gap-2 break-all text-sm font-semibold text-slate-800">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
      <span>{value || "Not available"}</span>
    </div>
  </div>
);

export const AdminSettingsPage = () => {
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
  }, [user?.name, user?.phone]);

  const displayName = user?.name || "Administrator";
  const initials = displayName.trim().charAt(0).toUpperCase() || "A";

  const lastLogin = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : "Not available";

  const handleStartEdit = () => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setError("");
    setIsEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (phone && phone.length < 8) {
      setError("Please enter a valid phone number.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await authApi.updateCurrentUser({ name, phone });

      if (!response?.success || !response?.user) {
        throw new Error(response?.message || "Profile update failed.");
      }

      updateUser(response.user);

      setForm({
        name: response.user.name || "",
        phone: response.user.phone || "",
      });

      setIsEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err?.message || "Unable to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy">
            Admin Profile
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            View and manage your administrator account information.
          </p>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#B91C1C]"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium">
        <div className="bg-[#0B132B] p-6 text-white sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-bold ring-1 ring-white/20">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={`${displayName} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{displayName}</h2>
              <p className="mt-1 text-sm text-slate-300">
                {user?.designation || user?.role || "Administrator"}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" />
                {user?.status || "Account"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-navy">
                Administrator Information
              </h3>
              <p className="text-xs text-slate-500">
                Account details from your authenticated account
              </p>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="admin-profile-name"
                    className="mb-2 block text-xs font-bold text-slate-600"
                  >
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="admin-profile-name"
                    type="text"
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-profile-phone"
                    className="mb-2 block text-xs font-bold text-slate-600"
                  >
                    Phone Number
                  </label>
                  <input
                    id="admin-profile-phone"
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem
                  label="Email Address"
                  value={user?.email}
                  icon={Mail}
                />
                <InfoItem
                  label="Username"
                  value={user?.username}
                  icon={UserRound}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem label="Full Name" value={user?.name} icon={UserRound} />
              <InfoItem label="Email Address" value={user?.email} icon={Mail} />
              <InfoItem label="Phone Number" value={user?.phone} icon={Phone} />
              <InfoItem
                label="Username"
                value={user?.username}
                icon={UserRound}
              />
              <InfoItem label="Role" value={user?.role} icon={ShieldCheck} />
              <InfoItem
                label="Employee Code"
                value={user?.employeeCode}
                icon={Building2}
              />
              <InfoItem
                label="Account Status"
                value={user?.status}
                icon={BadgeCheck}
              />
              <InfoItem
                label="Last Login"
                value={lastLogin}
                icon={CalendarClock}
              />
            </div>
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
        You can update your name and phone number. Your email, username, role,
        account status, and account codes are read-only on this page. Changes
        are saved to your account through the authenticated backend API.
      </div>
    </div>
  );
};

export default AdminSettingsPage;
