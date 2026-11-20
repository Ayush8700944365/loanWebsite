import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { banksApi } from "../../services/api";
import {
  Landmark,
  Search,
  Plus,
  Phone,
  Percent,
  Clock,
  Layers,
  Building2,
  X,
  Loader2,
  Edit,
  Trash2,
  Power,
  FileText,
  Download,
  Eye,
} from "lucide-react";

const SavedLogoPreview = ({ storageKey, alt }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!storageKey) { setUrl(""); return undefined; }
    let cancelled = false;
    let objectUrl = "";
    banksApi.loadAdminLogo(storageKey).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!cancelled) setUrl(""); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [storageKey]);
  return url ? <img src={url} alt={alt} className="h-12 w-12 rounded-lg border bg-white object-contain p-1" /> : <Landmark className="h-12 w-12 rounded-lg border bg-white p-2 text-slate-400" aria-label="Logo preview unavailable" />;
};

const initialForm = {
  name: "",
  category: "PSU Commercial Bank",
  minRoi: "",
  maxLtv: "",
  tat: "",
  processingFee: "",
  relationshipManager: "",
  contactPhone: "",
  activeFiles: 0,
  status: "active",
  institutionType: "Bank",
  websiteUrl: "",
  publicDescription: "",
  availableLoanCategories: [],
  displayOrder: 0,
  isPublicInstitution: true,
};

export const AdminBanksNbfcPage = () => {
  const {
    banks,
    loanCategories,
    addBank,
    updateBank,
    deleteBank,
    toggleBankStatus,
    showToast,
    refreshFromApi,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);

  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [documentsBusy, setDocumentsBusy] = useState(false);

  const list = banks || [];

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  // Search and category filter
  const filteredBanks = list.filter((bank) => {
    if (
      categoryFilter !== "ALL" &&
      !bank.category?.toLowerCase().includes(categoryFilter.toLowerCase())
    ) {
      return false;
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();

      return (
        bank.name?.toLowerCase().includes(query) ||
        bank.category?.toLowerCase().includes(query) ||
        bank.relationshipManager?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingBank(null);
    setFormData({ ...initialForm });
    setLogoFile(null);
    setSupportingFiles([]);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleEdit = (bank) => {
    setEditingBank(bank);

    setFormData({
      name: bank.name || "",
      category: bank.category || "PSU Commercial Bank",
      minRoi: bank.minRoi || "",
      maxLtv: bank.maxLtv || "",
      tat: bank.tat || "",
      processingFee: bank.processingFee || "",
      relationshipManager: bank.relationshipManager || "",
      contactPhone: bank.contactPhone || "",
      activeFiles: bank.activeFiles ?? 0,
      status: String(bank.status || "active").toLowerCase(),
      institutionType: bank.institutionType || "Bank",
      websiteUrl: bank.websiteUrl || "",
      publicDescription: bank.publicDescription || "",
      availableLoanCategories: (bank.availableLoanCategories || []).map((category) => String(category?._id || category)),
      displayOrder: bank.displayOrder ?? 0,
      isPublicInstitution: bank.isPublicInstitution === true,
    });
    setLogoFile(null);
    setSupportingFiles([]);

    setShowModal(true);
  };

  // Form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Add or Update lender
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    if (!formData.name.trim()) {
      showToast("Please enter lender / bank name.", "error");
      return;
    }

    if (!formData.category.trim()) {
      showToast("Please select lender category.", "error");
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      category: formData.category.trim(),
      activeFiles: Number(formData.activeFiles) || 0,
      displayOrder: Number(formData.displayOrder) || 0,
      isPublicInstitution: formData.isPublicInstitution === true,
      status: formData.status,
    };

    try {
      setIsSaving(true);

      let savedBank;
      if (editingBank) {
        const bankId = editingBank._id || editingBank.id;
        savedBank = await updateBank(bankId, payload);
      } else {
        savedBank = await addBank(payload);
        setEditingBank(savedBank);
      }

      const savedBankId = savedBank?._id || savedBank?.id;
      if (logoFile && savedBankId) {
        const imageForm = new FormData();
        imageForm.append("image", logoFile);
        const logoResponse = await banksApi.uploadLogo(savedBankId, imageForm);
        if (!logoResponse?.success) throw new Error(logoResponse?.message || "Logo upload failed.");
        showToast("Institution logo uploaded and saved.", "success");
      }
      if (supportingFiles.length && savedBankId) {
        const documentForm = new FormData();
        supportingFiles.forEach((file) => documentForm.append("documents", file));
        setDocumentsBusy(true);
        try { await banksApi.uploadDocuments(savedBankId, documentForm); }
        catch (documentError) { throw new Error(`Institution details were saved, but supporting-document upload failed: ${documentError.message}`); }
        finally { setDocumentsBusy(false); }
      }
      await refreshFromApi();

      setShowModal(false);
      setEditingBank(null);
      setFormData({ ...initialForm });
      setLogoFile(null);
      setSupportingFiles([]);
    } catch (error) {
      showToast(error.message || "Bank save failed.", "error");
      console.error("Bank save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBankDocumentOpen = async (bank, docItem, mode = "download") => {
    const bankId = bank._id || bank.id;
    const previewWindow = mode === "preview" ? window.open("about:blank", "_blank") : null;
    if (mode === "preview" && !previewWindow) {
      showToast("Allow pop-ups to preview this document, or use Download.", "error");
      return;
    }
    try {
      const blob = mode === "preview"
        ? await banksApi.previewDocument(bankId, docItem.documentId)
        : await banksApi.downloadDocument(bankId, docItem.documentId);
      const url = URL.createObjectURL(blob);
      if (mode === "preview") {
        previewWindow.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = docItem.fileName || docItem.name || "institution-document";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      showToast(error.message || "Unable to retrieve institution document.", "error");
    }
  };

  const handleBankDocumentDelete = async (bank, item) => {
    try {
      await banksApi.deleteDocument(bank._id || bank.id, item.documentId);
      await refreshFromApi();
      if (editingBank && (editingBank._id || editingBank.id) === (bank._id || bank.id)) {
        setEditingBank((current) => current ? { ...current, supportingDocuments: (current.supportingDocuments || []).filter((doc) => doc.documentId !== item.documentId) } : current);
      }
      showToast("Supporting document removed.", "success");
    } catch (error) {
      showToast(error.message || "Unable to remove supporting document.", "error");
    }
  };

  // Delete lender
  const handleDelete = async (bank) => {
    const bankId = bank._id || bank.id;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${bank.name}?`,
    );

    if (!confirmed || deletingId) return;

    try {
      setDeletingId(bankId);
      await deleteBank(bankId);
    } catch (error) {
      console.error("Bank deletion failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle Active / Inactive
  const handleToggleStatus = async (bank) => {
    const bankId = bank._id || bank.id;

    if (statusUpdatingId) return;

    try {
      setStatusUpdatingId(bankId);
      await toggleBankStatus(bankId);
    } catch (error) {
      console.error("Bank status update failed:", error);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const totalActiveFiles = list.reduce(
    (total, bank) => total + (Number(bank.activeFiles) || 0),
    0,
  );

  const activeLenders = list.filter((bank) => String(bank.status).toLowerCase() === "active").length;

  const closeModal = () => {
    if (isSaving) return;

    setShowModal(false);
    setEditingBank(null);
    setFormData({ ...initialForm });
    setLogoFile(null);
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-royal">Lending network</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Banks & NBFC Partner Desks
          </h1>

          <p className="text-sm leading-6 text-slate-500 mt-1.5">
            Manage lender records and choose which institutions appear in the public directory.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-xl bg-brand-royal hover:brightness-95 text-white text-sm font-bold shadow-sm flex items-center space-x-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Empanel New Lender</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Empanelled Lenders
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">
            {list.length}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            PSU, Private & NBFCs
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Files Logged
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">
            {totalActiveFiles}
          </span>
          <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
            In processing across hubs
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Lenders
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-700 mt-2 block">
            {activeLenders}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            Currently available
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Inactive Lenders
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-[#18181B] mt-2 block">
            {list.length - activeLenders}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Not currently available
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

          <input
            type="text"
            placeholder="Search lender, bank name, relationship manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-royal/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Lenders" },
            { id: "PSU", label: "PSU Banks" },
            { id: "Private", label: "Private Banks" },
            { id: "NBFC", label: "Housing NBFCs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                categoryFilter === tab.id
                  ? "bg-brand-royal border-brand-royal text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lender Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] justify-items-center gap-5">
        {filteredBanks.map((bank) => {
          const bankId = bank._id || bank.id;

          return (
            <div
              key={bankId}
              className={`relative w-full ${filteredBanks.length === 1 ? "max-w-xl" : "max-w-none"} overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg sm:p-5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {bank.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-400 block">
                        {bank.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      String(bank.status).toLowerCase() === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {bank.status}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2.5 my-4 text-xs">
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Min. ROI
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {bank.minRoi || "—"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Max. LTV
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {bank.maxLtv || "—"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Sanction TAT
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {bank.tat || "—"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Active Files
                    </span>
                    <span className="text-xs font-extrabold text-[#DC2626]">
                      {bank.activeFiles ?? 0} In Pipeline
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  {(bank.supportingDocuments || []).length} supporting document(s)
                </div>

                {/* RM Contact */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Relationship Desk
                  </p>
                  <p className="mt-0.5 font-bold text-slate-900">
                    {bank.relationshipManager || "—"}
                  </p>
                  
                  <div className="text-right text-slate-600 font-medium">
                    <span className="break-all font-mono text-[11px]">
                      {bank.contactPhone || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Fee: {bank.processingFee || "—"}
                  </span>

                  {bank.contactPhone && (
                    <a
                      href={`tel:${bank.contactPhone}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#DC2626] hover:text-white text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call RM
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleEdit(bank)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleToggleStatus(bank)}
                    disabled={statusUpdatingId === bankId}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${
                      String(bank.status).toLowerCase() === "active"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {statusUpdatingId === bankId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    {String(bank.status).toLowerCase() === "active" ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => handleDelete(bank)}
                    disabled={deletingId === bankId}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold disabled:opacity-50"
                  >
                    {deletingId === bankId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredBanks.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-600">No lenders found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add a lender or change your search/filter.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-0 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                  {editingBank ? (
                    <Edit className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>

                <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-royal">Lender directory</p><h3 className="mt-0.5 font-extrabold text-lg text-slate-900">
                  {editingBank
                    ? "Edit Lender Details"
                    : "Empanel New Lender Partner"}
                </h3></div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-0 grid grid-cols-1 gap-4 p-5 sm:p-7 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Bank / NBFC Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter bank / NBFC name"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70 focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                  >
                    <option value="PSU Commercial Bank">
                      PSU Commercial Bank
                    </option>
                    <option value="Private Bank">Private Bank</option>
                    <option value="Premier AAA NBFC">Premier AAA NBFC</option>
                    <option value="Housing Finance Co (HFC)">
                      Housing Finance Co (HFC)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Base Interest ROI
                  </label>
                  <input
                    type="text"
                    name="minRoi"
                    value={formData.minRoi}
                    onChange={handleChange}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                  />
                </div>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 sm:p-5 space-y-4">
                <div><h4 className="text-sm font-bold text-slate-900">Public directory</h4><p className="mt-1 text-xs leading-5 text-slate-500">Active banks appear on the public website automatically. Inactive banks stay hidden. Publishing a listing does not imply an official partnership.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-bold text-slate-600">Institution type
                    <select name="institutionType" value={formData.institutionType} onChange={handleChange} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs">
                      <option value="Bank">Bank</option><option value="NBFC">NBFC</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-slate-600">Display order
                    <input type="number" min="0" name="displayOrder" value={formData.displayOrder} onChange={handleChange} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs" />
                  </label>
                </div>
                <label className="block text-[11px] font-bold text-slate-600">Official website URL (optional)
                  <input type="url" maxLength={500} name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://example.com" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs" />
                </label>
                <label className="block text-[11px] font-bold text-slate-600">Public description (optional)
                  <textarea maxLength={1500} name="publicDescription" value={formData.publicDescription} onChange={handleChange} rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs" placeholder="Enter approved public information about this institution." />
                </label>
                <fieldset className="rounded-xl border bg-white p-3">
                  <legend className="px-1 text-[11px] font-bold text-slate-600">Configured loan categories</legend>
                  <p className="mb-2 text-[10px] text-slate-500">Only active categories are available. Select these only when availability is approved for publication.</p>
                  <div className="grid gap-2 sm:grid-cols-2">{(loanCategories || []).filter((category) => category.status === "active").map((category) => { const id = String(category._id || category.id); const selected = formData.availableLoanCategories.includes(id); return <label key={id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected} onChange={(event) => setFormData((current) => ({ ...current, availableLoanCategories: event.target.checked ? [...current.availableLoanCategories, id] : current.availableLoanCategories.filter((value) => value !== id) }))} />{category.name}</label>; })}</div>
                  {!(loanCategories || []).some((category) => category.status === "active") && <p className="text-xs text-slate-500">No active loan categories are configured.</p>}
                </fieldset>
                <label className="block text-[11px] font-bold text-slate-600">Logo (PNG, JPEG or WebP, up to 2 MB)
                  <input type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    if (!file) return;
                    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
                      showToast("Choose a PNG, JPEG, or WebP logo no larger than 2 MB.", "error");
                      setLogoFile(null);
                      return;
                    }
                    setLogoFile(file);
                  }} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700" />
                </label>
                {(logoPreviewUrl || editingBank?.logoStorageKey) && <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  {logoPreviewUrl ? <img src={logoPreviewUrl} alt={`${formData.name || "Institution"} logo preview`} className="h-12 w-12 rounded-lg border bg-white object-contain p-1" /> : <SavedLogoPreview storageKey={editingBank?.logoStorageKey} alt={`${formData.name || "Institution"} logo preview`} />}
                  <p className="text-[11px] text-slate-500">{logoFile ? `Selected: ${logoFile.name}` : "Saved logo. Choose a replacement image to update it."}</p>
                </div>}
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600">Supporting documents (PDF, JPG, PNG or WebP; up to 5 MB each)
                    <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
                      if (files.length > 10 || files.some((file) => !allowed.has(file.type) || file.size > 5 * 1024 * 1024)) {
                        showToast("Choose up to 10 PDF, JPG, PNG or WebP files no larger than 5 MB each.", "error");
                        event.target.value = "";
                        setSupportingFiles([]);
                        return;
                      }
                      setSupportingFiles(files);
                    }} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700" />
                  </label>
                  {supportingFiles.length > 0 && <p className="text-[10px] text-slate-500">{supportingFiles.length} file(s) selected for upload.</p>}
                  {(editingBank?.supportingDocuments || []).length > 0 && <div className="space-y-2 border-t pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Uploaded documents</p>
                    {editingBank.supportingDocuments.map((item) => <div key={item.documentId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-slate-700">{item.name || item.fileName}</span>
                      <span className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => handleBankDocumentOpen(editingBank, item, "preview")} title="Preview" className="rounded border p-1 text-slate-600 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleBankDocumentOpen(editingBank, item, "download")} title="Download" className="rounded border p-1 text-slate-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleBankDocumentDelete(editingBank, item)} title="Remove" className="rounded border p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>)}
                  </div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Max LTV (%)
                  </label>
                  <input
                    type="text"
                    name="maxLtv"
                    value={formData.maxLtv}
                    onChange={handleChange}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Sanction TAT
                  </label>
                  <input
                    type="text"
                    name="tat"
                    value={formData.tat}
                    onChange={handleChange}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Processing Fee
                </label>
                <input
                  type="text"
                  name="processingFee"
                  value={formData.processingFee}
                  onChange={handleChange}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Relationship Manager Name
                </label>
                <input
                  type="text"
                  name="relationshipManager"
                  value={formData.relationshipManager}
                  onChange={handleChange}
                  placeholder="Enter relationship manager name"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="Enter contact phone"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                />
              </div>

              {editingBank && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Lender Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7 md:col-span-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving || documentsBusy}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || documentsBusy}
                  className="px-5 py-2.5 rounded-xl bg-brand-royal hover:brightness-95 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving || documentsBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingBank ? (
                    "Update Lender"
                  ) : (
                    "Save Partner"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
