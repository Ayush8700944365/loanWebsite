import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { leadsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatINR } from "../../utils/formatters";
import {
  User,
  Phone,
  Mail,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PartnerSubmitLeadPage = () => {
  const { showToast, loanCategories = [], banks = [] } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authenticated partner details
  const partnerName = user?.companyName || user?.name || "—";
  const partnerCode = user?.partnerCode || "—";

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    loanType: "",
    preferredBank: "",
    loanAmount: "",
    city: "",
    branchName: "",
    additionalDetails: "",
    monthlyIncome: "",
    tenureYears: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Customer name validation
    if (!formData.customerName.trim()) {
      showToast("Customer name is required", "error");
      return;
    }

    // Indian mobile number validation
    const normalizedPhone = formData.phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      showToast("Please provide a valid 10-digit mobile number", "error");
      return;
    }

    // Loan category validation
    if (!formData.loanType) {
      showToast("Please select a loan category", "error");
      return;
    }

    // Bank preference validation
    if (!formData.preferredBank) {
      showToast("Please select a lending institution", "error");
      return;
    }

    // Loan amount validation
    const loanAmount = Number(formData.loanAmount);

    if (!Number.isFinite(loanAmount) || loanAmount < 500000) {
      showToast("Minimum loan amount should be ₹5,00,000", "error");
      return;
    }

    // Monthly income validation
    const monthlyIncome = Number(formData.monthlyIncome);

    if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
      showToast("Please enter a valid monthly income", "error");
      return;
    }

    // Tenure validation
    const tenureYears = Number(formData.tenureYears);

    if (![10, 15, 20, 25, 30].includes(tenureYears)) {
      showToast("Please select a valid loan tenure", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await leadsApi.createPartner({
        customerName: formData.customerName.trim(),
        phone: normalizedPhone,
        email: formData.email.trim(),
        loanCategory: formData.loanType,
        leadType: formData.preferredBank === "SBI" ? "SBI" : "Non-SBI",
        preferredBank: formData.preferredBank,
        loanAmount,
        monthlyIncome,
        tenureYears,
        city: formData.city.trim(),
        branchName: formData.branchName.trim(),
        additionalDetails: formData.additionalDetails.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Lead submission failed.");
      }

      showToast("Referral lead submitted successfully!", "success");

      navigate("/partner/leads");
    } catch (err) {
      console.error("Partner lead submission error:", err);

      showToast(
        err.message || "Error submitting lead. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto font-sans">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
          Submit New Customer File
        </h1>

        <p className="text-xs text-slate-500 mt-1">
          Fast-track your customer's loan sanction by providing verified
          applicant details and KYC documents.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-premium card-3d">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Submitter Attribution Banner */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />

              <span className="text-slate-700">
                Submitting as Channel Partner: <strong>{partnerName}</strong> (
                {partnerCode})
              </span>
            </div>

            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              Sourcing Source: Partner Referral
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Customer Full Name *
              </label>

              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type="text"
                  required
                  placeholder="e.g. Anand K. Singhania"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customerName: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Customer Mobile Number *
              </label>

              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 98201 92831"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Customer Email */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Customer Email Address
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type="email"
                  placeholder="e.g. anand@singhania.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Loan Category */}
            {/* Loan Category */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Loan Category *
              </label>

              <select
                required
                value={formData.loanType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    loanType: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="">Select Loan Category</option>

                {loanCategories
                  .filter((category) => category.status === "active")
                  .map((category) => (
                    <option
                      key={category._id || category.id}
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}
              </select>

              {loanCategories.filter((category) => category.status === "active")
                .length === 0 && (
                <p className="text-[11px] text-red-500 mt-1">
                  No active loan categories available. Please contact Admin.
                </p>
              )}
            </div>

            {/* Preferred Bank */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Lending Institution Preference *
              </label>

              <select
                required
                value={formData.preferredBank}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredBank: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="">Select Lending Institution</option>
                {banks.filter((bank) => bank.status === "Active").map((bank) => (
                  <option key={bank._id || bank.id} value={bank.name}>{bank.name}</option>
                ))}
              </select>
              {banks.filter((bank) => bank.status === "Active").length === 0 && <p className="mt-1 text-xs text-slate-500">No active lending institutions are available. Contact an administrator.</p>}
            </div>

            {/* Loan Amount */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Requested Loan Facility:{" "}
                {formData.loanAmount
                  ? formatINR(Number(formData.loanAmount))
                  : formatINR(0)}
              </label>

              <input
                type="number"
                required
                step="500000"
                min="500000"
                value={formData.loanAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    loanAmount: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Monthly Income */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Monthly Net Income (₹) *
              </label>

              <input
                type="number"
                required
                min="1"
                step="1000"
                value={formData.monthlyIncome}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthlyIncome: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Loan Tenure */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Desired Tenure (Years) *
              </label>

              <select
                required
                value={formData.tenureYears}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tenureYears: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="">Select Loan Tenure</option>
                <option value="10">10 Years (120 Months)</option>
                <option value="15">15 Years (180 Months)</option>
                <option value="20">20 Years (240 Months)</option>
                <option value="25">25 Years (300 Months)</option>
                <option value="30">30 Years (360 Months)</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                City / Region
              </label>

              <input
                type="text"
                placeholder="e.g. Mumbai, Pune, Thane"
                value={formData.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    city: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Preferred Bank Branch */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Preferred Bank Branch
              </label>

              <input
                type="text"
                  placeholder="Branch or location details (if known)"
                value={formData.branchName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branchName: e.target.value,
                  })
                }
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Case Notes & Specific Remarks
            </label>

            <textarea
              rows="3"
              placeholder="Mention builder tie-up, required disbursement date, or special interest concession..."
              value={formData.additionalDetails}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  additionalDetails: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {/* KYC Attachment - UI only, upload integration pending */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-dashed border-amber-300 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UploadCloud className="w-8 h-8 text-amber-600" />

              <div>
                <p className="font-bold text-slate-800">
                  Attach Applicant KYC & Income Bundle
                </p>

                <p className="text-[11px] text-slate-500">
                  ZIP or PDF package up to 25MB
                </p>
              </div>
            </div>

            <label className="cursor-pointer px-4 py-2 bg-white text-brand-navy border border-slate-300 text-xs font-semibold rounded-xl shadow-xs hover:bg-slate-50">
              <span>Attach File</span>
              <input
                type="file"
                accept=".pdf,.zip,application/pdf,application/zip"
                className="hidden"
              />
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3.5 rounded-xl font-extrabold text-xs shadow-md flex items-center space-x-2 transition-all btn-3d cursor-pointer ${
                isSubmitting
                  ? "bg-amber-400 text-white cursor-not-allowed opacity-80"
                  : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <span>Submit Lead to Underwriting Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
