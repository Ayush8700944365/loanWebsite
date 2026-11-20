import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Search,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  X,
  UploadCloud,
  Trash2,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  "Policy & Guidelines",
  "Rate Cards & Commissions",
  "Standard Operating Procedures",
  "KYC & Compliance",
  "Bank Specific Checklists",
];

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : parsed.toLocaleDateString("en-IN");
};

export const AdminGuidesPage = () => {
  const {
    guides = [],
    showToast,
    uploadGuide,
    downloadGuide,
    deleteGuide,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [previewGuide, setPreviewGuide] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    file: null,
  });

  const categories = ["ALL", ...CATEGORIES];

  const filteredGuides = guides.filter((guide) => {
    if (selectedCategory !== "ALL" && guide.category !== selectedCategory) {
      return false;
    }

    const query = searchTerm.trim().toLowerCase();

    if (query) {
      const title = (guide.title || "").toLowerCase();
      const description = (guide.description || "").toLowerCase();

      if (!title.includes(query) && !description.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const resetUploadForm = () => {
    setFormData({
      title: "",
      description: "",
      category: CATEGORIES[0],
      file: null,
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      showToast("Only PDF, DOC and DOCX files are allowed.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size must not exceed 10 MB.", "error");
      event.target.value = "";
      return;
    }

    setFormData((prev) => ({ ...prev, file }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      showToast("Please enter document title.", "error");
      return;
    }

    if (!formData.description.trim()) {
      showToast("Please enter document description.", "error");
      return;
    }

    if (!formData.file) {
      showToast("Please select a document.", "error");
      return;
    }

    if (typeof uploadGuide !== "function") {
      showToast("Upload integration is unavailable in AppContext.", "error");
      return;
    }

    const payload = new FormData();
    payload.append("title", formData.title.trim());
    payload.append("description", formData.description.trim());
    payload.append("category", formData.category);
    payload.append("file", formData.file);

    try {
      setUploading(true);
      await uploadGuide(payload);

      setShowUploadModal(false);
      resetUploadForm();
    } catch (error) {
      console.error("Guide upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (guide) => {
    if (typeof downloadGuide !== "function") {
      showToast("Download integration is unavailable.", "error");
      return;
    }

    try {
      setDownloadingId(guide._id || guide.id);
      await downloadGuide(guide);
    } catch (error) {
      console.error("Guide download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (guide) => {
    const guideId = guide._id || guide.id;

    if (!guideId || typeof deleteGuide !== "function") {
      showToast("Delete integration is unavailable.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${guide.title}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(guideId);
      await deleteGuide(guideId);

      if (previewGuide && (previewGuide._id || previewGuide.id) === guideId) {
        setPreviewGuide(null);
      }
    } catch (error) {
      console.error("Guide deletion failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Institutional Guides & Banking SOP Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official bank product circulars, DSA commission grids, appraisal
            checklists and legal templates.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document SOP</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search guides by title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
            />
          </div>

          <span className="text-xs font-bold text-slate-500">
            Available Guides:{" "}
            <strong className="text-slate-800">{filteredGuides.length}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map((guide) => {
          const guideId = guide._id || guide.id;

          return (
            <div
              key={guideId}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-premium transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="text-[10px] font-bold text-brand-royal uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    {guide.category}
                  </span>

                  <span className="text-[11px] font-mono text-slate-400">
                    {formatFileSize(guide.fileSize)}
                  </span>
                </div>

                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-red-100">
                    {(guide.fileName || "").split(".").pop()?.toUpperCase() ||
                      "FILE"}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-brand-navy leading-snug group-hover:text-brand-royal transition-colors">
                      {guide.title}
                    </h3>

                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Uploaded {formatDate(guide.createdAt)} •{" "}
                      {guide.downloadsCount || 0} downloads
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {guide.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{guide.badge || "Verified"}</span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewGuide(guide)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </button>

                  <button
                    onClick={() => handleDownload(guide)}
                    disabled={downloadingId === guideId}
                    className="px-3 py-1.5 rounded-lg bg-brand-royal hover:bg-brand-navy text-white text-xs font-semibold flex items-center space-x-1 transition-colors shadow-2xs disabled:opacity-60"
                  >
                    {downloadingId === guideId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => handleDelete(guide)}
                    disabled={deletingId === guideId}
                    title="Delete document"
                    className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === guideId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredGuides.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">
            No documents found
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Upload a new document or change your search/filter.
          </p>
        </div>
      )}

      {/* Actual Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-navy text-base">
                  Upload Document SOP
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a document to the central library.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (uploading) return;
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 pt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter document title"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe this document"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-royal"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Document (PDF, DOC, DOCX) *
                </label>

                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-brand-royal file:font-bold"
                />

                {formData.file && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Selected: {formData.file.name} (
                    {formatFileSize(formData.file.size)})
                  </p>
                )}

                <p className="text-[10px] text-slate-400 mt-1">
                  Maximum file size: 10 MB
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 bg-brand-royal text-white text-xs font-bold rounded-xl hover:bg-brand-navy flex items-center gap-2 disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Actual Document Preview */}
      {previewGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] p-5 shadow-2xl border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-brand-navy text-base truncate">
                  {previewGuide.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewGuide.fileName}
                </p>
              </div>

              <button
                onClick={() => setPreviewGuide(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-[350px] overflow-auto bg-slate-50 rounded-xl mt-4 flex items-center justify-center">
              {previewGuide.fileUrl &&
              (previewGuide.mimeType === "application/pdf" ||
                (previewGuide.fileName || "")
                  .toLowerCase()
                  .endsWith(".pdf")) ? (
                <iframe
                  title={previewGuide.title}
                  src={previewGuide.fileUrl}
                  className="w-full h-[65vh] rounded-xl"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-brand-royal mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">
                    {previewGuide.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-2">
                    Preview is not available for this file format. Use Download
                    to open the document.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => handleDownload(previewGuide)}
                className="px-4 py-2 bg-brand-royal text-white text-xs font-bold rounded-xl hover:bg-brand-navy flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download Document
              </button>

              <button
                onClick={() => setPreviewGuide(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
