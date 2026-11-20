import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { authApi, partnersApi } from "../../services/api";
import {
  Building,
  Mail,
  Phone,
  CreditCard,
  LogOut,
  Edit3,
  Save,
  X,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const EMPTY_PROFILE = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  partnerCode: "",
  city: "",
  address: "",
  gstNo: "",
  panNo: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  ifsc: "",
  status: "",
};

const inputClass =
  "w-full text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500";

const displayValue = (value) => value?.trim() || "Not provided";

const ProfileField = ({
  label,
  field,
  icon: Icon,
  required = false,
  editable = true,
  uppercase = false,
  isEditing,
  form,
  profile,
  onChange,
}) => (
  <div>
    <label className="text-slate-500 font-bold block mb-1">
      {label} {required && "*"}
    </label>

    {isEditing && editable ? (
      <input
        type="text"
        required={required}
        value={form[field] || ""}
        onChange={(e) => onChange(field, e.target.value)}
        className={`${inputClass} ${uppercase ? "uppercase" : ""}`}
      />
    ) : (
      <span className="font-semibold text-slate-800 text-sm flex items-center gap-2 break-all">
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        {displayValue(profile[field])}
      </span>
    )}
  </div>
);
export const PartnerProfilePage = () => {
  const { showToast } = useApp();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [partnerDocuments, setPartnerDocuments] = useState([]);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementType, setReplacementType] = useState("PAN Card");
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const mapUserToProfile = (data = {}) => ({
    companyName: data.companyName || "",
    contactPerson: data.contactPerson || data.name || "",
    phone: data.phone || "",
    email: data.email || "",
    partnerCode: data.partnerCode || "",
    city: data.city || "",
    address: data.address || "",
    gstNo: data.gstNo || "",
    panNo: data.panNo || "",
    bankName: data.bankName || "",
    bankBranch: data.bankBranch || "",
    accountNumber: data.accountNumber || "",
    ifsc: data.ifsc || "",
    status: data.status || "",
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);

      try {
        const [response, partnerResponse] = await Promise.all([authApi.getCurrentUser(), partnersApi.getMine()]);

        if (!response?.success || !response.user) {
          throw new Error(
            response?.message || "Unable to load partner profile.",
          );
        }

        if (response.user.role !== "partner") {
          throw new Error("Partner account is required.");
        }

        if (active) {
          const actualProfile = mapUserToProfile(response.user);
          const currentPartner = partnerResponse.partners?.[0];
          setPartnerDocuments(currentPartner?.partnerDocuments || []);
          setProfile(actualProfile);
          setForm(actualProfile);
          updateUser(response.user);
        }
      } catch (error) {
        console.error("Partner profile loading error:", error);
        if (active) {
          showToast(error.message || "Unable to load profile.", "error");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleStartEdit = () => {
    setForm({ ...profile, accountNumber: "" });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm({ ...profile });
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    if (!form.companyName.trim()) {
      showToast("Company / Firm name is required.", "error");
      return;
    }

    if (!form.contactPerson.trim()) {
      showToast("Contact person name is required.", "error");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, ""))) {
      showToast("Enter a valid 10-digit mobile number.", "error");
      return;
    }

    if (
      form.gstNo.trim() &&
      !/^[0-9A-Z]{15}$/.test(form.gstNo.trim().toUpperCase())
    ) {
      showToast("Enter a valid 15-character GSTIN.", "error");
      return;
    }

    if (
      form.panNo.trim() &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNo.trim().toUpperCase())
    ) {
      showToast("Enter a valid PAN number.", "error");
      return;
    }

    if (
      form.ifsc.trim() &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim().toUpperCase())
    ) {
      showToast("Enter a valid IFSC code.", "error");
      return;
    }

    const payload = {};
    for (const field of ["contactPerson", "phone", "companyName", "city", "address", "gstNo", "panNo", "bankName", "bankBranch", "ifsc"]) {
      const value = ["gstNo", "panNo", "ifsc"].includes(field) ? form[field].trim().toUpperCase() : form[field].trim();
      if (value !== (profile[field] || "")) payload[field] = value;
    }
    if (form.accountNumber.trim()) payload.accountNumber = form.accountNumber.trim();
    if (!Object.keys(payload).length) { setIsEditing(false); return; }

    setIsSaving(true);

    try {
      const response = await partnersApi.requestChanges(payload);

      if (!response?.success) {
        throw new Error(response?.message || "Profile change request failed.");
      }
      setIsEditing(false);
      showToast("Profile changes submitted for Admin review.", "success");
    } catch (error) {
      console.error("Partner profile update error:", error);
      showToast(error.message || "Unable to update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadReplacementDocument = async () => {
    if (!replacementFile || uploadingDocument) return;
    const data = new FormData(); data.append("documentTypes", JSON.stringify([{ documentType: replacementType }])); data.append("partnerDocuments", replacementFile);
    setUploadingDocument(true);
    try { const response = await partnersApi.uploadDocuments(data); setPartnerDocuments(response.partner?.partnerDocuments || []); setReplacementFile(null); showToast("Document uploaded and queued for Admin review.", "success"); }
    catch (error) { showToast(error.message || "Unable to upload document.", "error"); }
    finally { setUploadingDocument(false); }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      showToast("Unable to sign out. Please try again.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-sm text-slate-500">
          Loading partner profile...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Channel Partner Profile & Banking Details
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered business, contact, tax and bank details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Firm details */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-premium space-y-6 card-3d">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
                {(profile.companyName || "P").slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-brand-navy break-words">
                  {displayValue(profile.companyName)}
                </h2>
                <p className="text-xs font-bold text-amber-700">
                  Partner Code: {displayValue(profile.partnerCode)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Registered Channel Partner
                </p>
              </div>
            </div>

            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <ProfileField
              label="Company / Firm Name"
              field="companyName"
              icon={Building}
              required
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Key Principal / Contact Person"
              field="contactPerson"
              required
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Official Mobile Contact"
              field="phone"
              icon={Phone}
              required
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Official Corporate Email"
              field="email"
              icon={Mail}
              editable={false}
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Partner Code"
              field="partnerCode"
              editable={false}
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="City"
              field="city"
              icon={MapPin}
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <div className="sm:col-span-2">
              <ProfileField
                label="Registered / Operating Address"
                field="address"
                isEditing={isEditing}
                form={form}
                profile={profile}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Tax details */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-premium space-y-5 card-3d">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-navy text-sm">
                Tax & Business Information
              </h3>
              <p className="text-xs text-slate-500">
                Registered tax identification details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ProfileField
              label="GSTIN Number"
              field="gstNo"
              uppercase
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="PAN Card Number"
              field="panNo"
              uppercase
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Bank details */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-premium space-y-5 card-3d">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-navy text-sm">
                Bank Account Details
              </h3>
              <p className="text-xs text-slate-500">
                Registered beneficiary bank information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ProfileField
              label="Beneficiary Bank"
              field="bankName"
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Branch"
              field="bankBranch"
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="Account Number"
              field="accountNumber"
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
            <ProfileField
              label="IFSC Code"
              field="ifsc"
              uppercase
              isEditing={isEditing}
              form={form}
              profile={profile}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Account information */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-premium">
          <h3 className="font-bold text-brand-navy text-sm mb-3">
            Account Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-slate-500 font-bold block mb-1">
                Account Status
              </label>
              <span className="text-sm font-semibold text-slate-800">
                {displayValue(profile.status)}
              </span>
            </div>
          </div>
        </section>

        {isEditing && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-premium"><h2 className="font-bold text-brand-navy">KYC documents</h2><p className="mt-1 text-xs text-slate-500">Documents remain private. Replacements return to Pending until Admin review.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{partnerDocuments.map((doc)=><article key={doc.documentId} className="rounded-xl border p-3 text-xs"><strong>{doc.documentType}</strong><p className="mt-1 text-slate-500">{doc.fileName} · Version {doc.version} · {doc.status}</p>{doc.rejectionReason && <p className="mt-1 text-rose-700">{doc.rejectionReason}</p>}</article>)}{!partnerDocuments.length && <p className="text-xs text-slate-500">No KYC files found.</p>}</div><div className="mt-4 flex flex-wrap items-center gap-2"><select value={replacementType} onChange={(event)=>setReplacementType(event.target.value)} className="rounded-lg border px-3 py-2 text-xs"><option>PAN Card</option><option>Identity and address proof</option><option>Masked Aadhaar or alternative</option><option>Cancelled cheque</option><option>Bank passbook</option><option>Company registration certificate</option><option>GST certificate</option><option>Business address proof</option><option>Contact person photograph</option><option>Partner agreement</option><option>Other business document</option></select><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event)=>setReplacementFile(event.target.files?.[0] || null)} className="min-w-0 text-xs"/><button type="button" disabled={!replacementFile || uploadingDocument} onClick={uploadReplacementDocument} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{uploadingDocument ? "Uploading…" : "Upload / replace"}</button></div></section>
    </div>
  );
};
