import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { formatINR, formatLakhCrore } from "../../utils/formatters";
import { StatusBadge } from "../../components/common/StatusBadge";
import { partnersApi } from "../../services/api";
import {
  Briefcase,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Building,
  Banknote,
  CheckCircle2,
  Plus,
  X,
  Search,
  FileCheck2,
  ExternalLink,
} from "lucide-react";

export const AdminPartnersPage = () => {
  const { partners, addPartner, togglePartnerStatus, leads, employees, showToast, refreshFromApi } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [partnerPage, setPartnerPage] = useState(1);
  const [credentialNotice, setCredentialNotice] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    city: "",
    businessType: "",
    gstNo: "",
    panNo: "",
  });
  const [reviewPartner, setReviewPartner] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [bankDetails, setBankDetails] = useState(null);
  const [changeRequests, setChangeRequests] = useState([]);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionFields, setCorrectionFields] = useState([]);
  const [correctionDocuments, setCorrectionDocuments] = useState([]);
  const [correctionLink, setCorrectionLink] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [correctionPartner, setCorrectionPartner] = useState(null);
  const [profileEdit, setProfileEdit] = useState({});
  const [profileOriginal, setProfileOriginal] = useState({});
  const [profileBusy, setProfileBusy] = useState(false);
  const [kycType, setKycType] = useState("PAN Card");
  const [kycFile, setKycFile] = useState(null);
  const [internalNotes, setInternalNotes] = useState([]);
  const [internalNoteText, setInternalNoteText] = useState("");
  useEffect(() => {
    partnersApi.getChangeRequests().then((response) => setChangeRequests(response.requests || [])).catch((err) => console.error("Partner change request fetch failed:", err));
    partnersApi.getCorrectionRequests().then((response) => setCorrectionRequests(response.corrections || [])).catch((err) => console.error("Partner correction request fetch failed:", err));
  }, []);
  const loadBankDetails = async (partner) => { try { const response = await partnersApi.getPayoutDetails(partner.partnerCode || partner.id); setBankDetails(response.partner); } catch (err) { setReviewError(err.message || "Unable to load bank details."); } };
  const reviewChangeRequest = async (request, status) => {
    const reason = status === "approved" ? "" : window.prompt("Reason for rejecting this change request:") || "";
    if (status === "rejected" && !reason.trim()) return;
    try { await partnersApi.reviewChangeRequest(request._id, { status, reason }); setChangeRequests((all) => all.filter((item) => item._id !== request._id)); }
    catch (err) { showToast(err.message || "Unable to review change request.", "error"); }
  };
  const reviewBankDetails = async (status) => {
    if (!reviewPartner) return;
    const reason = status === "approved" ? "" : window.prompt("Reason for rejecting bank details:") || "";
    if (status === "rejected" && !reason.trim()) return;
    try { const response = await partnersApi.reviewBankDetails(reviewPartner.partnerCode || reviewPartner.id, { status, reason }); setBankDetails((details) => details ? { ...details, bankDetailsReviewStatus: response.bankDetailsReviewStatus, bankDetailsReviewReason: response.reason } : details); setReviewPartner((partner) => partner ? { ...partner, bankDetailsReviewStatus: response.bankDetailsReviewStatus, bankDetailsReviewReason: response.reason } : partner); }
    catch (err) { setReviewError(err.message || "Unable to review bank details."); }
  };
  const reviewDocument = async (doc, status) => {
    const reason = status === "approved" ? "" : window.prompt("Reason for rejection or re-upload request:") || "";
    if (status !== "approved" && !reason.trim()) return;
    setReviewBusy(true); setReviewError("");
    try {
      const result = await partnersApi.reviewDocument(reviewPartner.partnerCode || reviewPartner.id, doc.documentId, { status, reason });
      setReviewPartner((partner) => ({ ...partner, partnerDocuments: partner.partnerDocuments.map((item) => item.documentId === doc.documentId ? { ...item, status: result.document.status, rejectionReason: result.document.rejectionReason, reviewedAt: result.document.reviewedAt } : item) }));
    } catch (err) { setReviewError(err.message || "Document review failed."); } finally { setReviewBusy(false); }
  };
  const previewPartnerDocument = async (doc, version = null) => {
    try { const blob = await partnersApi.previewDocument(reviewPartner.partnerCode || reviewPartner.id, doc.documentId, version); const url = URL.createObjectURL(blob); setDocumentPreview((old) => { if (old?.url) URL.revokeObjectURL(old.url); return { url, doc: { ...doc, version } }; }); }
    catch (err) { setReviewError(err.message || "Unable to preview document."); }
  };
  const downloadPartnerDocument = async (doc, version = null) => {
    try { const blob = await partnersApi.downloadDocument(reviewPartner.partnerCode || reviewPartner.id, doc.documentId, version); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = doc.fileName || `${doc.documentType}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (err) { setReviewError(err.message || "Unable to download document."); }
  };
  const createCorrectionLink = async () => {
    if (!reviewPartner || !correctionReason.trim() || (!correctionFields.length && !correctionDocuments.length)) return;
    setCorrectionBusy(true); setReviewError("");
    try {
      const result = await partnersApi.requestCorrection(reviewPartner.partnerCode || reviewPartner.id, { reason: correctionReason, fields: correctionFields, documentTypes: correctionDocuments });
      setCorrectionLink(`${window.location.origin}${result.correction.url}`);
      setCorrectionRequests((items) => [result.correction, ...items]);
    } catch (err) { setReviewError(err.message || "Unable to create correction request."); }
    finally { setCorrectionBusy(false); }
  };

  const openPartnerReview = async (partner) => {
    setReviewPartner(partner); setReviewError(""); setCorrectionLink(""); setCorrectionFields([]); setCorrectionDocuments([]); setCorrectionReason(""); setBankDetails(null);
    const fields = ["companyName", "contactPerson", "email", "phone", "alternatePhone", "partnerType", "businessType", "panNo", "gstNo", "address", "communicationAddress", "city", "state", "pinCode", "dateOfBirth", "accountHolderName", "bankName", "bankBranch", "ifsc", "accountType", "bankBranchAddress", "upiId"];
    const values = Object.fromEntries(fields.map((field) => [field, field === "dateOfBirth" ? (partner[field] ? new Date(partner[field]).toISOString().slice(0, 10) : "") : field === "accountType" ? (String(partner[field] || "").toLowerCase().startsWith("saving") ? "Savings" : String(partner[field] || "").toLowerCase() === "current" ? "Current" : "") : (partner[field] ?? "")]));
    setProfileEdit(values); setProfileOriginal({ ...values, accountType: partner.accountType ?? "" });
    try { const response = await partnersApi.getInternalNotes(partner.partnerCode || partner.id); setInternalNotes(response.notes || []); }
    catch (error) { setReviewError(error.message || "Unable to load internal review notes."); }
  };

  const activationReadiness = (partner) => {
    const documents = partner?.partnerDocuments || [];
    const documentsReady = documents.length > 0 && documents.every((document) => document.status === "approved");
    const bankDetailsReady = [partner?.accountHolderName, partner?.bankName, partner?.bankBranch, partner?.accountNumber, partner?.ifsc, partner?.accountType].every(Boolean);
    const bankReviewReady = partner?.bankDetailsReviewStatus === "approved";
    return { documentsReady, bankDetailsReady, bankReviewReady, ready: documentsReady && bankDetailsReady && bankReviewReady };
  };

  const handlePartnerStatusAction = async (partner) => {
    const activated = await togglePartnerStatus(partner.id);
    if (!activated && partner.status !== "Active") await openPartnerReview(partner);
  };

  const activateFromReview = async () => {
    if (!reviewPartner) return;
    const activated = await togglePartnerStatus(reviewPartner.id, "active");
    if (activated) {
      setReviewPartner(null);
      setBankDetails(null);
    }
  };

  const savePartnerProfile = async (event) => {
    event.preventDefault();
    if (!reviewPartner || profileBusy) return;
    const changes = Object.fromEntries(Object.entries(profileEdit).filter(([key, value]) => value !== profileOriginal[key]));
    if (!Object.keys(changes).length) return;
    setProfileBusy(true); setReviewError("");
    try { const result = await partnersApi.updateAdminProfile(reviewPartner.partnerCode || reviewPartner.id, changes); setReviewPartner((current) => ({ ...current, ...result.partner })); setProfileOriginal(profileEdit); await refreshFromApi(); showToast("Partner profile updated.", "success"); }
    catch (error) { setReviewError(error.message || "Unable to update partner profile."); }
    finally { setProfileBusy(false); }
  };

  const uploadAdminKyc = async (event) => {
    event.preventDefault();
    if (!reviewPartner || !kycFile || profileBusy) return;
    const body = new FormData(); body.append("partnerDocuments", kycFile, kycFile.name); body.append("documentTypes", JSON.stringify([{ documentType: kycType }]));
    setProfileBusy(true); setReviewError("");
    try { const result = await partnersApi.uploadAdminDocuments(reviewPartner.partnerCode || reviewPartner.id, body); setReviewPartner((current) => ({ ...current, ...result.partner })); setKycFile(null); await refreshFromApi(); showToast("Document uploaded and left pending review.", "success"); }
    catch (error) { setReviewError(error.message || "Unable to upload partner document."); }
    finally { setProfileBusy(false); }
  };

  const saveInternalPartnerNote = async (event) => {
    event.preventDefault();
    if (!reviewPartner || !internalNoteText.trim() || profileBusy) return;
    setProfileBusy(true);
    try { const response = await partnersApi.addInternalNote(reviewPartner.partnerCode || reviewPartner.id, internalNoteText.trim()); setInternalNotes(response.notes || []); setInternalNoteText(""); }
    catch (error) { setReviewError(error.message || "Unable to save internal note."); }
    finally { setProfileBusy(false); }
  };

  const resetPartnerPassword = async () => {
    if (!reviewPartner || !window.confirm(`Issue a one-time password for ${reviewPartner.companyName}? Existing partner sessions will be revoked.`)) return;
    setProfileBusy(true); setReviewError(""); setCredentialNotice(null);
    try {
      const result = await partnersApi.resetPassword(reviewPartner.partnerCode || reviewPartner.id);
      setCredentialNotice({ username: reviewPartner.username || reviewPartner.email, password: result.temporaryPassword });
    } catch (error) { setReviewError(error.message || "Password reset failed."); }
    finally { setProfileBusy(false); }
  };

  const filteredPartners = partners.filter((partner) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [partner.companyName, partner.contactPerson, partner.city, partner.email, partner.phone, partner.partnerCode || partner.id]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const approval = String(partner.partnerApprovalStatus || "pending").toLowerCase();
    const account = String(partner.status || "unknown").toLowerCase();
    return matchesSearch && (approvalFilter === "all" || approval === approvalFilter) && (accountFilter === "all" || account === accountFilter);
  });
  const partnerPageSize = 10;
  const partnerPageCount = Math.max(1, Math.ceil(filteredPartners.length / partnerPageSize));
  const visiblePartners = filteredPartners.slice((partnerPage - 1) * partnerPageSize, partnerPage * partnerPageSize);
  const reviewReadiness = reviewPartner ? activationReadiness(reviewPartner) : null;
  const getPartnerCorrections = (partner) => correctionRequests.filter((request) => request.partnerCode === (partner.partnerCode || partner.id) || request.partnerCode === partner.id);
  const runPartnerAction = (partner, action) => {
    if (action === "primary") return handlePartnerStatusAction(partner);
    const rejecting = action === "reject";
    const reason = window.prompt(rejecting ? "Reason for rejecting this partner application:" : "Reason for suspending this partner:") || "";
    if (reason.trim()) return togglePartnerStatus(partner.id, rejecting ? "rejected" : "suspended", reason.trim());
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (
      !newPartnerForm.companyName.trim() ||
      !newPartnerForm.contactPerson.trim() ||
      !newPartnerForm.email.trim() ||
      !newPartnerForm.username.trim() ||
      !newPartnerForm.password ||
      !newPartnerForm.city.trim() ||
      !newPartnerForm.businessType
    ) {
      return;
    }

    try {
      await addPartner(newPartnerForm);

      setShowAddModal(false);

      setNewPartnerForm({
        companyName: "",
        contactPerson: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        city: "",
        businessType: "",
        gstNo: "",
        panNo: "",
      });
    } catch (error) {
      console.error("Partner creation failed:", error);
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-royal">Partner network</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Channel Partners (DSA Network)
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Direct Selling Agents, chartered accountants, builders, and loan
            brokers.
          </p>
        </div>

        <p className="max-w-sm rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-900">Partner activation requires review of submitted KYC documents and bank details.</p>
      </div>

      {/* Search & Overview */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm grid gap-4 md:grid-cols-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search partner by company name, contact, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-3 py-3 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal/20"
          />
        </div>
        <label className="text-xs font-semibold text-slate-600">Approval status<select value={approvalFilter} onChange={(event) => { setApprovalFilter(event.target.value); setPartnerPage(1); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-100/70"><option value="all">All approvals</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Account status<select value={accountFilter} onChange={(event) => { setAccountFilter(event.target.value); setPartnerPage(1); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-100/70"><option value="all">All account states</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="pending">Pending</option></select></label>
        <div className="md:col-span-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-xs font-medium text-slate-500">Showing <strong className="text-slate-800">{filteredPartners.length}</strong> matching partners</span><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Active DSAs <strong>
            {partners.filter((p) => p.status === "Active").length} Firms
          </strong></span></div>
      </div>

      {/* Partners List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Partner Firm</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Business Type</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Leads Logged</th>
                <th className="py-3.5 px-4">Earned Comm.</th>
                <th className="py-3.5 px-4">Pending Comm.</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No partners available.
                  </td>
                </tr>
              ) : (
                visiblePartners.map((p) => {
                  const partnerLeadsCount = p.totalLeads ?? 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-rose-50/30 transition-colors"
                    >
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div>{p.companyName}</div>
                        <span className="mt-1 block text-[10px] text-slate-400 font-mono font-normal">
                          {p.id} • Joined {p.joinedDate || "—"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">
                          {p.contactPerson}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.phone || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.email || "—"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {p.businessType}
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {p.city}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{partnerLeadsCount} Leads</span>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-emerald-700">
                        {formatINR(p.totalCommission ?? 0)}
                      </td>
                      <td className="py-4 px-4 font-bold text-amber-600">
                        {formatINR(p.pendingCommission ?? 0)}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[205px] flex-col gap-2">
                          <div className="flex gap-2">
                            <button onClick={() => openPartnerReview(p)} className="flex-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-2 text-[11px] font-semibold text-blue-800 transition hover:bg-blue-100">KYC · {p.partnerDocuments?.length || 0}</button>
                            <button onClick={() => setCorrectionPartner(p)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50">Corrections · {getPartnerCorrections(p).length}</button>
                          </div>
                          <select aria-label={`Account actions for ${p.companyName}`} value="" onChange={(event) => { const action = event.target.value; if (action) runPartnerAction(p, action); }} className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100">
                            <option value="">Manage account…</option>
                            <option value="primary">{p.status === "Active" ? "Deactivate account" : p.status === "Pending" ? "Review / approve" : "Activate account"}</option>
                            {p.status === "Pending" && <option value="reject">Reject application</option>}
                            {p.status === "Active" && <option value="suspend">Suspend partner</option>}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredPartners.length > 0 && <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs"><span className="text-slate-500">Showing {Math.min(filteredPartners.length, (partnerPage - 1) * partnerPageSize + 1)}–{Math.min(filteredPartners.length, partnerPage * partnerPageSize)} of {filteredPartners.length}</span><div className="flex items-center gap-2"><button type="button" disabled={partnerPage <= 1} onClick={() => setPartnerPage((current) => Math.max(1, current - 1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span>{partnerPage} / {partnerPageCount}</span><button type="button" disabled={partnerPage >= partnerPageCount} onClick={() => setPartnerPage((current) => Math.min(partnerPageCount, current + 1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>}
      </div>

      {changeRequests.some((request) => request.status === "pending") && <section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">Partner profile and bank change requests</h2><div className="mt-3 space-y-3">{changeRequests.filter((request) => request.status === "pending").map((request) => <article key={request._id} className="rounded-xl border p-3"><p className="text-xs font-semibold">{request.partnerCode} · Requested {new Date(request.requestedAt || request.createdAt).toLocaleString()}</p><dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(request.changes || {}).map(([key,value]) => <div key={key}><dt className="text-slate-500">{key}</dt><dd className="break-all font-semibold">{value}</dd></div>)}</dl><div className="mt-3 flex gap-2"><button onClick={() => reviewChangeRequest(request,"approved")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => reviewChangeRequest(request,"rejected")} className="rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-700">Reject</button></div></article>)}</div></section>}
      {correctionPartner && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="partner-corrections-title" className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round"/></svg></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">Partner activity</p><h2 id="partner-corrections-title" className="mt-0.5 truncate text-lg font-bold text-slate-900">Correction history · {correctionPartner.companyName}</h2><p className="mt-1 text-xs text-slate-500">Partner ID <span className="font-semibold text-slate-700">{correctionPartner.partnerCode || correctionPartner.id}</span></p></div></div><button type="button" onClick={() => setCorrectionPartner(null)} className="shrink-0 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Close</button></header><div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">{getPartnerCorrections(correctionPartner).length ? <div className="relative space-y-4 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-slate-200">{getPartnerCorrections(correctionPartner).map((item) => { const statusStyle = item.status === "open" || item.status === "processing" ? "bg-amber-50 text-amber-800 ring-amber-200" : item.status === "submitted" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"; return <article key={item._id || item.id} className="relative ml-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><span className="absolute -left-[38px] top-5 h-3 w-3 rounded-full border-[3px] border-white bg-amber-500 shadow ring-1 ring-amber-200"/><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correction request</p><p className="mt-1 text-xs font-semibold text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date unavailable"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold capitalize ring-1 ring-inset ${statusStyle}`}>{item.status}</span></div><div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reason</p><p className="mt-1 text-sm leading-5 text-slate-800">{item.reason || "No reason provided"}</p></div>{(item.fields?.length || item.documentTypes?.length) > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{!!item.fields?.length && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Details to update <span className="text-slate-400">· {item.fields.length}</span></p><div className="flex flex-wrap gap-1.5">{item.fields.map((field) => { const label = ({ panNo: "PAN", gstNo: "GSTIN", ifsc: "IFSC", upiId: "UPI ID" })[field] || field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()); return <span key={field} className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-800">{label}</span>; })}</div></div>}{!!item.documentTypes?.length && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Documents to resubmit <span className="text-slate-400">· {item.documentTypes.length}</span></p><div className="flex flex-wrap gap-1.5">{item.documentTypes.map((type) => <span key={type} className="rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[10px] font-medium text-violet-800">{type}</span>)}</div></div>}</div>}{item.submittedAt && <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-medium text-emerald-700">Partner submitted · {new Date(item.submittedAt).toLocaleString()}</p>}</article>; })}</div> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">—</span><p className="mt-3 font-semibold text-slate-800">No correction requests yet</p><p className="mt-1 text-xs text-slate-500">Correction activity for this partner will appear here.</p></div></div>}</div></section></div>}

      {reviewPartner && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="partner-review-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">Partner review</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-slate-600">{reviewPartner.status || "unknown"} · {reviewPartner.partnerApprovalStatus || "pending"}</span></div><h2 id="partner-review-title" className="mt-2 truncate text-lg font-bold text-slate-900">{reviewPartner.companyName}</h2><p className="mt-1 text-xs text-slate-500">{reviewPartner.contactPerson || "Contact not supplied"} · {reviewPartner.email || "Email not supplied"} · masked account {reviewPartner.accountNumber || "not provided"}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Date of birth: {reviewPartner.dateOfBirth ? new Date(reviewPartner.dateOfBirth).toLocaleDateString() : "Not supplied"} · Partner type: {reviewPartner.partnerType || "Not supplied"} · Registered: {reviewPartner.createdAt ? new Date(reviewPartner.createdAt).toLocaleString() : "Not recorded"}</p><div className="mt-2 flex flex-wrap gap-2"><button onClick={() => loadBankDetails(reviewPartner)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100">View authorized bank details</button><button disabled={profileBusy} onClick={resetPartnerPassword} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Issue one-time password reset</button></div></div><button onClick={() => { setReviewPartner(null); setBankDetails(null); setCredentialNotice(null); if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url); setDocumentPreview(null); }} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close</button></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
        {reviewPartner.status !== "Active" && <section className={`mt-3 rounded-xl border p-4 ${reviewReadiness.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Activation checklist</h3><p className="mt-1 text-xs text-slate-600">Complete the required reviews below, then activate this partner account.</p><ul className="mt-2 space-y-1 text-xs"><li>{reviewReadiness.documentsReady ? "✓" : "○"} KYC documents approved ({(reviewPartner.partnerDocuments || []).filter((doc) => doc.status === "approved").length}/{(reviewPartner.partnerDocuments || []).length})</li><li>{reviewReadiness.bankDetailsReady ? "✓" : "○"} Required bank details complete</li><li>{reviewReadiness.bankReviewReady ? "✓" : "○"} Bank details approved by Admin</li></ul></div><button type="button" disabled={!reviewReadiness.ready || profileBusy} onClick={activateFromReview} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Activate partner</button></div></section>}
        {credentialNotice && <section className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-bold">One-time temporary password</h3><p className="mt-1 text-xs text-slate-600">Shown once. Send through a trusted channel; the partner must change it at next sign-in. Existing sessions were revoked.</p><p className="mt-2 text-sm"><b>Username:</b> {credentialNotice.username}</p><p className="break-all text-sm"><b>Temporary password:</b> <code className="select-all">{credentialNotice.password}</code></p><button type="button" onClick={() => setCredentialNotice(null)} className="mt-2 rounded-lg border px-3 py-2 text-xs">Hide password</button></section>}
        {bankDetails && <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2"><p>Account holder: <b>{bankDetails.accountHolderName}</b></p><p>Bank: <b>{bankDetails.bankName} · {bankDetails.bankBranch}</b></p><p>Account: <b>{bankDetails.accountNumber}</b></p><p>IFSC: <b>{bankDetails.ifsc}</b></p><p>Type: <b>{bankDetails.accountType}</b></p><p>UPI: <b>{bankDetails.upiId || "Not supplied"}</b></p><p>Review status: <b>{bankDetails.bankDetailsReviewStatus || "pending"}</b></p><p className="sm:col-span-2 text-slate-500">Manual review only: no official PAN, GST or bank verification service is connected.</p><div className="flex gap-2 sm:col-span-2"><button onClick={() => reviewBankDetails("approved")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve bank details</button><button onClick={() => reviewBankDetails("rejected")} className="rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-700">Reject bank details</button></div></div>}
        {reviewError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{reviewError}</p>}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h3 className="font-bold text-slate-900">Registered partner profile</h3><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">{[["Email",reviewPartner.email],["Phone",reviewPartner.phone],["Alternate phone",reviewPartner.alternatePhone],["Partner type",reviewPartner.partnerType],["Business type",reviewPartner.businessType],["PAN",reviewPartner.panNo],["GST",reviewPartner.gstNo],["Address",reviewPartner.address],["Communication address",reviewPartner.communicationAddress],["City",reviewPartner.city],["State",reviewPartner.state],["PIN code",reviewPartner.pinCode],["Registered",reviewPartner.createdAt ? new Date(reviewPartner.createdAt).toLocaleString() : "Not recorded"],["Approval",reviewPartner.partnerApprovalStatus],["Bank account",reviewPartner.accountNumber || "Not provided"]].map(([label,value]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-semibold text-slate-800">{value || "Not supplied"}</dd></div>)}</dl>
          <form onSubmit={savePartnerProfile} className="mt-5 border-t border-slate-100 pt-4"><h4 className="text-sm font-bold">Add or correct partner details</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">Changes are recorded in profile history. Bank changes return to pending Admin review. Full account number remains encrypted; enter it only when replacing it.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["companyName","Company / firm name"],["contactPerson","Contact person"],["email","Email / login address"],["phone","Phone"],["alternatePhone","Alternate phone"],["partnerType","Partner type"],["businessType","Business type"],["panNo","PAN"],["gstNo","GSTIN"],["address","Address"],["communicationAddress","Communication address"],["city","City"],["state","State"],["pinCode","PIN code"],["dateOfBirth","Date of birth"],["accountHolderName","Account holder"],["bankName","Bank name"],["bankBranch","Bank branch"],["ifsc","IFSC"],["accountType","Account type"],["bankBranchAddress","Bank branch address"],["upiId","UPI ID"]].map(([field,label]) => <label key={field} className="text-[11px] font-semibold text-slate-700">{label}{field === "accountType" ? <select value={profileEdit[field] || ""} onChange={(event) => setProfileEdit((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">{/* options */}<option value="">Select Savings or Current</option><option value="Savings">Savings</option><option value="Current">Current</option></select> : <input type={field === "dateOfBirth" ? "date" : field === "email" ? "email" : "text"} value={profileEdit[field] || ""} onChange={(event) => setProfileEdit((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />}</label>)}<label className="text-[11px] font-semibold text-slate-700">Replace account number<input autoComplete="off" value={profileEdit.accountNumber || ""} onChange={(event) => setProfileEdit((current) => ({ ...current, accountNumber: event.target.value }))} placeholder="Leave blank to keep current" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label></div><button disabled={profileBusy || !Object.keys(profileEdit).some((key) => profileEdit[key] !== profileOriginal[key])} className="mt-4 rounded-xl bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-900 disabled:opacity-50">{profileBusy ? "Saving…" : "Save profile details"}</button></form>
        </section>
        <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm sm:p-5"><h3 className="font-bold text-slate-900">Admin-uploaded KYC documents</h3><p className="mt-1 text-xs text-slate-600">Add a document securely; it remains pending until an authorized review action.</p><form onSubmit={uploadAdminKyc} className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_auto]"><label className="text-xs font-semibold text-slate-700">Document type<select value={kycType} onChange={(event) => setKycType(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">{["PAN Card","Identity and address proof","Masked Aadhaar or alternative","Cancelled cheque","Bank passbook","Company registration certificate","GST certificate","Business address proof","Contact person photograph","Partner agreement","Other business document"].map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">PDF or image<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setKycFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs" /></label><button disabled={profileBusy || !kycFile} className="rounded-xl bg-blue-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50">Upload for review</button></form></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">✎</span><div><h3 className="font-bold text-slate-900">Internal review notes</h3><p className="mt-1 text-xs text-slate-500">Private notes for the review team.</p></div></div><div className="mt-3 space-y-2">{internalNotes.map((note) => <p key={note._id} className="rounded-xl bg-slate-50 p-3 text-xs leading-5"><b>{note.author}</b> · {new Date(note.createdAt).toLocaleString()} · {note.text}</p>)}</div><form onSubmit={saveInternalPartnerNote} className="mt-3 flex gap-2"><input value={internalNoteText} onChange={(event) => setInternalNoteText(event.target.value)} maxLength={2000} placeholder="Add an internal review note" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><button disabled={profileBusy || !internalNoteText.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Add note</button></form></section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Follow-up</p><h3 className="mt-1 font-bold text-slate-900">Request specific corrections</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Create a one-time link limited to the details and documents selected below.</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-600">{correctionFields.length + correctionDocuments.length} selected</span></div>
          <label className="mt-4 block text-xs font-semibold text-slate-700">Reason<textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={2} maxLength={1000} placeholder="Tell the partner what needs to be corrected…" className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /></label>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <fieldset className="rounded-xl border border-amber-100 bg-white p-3"><legend className="px-1 text-xs font-bold text-slate-800">Details to update <span className="font-normal text-slate-400">({correctionFields.length})</span></legend><div className="mt-1 grid max-h-52 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">{[["companyName","Company"],["contactPerson","Contact person"],["phone","Phone"],["alternatePhone","Alternate phone"],["businessType","Business type"],["panNo","PAN"],["gstNo","GSTIN"],["city","City"],["state","State"],["pinCode","PIN code"],["address","Registered address"],["communicationAddress","Communication address"],["accountHolderName","Account holder"],["bankName","Bank"],["bankBranch","Branch"],["accountNumber","Account number"],["ifsc","IFSC"],["accountType","Account type"],["bankBranchAddress","Bank address"],["upiId","UPI ID"]].map(([key,label]) => <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs text-slate-700 hover:bg-amber-50"><input type="checkbox" className="accent-rose-600" checked={correctionFields.includes(key)} onChange={(event) => setCorrectionFields((all) => event.target.checked ? [...all,key] : all.filter((item) => item !== key))}/>{label}</label>)}</div></fieldset>
            <fieldset className="rounded-xl border border-amber-100 bg-white p-3"><legend className="px-1 text-xs font-bold text-slate-800">Documents to resubmit <span className="font-normal text-slate-400">({correctionDocuments.length})</span></legend><div className="mt-1 grid max-h-52 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">{["PAN Card","Identity and address proof","Masked Aadhaar or alternative","Cancelled cheque","Bank passbook","Company registration certificate","GST certificate","Business address proof","Contact person photograph","Partner agreement","Other business document"].map((type) => <label key={type} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs text-slate-700 hover:bg-amber-50"><input type="checkbox" className="accent-rose-600" checked={correctionDocuments.includes(type)} onChange={(event) => setCorrectionDocuments((all) => event.target.checked ? [...all,type] : all.filter((item) => item !== type))}/>{type}</label>)}</div></fieldset>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={correctionBusy || !correctionReason.trim() || (!correctionFields.length && !correctionDocuments.length)} onClick={createCorrectionLink} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{correctionBusy ? "Creating…" : "Create correction link"}</button><span className="text-[11px] text-slate-500">Select at least one field or document.</span></div>
          {correctionLink && <div className="mt-4 break-all rounded-xl border border-emerald-200 bg-white p-4 text-xs"><strong className="text-emerald-800">One-time link created</strong><p className="mt-1 text-slate-700">{correctionLink}</p><button onClick={() => navigator.clipboard?.writeText(correctionLink)} className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50">Copy link</button><p className="mt-2 text-slate-500">The token is only shown here. Send it using the approved external contact method.</p></div>}
        </section>
        <div className="grid gap-3 md:grid-cols-2">{(reviewPartner.partnerDocuments || []).map((doc) => <article key={doc.documentId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-2"><strong>{doc.documentType}</strong><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-600">{doc.status}</span></div><p className="mt-1 break-all text-xs text-slate-500">{doc.fileName} · v{doc.version}</p>{doc.rejectionReason && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{doc.rejectionReason}</p>}<div className="mt-3 flex flex-wrap gap-2"><button disabled={reviewBusy} onClick={() => previewPartnerDocument(doc)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50">Preview</button><button disabled={reviewBusy} onClick={() => reviewDocument(doc,"approved")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={reviewBusy} onClick={() => reviewDocument(doc,"rejected")} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Reject</button><button disabled={reviewBusy} onClick={() => reviewDocument(doc,"reupload_requested")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Request re-upload</button></div></article>)}{!reviewPartner.partnerDocuments?.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center md:col-span-2"><p className="text-sm font-semibold text-slate-700">No submitted KYC documents</p><p className="mt-1 text-xs text-slate-500">Submitted partner documents will appear here for review.</p></div>}</div>
        {!!reviewPartner.partnerDocuments?.length && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-800">Secure document downloads</h3><div className="mt-2 flex flex-wrap gap-2">{(reviewPartner.partnerDocuments || []).map((doc) => <button key={doc.documentId} onClick={() => downloadPartnerDocument(doc)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium hover:bg-slate-100">Download {doc.documentType}</button>)}</div></section>}
        {!!(reviewPartner.partnerDocuments || []).some((doc) => doc.history?.length) && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-bold text-slate-800">Document version history</h3>{(reviewPartner.partnerDocuments || []).flatMap((doc) => (doc.history || []).map((version) => ({ doc, version }))).map(({ doc, version }) => <div key={`${doc.documentId}-${version.version}`} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs"><span>{doc.documentType} · v{version.version} · {version.fileName} · {version.status} · {version.uploadedAt ? new Date(version.uploadedAt).toLocaleString() : "date unavailable"}</span><span className="flex gap-2"><button onClick={() => previewPartnerDocument(doc,version.version)} className="rounded-lg border bg-white px-2.5 py-1.5">Preview</button><button onClick={() => downloadPartnerDocument({ ...doc, fileName: version.fileName },version.version)} className="rounded-lg border bg-white px-2.5 py-1.5">Download</button></span></div>)}</section>}
        {documentPreview && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"><div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-xl bg-white p-3"><div className="flex justify-between pb-2"><strong>{documentPreview.doc.fileName}</strong><button onClick={() => { URL.revokeObjectURL(documentPreview.url); setDocumentPreview(null); }}>Close</button></div>{documentPreview.doc.mimeType?.startsWith("image/") ? <img src={documentPreview.url} alt={documentPreview.doc.documentType} className="min-h-0 flex-1 object-contain" /> : <iframe title={documentPreview.doc.documentType} src={documentPreview.url} className="min-h-0 flex-1" />}</div></div>}
      </div></section></div>}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">
                Register Channel Partner
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Company / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Realty Finserve LLP"
                  value={newPartnerForm.companyName}
                  onChange={(e) =>
                    setNewPartnerForm({
                      ...newPartnerForm,
                      companyName: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Partner name"
                    value={newPartnerForm.contactPerson}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        contactPerson: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Mobile Contact *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 XXXXX"
                    value={newPartnerForm.phone}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="partner@company.com"
                    value={newPartnerForm.email}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mumbai, Pune, Delhi..."
                    value={newPartnerForm.city}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        city: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label>Username *</label>
                <input
                  type="text"
                  value={newPartnerForm.username}
                  onChange={(e) =>
                    setNewPartnerForm({
                      ...newPartnerForm,
                      username: e.target.value,
                    })
                  }
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label>Password *</label>
                <input
                  type="password"
                  value={newPartnerForm.password}
                  onChange={(e) =>
                    setNewPartnerForm({
                      ...newPartnerForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter password"
                  minLength={6}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter GST number"
                    value={newPartnerForm.gstNo}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        gstNo: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter PAN number"
                    value={newPartnerForm.panNo}
                    onChange={(e) =>
                      setNewPartnerForm({
                        ...newPartnerForm,
                        panNo: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business Classification
                </label>
                <select
                  value={newPartnerForm.businessType}
                  onChange={(e) =>
                    setNewPartnerForm({
                      ...newPartnerForm,
                      businessType: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                >
                  <option value="" disabled>
                    Select Business Type
                  </option>
                  <option value="Direct Selling Agent (DSA)">
                    Direct Selling Agent (DSA)
                  </option>
                  <option value="Chartered Accountant / Advisor">
                    Chartered Accountant / Financial Advisor
                  </option>
                  <option value="Real Estate Builder & Channel Partner">
                    Real Estate Builder & Channel Partner
                  </option>
                  <option value="Automobile Dealership Partner">
                    Automobile Dealership
                  </option>
                  <option value="Education & Study Abroad Consultant">
                    Study Abroad Consultant
                  </option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Onboard Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
