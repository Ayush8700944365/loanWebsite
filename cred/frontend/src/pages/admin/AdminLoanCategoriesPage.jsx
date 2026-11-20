import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { loanCategoriesApi, websiteContentApi } from "../../services/api";
import { Plus, CheckCircle2, X, Trash2, Edit } from "lucide-react";

export const AdminLoanCategoriesPage = () => {
  const {
    loanCategories,
    addLoanCategory,
    updateLoanCategory,
    deleteLoanCategory,
    showToast,
    apiLoading,
    refreshFromApi,
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [editingCategoryImage, setEditingCategoryImage] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);

  const initialForm = {
    name: "",
    slug: "",
    tagline: "",
    minInterest: "",
    maxTenure: "",
    maxAmount: "",
    processingTime: "",
    description: "",
    eligibility: "",
    icon: "",
    benefits: "",
    documentRequirements: "[]",
  };

  const [newCategory, setNewCategory] = useState({ ...initialForm });

  const parseRequirements = (raw) => {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item.documentType !== "string" || !item.documentType.trim() || (item.employmentTypes && (!Array.isArray(item.employmentTypes) || item.employmentTypes.some((type) => typeof type !== "string"))))) {
      throw new Error("Use an array of documentType and employmentTypes entries.");
    }
    return parsed.map((item) => ({ documentType: item.documentType.trim(), employmentTypes: (item.employmentTypes || []).map((type) => type.trim()).filter(Boolean) }));
  };

  const requirementsFor = (raw) => {
    // The editor must display incomplete rows while a document name is being typed.
    // Keep strict validation for save, but only require valid JSON/array shape here.
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
    } catch { return []; }
  };

  const changeRequirements = (changeHandler, requirements) => changeHandler({ target: { name: "documentRequirements", value: JSON.stringify(requirements) } });

  // Common input handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setNewCategory((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "name" && !prev.slug
        ? {
            slug: value
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          }
        : {}),
    }));
  };

  // CREATE CATEGORY
  const handleAddCategory = async (e) => {
    e.preventDefault();

    if (!newCategory.name.trim() || !newCategory.slug.trim()) {
      showToast("Category name and slug are required.", "error");
      return;
    }

    let categoryPayload;
    try {
      categoryPayload = {
        ...newCategory,
        documentRequirements: parseRequirements(newCategory.documentRequirements),
        benefits: newCategory.benefits.split(",").map((item) => item.trim()).filter(Boolean),
      };
    } catch {
      showToast("Document requirements must be valid JSON with documentType and employmentTypes fields.", "error");
      return;
    }
    if (!categoryPayload.documentRequirements.length) {
      showToast("Add at least one required document before creating a loan category.", "error");
      return;
    }

    try {
      setSaving(true);
      const createdCategory = await addLoanCategory(categoryPayload);
      if (newCategoryImage) {
        const formData = new FormData();
        formData.append("image", newCategoryImage);
        setImageBusy(true);
        try { await loanCategoriesApi.uploadImage(createdCategory._id || createdCategory.id, formData); }
        catch (imageError) { throw new Error(`Category was created, but its image upload failed: ${imageError.message}`); }
        finally { setImageBusy(false); }
        await refreshFromApi();
      }

      setNewCategoryImage(null);
      setNewCategory({ ...initialForm });
      setShowAddForm(false);
    } catch (error) {
      showToast(error.message || "Create category failed.", "error");
      console.error("Create category error:", error);
    } finally {
      setSaving(false);
    }
  };

  // UPDATE INTEREST RATE
  const handleUpdate = async (id, newInterest) => {
    try {
      await updateLoanCategory(id, {
        minInterest: newInterest.trim(),
      });
    } catch (error) {
      console.error("Interest rate update failed:", error);
    }
  };

  // OPEN EDIT FORM
  const handleEditClick = (category) => {
    setEditingCategoryImage(null);
    setEditingCategory({
      ...category,
      documentRequirements: JSON.stringify(category.documentRequirements || [], null, 2),
      benefits: Array.isArray(category.benefits)
        ? category.benefits.join(", ")
        : "",
    });

    setShowEditForm(true);
    setShowAddForm(false);
  };

  // EDIT INPUT HANDLER
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingCategory((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // SAVE EDITED CATEGORY
  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editingCategory?.name?.trim() || !editingCategory?.slug?.trim()) {
      showToast("Category name and slug are required.", "error");
      return;
    }

    const categoryId = editingCategory._id || editingCategory.id;

    try {
      setUpdating(true);

      const { _id, id, createdAt, updatedAt, __v, ...formData } =
        editingCategory;

      await updateLoanCategory(categoryId, {
        ...formData,
        documentRequirements: parseRequirements(formData.documentRequirements),
        benefits: formData.benefits
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      if (editingCategoryImage) {
        const imageForm = new FormData();
        imageForm.append("image", editingCategoryImage);
        setImageBusy(true);
        try { await loanCategoriesApi.uploadImage(categoryId, imageForm); }
        catch (imageError) { throw new Error(`Category details were saved, but the image upload failed: ${imageError.message}`); }
        finally { setImageBusy(false); }
      }
      await refreshFromApi();
      setEditingCategoryImage(null);
      setShowEditForm(false);
      setEditingCategory(null);
    } catch (error) {
      showToast(error instanceof SyntaxError ? "Document requirements JSON is invalid." : error.message || "Category update failed.", "error");
      console.error("Category update failed:", error);
    } finally {
      setUpdating(false);
    }
  };

  // DELETE CATEGORY
  const handleDeleteCategory = async (category) => {
    const categoryId = category._id || category.id;

    if (!categoryId) {
      showToast("Category ID is missing.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${category.name}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(categoryId);
      await deleteLoanCategory(categoryId);
    } catch (error) {
      console.error("Delete category error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const renderImageUpload = (category, selectedFile, setSelectedFile) => (
    <div className="rounded-xl border border-dashed border-slate-300 p-4">
      <label className="block text-xs font-bold text-slate-600 mb-2">Category image (PNG, JPEG or WebP; max 2 MB)</label>
      <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => {
        const file = event.target.files?.[0] || null;
        if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
          showToast("Choose a PNG, JPEG or WebP image no larger than 2 MB.", "error");
          event.target.value = "";
          setSelectedFile(null);
          return;
        }
        setSelectedFile(file);
      }} className="block w-full text-xs" />
      {selectedFile && <p className="mt-2 text-xs text-slate-600">Selected: {selectedFile.name}</p>}
      {!selectedFile && category?.imageStorageKey && <div className="mt-3 flex items-center gap-3">
        <img src={websiteContentApi.assetUrl(category.imageStorageKey)} alt={`${category.name} category`} className="h-16 w-24 rounded-lg border object-cover" />
        <span className="text-xs text-slate-500">Current image</span>
      </div>}
      {category?.imageStorageKey && <button type="button" disabled={imageBusy} onClick={async () => {
        const id = category._id || category.id;
        try { setImageBusy(true); await loanCategoriesApi.deleteImage(id); await refreshFromApi(); setEditingCategory((prev) => prev ? { ...prev, imageStorageKey: "" } : prev); showToast("Category image removed.", "success"); }
        catch (error) { showToast(error.message || "Unable to remove category image.", "error"); }
        finally { setImageBusy(false); }
      }} className="mt-2 text-xs font-semibold text-red-600 disabled:opacity-50">Remove current image</button>}
    </div>
  );

  // Reusable form fields
  const renderFields = (formData, changeHandler) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["name", "Category Name"],
          ["slug", "Category Slug"],
          ["tagline", "Tagline"],
          ["minInterest", "Base Interest Rate"],
          ["maxTenure", "Maximum Tenure"],
          ["maxAmount", "Maximum Facility"],
          ["processingTime", "Processing Time"],
          ["icon", "Icon Name"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {label}
            </label>

            <input
              name={name}
              value={formData[name] || ""}
              onChange={changeHandler}
              placeholder={`Enter ${label.toLowerCase()}`}
              required={["name", "slug"].includes(name)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-royal"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description || ""}
          onChange={changeHandler}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-royal"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          Eligibility
        </label>
        <textarea
          name="eligibility"
          value={formData.eligibility || ""}
          onChange={changeHandler}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-royal"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          Benefits (separate with commas)
        </label>
        <textarea
          name="benefits"
          value={formData.benefits || ""}
          onChange={changeHandler}
          rows={2}
          placeholder="Flexible tenure, Quick approval"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-royal"
        />
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4" aria-label="Required document policy">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-900">Required document policy</h3><p className="mt-1 text-xs text-slate-600">These documents must be approved before an employee can verify a lead and assign it to a partner.</p></div><button type="button" onClick={() => changeRequirements(changeHandler, [...requirementsFor(formData.documentRequirements), { documentType: "", employmentTypes: [] }])} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800">Add document</button></div>
        {requirementsFor(formData.documentRequirements).length === 0 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">No requirements configured. Leads in this category cannot be verified until an Admin adds at least one approved document requirement.</p>}
        <div className="mt-3 space-y-2">{requirementsFor(formData.documentRequirements).map((requirement, index) => {
          const requirements = requirementsFor(formData.documentRequirements);
          const update = (field, value) => { const next = [...requirements]; next[index] = { ...next[index], [field]: value }; changeRequirements(changeHandler, next); };
          return <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-[11px] font-bold text-slate-600">Required document<input value={requirement.documentType || ""} maxLength={80} onChange={(event) => update("documentType", event.target.value)} placeholder="e.g. PAN" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-[11px] font-bold text-slate-600">Employment types (comma separated)<input value={(requirement.employmentTypes || []).join(", ")} onChange={(event) => update("employmentTypes", event.target.value.split(",").map((value) => value.trim()))} placeholder="Salaried, Self-employed (blank = all)" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            <button type="button" onClick={() => changeRequirements(changeHandler, requirements.filter((_, itemIndex) => itemIndex !== index))} className="self-end rounded-lg px-3 py-2 text-xs font-bold text-rose-700">Remove</button>
          </div>;
        })}</div>
      </section>
    </>
  );

  return (
    <div className="space-y-7 pb-12">
      {/* TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-royal">Catalog management</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Loan Category & Scheme Configurations
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage interest rate benchmarks, maximum tenures, LTV policies and
            customer marketing tags.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(true);
            setShowEditForm(false);
          }}
          className="px-5 py-3 rounded-xl bg-brand-royal hover:brightness-95 text-white text-sm font-bold shadow-sm flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan Category</span>
        </button>
      </div>

      {/* ADD FORM */}
      {showAddForm && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-extrabold text-brand-navy">
              Add New Loan Category
            </h2>

            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-4">
            {renderFields(newCategory, handleFormChange)}
            {renderImageUpload(null, newCategoryImage, setNewCategoryImage)}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategory({ ...initialForm });
                  setNewCategoryImage(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || imageBusy}
                className="px-5 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold disabled:opacity-50"
              >
                {saving || imageBusy ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT FORM */}
      {showEditForm && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-category-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-brand-royal"><Edit className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-royal">Category settings</p><h2 id="edit-category-title" className="truncate text-lg font-extrabold text-slate-900">Edit {editingCategory.name || "loan category"}</h2></div>
              </div>
              <button type="button" aria-label="Close edit category dialog" onClick={() => { setShowEditForm(false); setEditingCategory(null); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </header>

            <form onSubmit={handleSaveEdit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                {renderFields(editingCategory, handleEditChange)}
                {renderImageUpload(editingCategory, editingCategoryImage, setEditingCategoryImage)}
                <div className="max-w-sm">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Category Status</label>
                  <select name="status" value={editingCategory.status || "active"} onChange={handleEditChange} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70">
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
                <button type="button" onClick={() => { setShowEditForm(false); setEditingCategory(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={updating || imageBusy} className="rounded-xl bg-brand-royal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50">{updating || imageBusy ? "Saving..." : "Update Category"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* CATEGORY GRID */}
      {apiLoading && loanCategories.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500">
          Loading loan categories...
        </div>
      ) : loanCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
          <p className="font-bold text-brand-navy">No loan categories found</p>
          <p className="text-xs text-slate-500 mt-2">
            Add a category to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start gap-5">
          {loanCategories.map((cat) => {
            const categoryId = cat._id || cat.id;

            return (
              <div
                key={categoryId}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-brand-royal bg-blue-50 px-2.5 py-1 rounded-full">
                      {cat.slug}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        cat.status === "inactive"
                          ? "text-red-700 bg-red-50"
                          : "text-emerald-700 bg-emerald-50"
                      }`}
                    >
                      {cat.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-brand-navy">
                    {cat.name}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium mb-3">
                    {cat.tagline}
                  </p>

                  <p className={`mb-3 rounded-lg px-3 py-2 text-[11px] font-semibold ${(cat.documentRequirements || []).length ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {(cat.documentRequirements || []).length ? `${cat.documentRequirements.length} document requirement${cat.documentRequirements.length === 1 ? "" : "s"} configured` : "No document policy · leads cannot be verified"}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Base Interest Rate
                      </span>

                      <input
                        type="text"
                        defaultValue={cat.minInterest || ""}
                        placeholder="Not set"
                        onBlur={(e) => {
                          if (e.target.value !== (cat.minInterest || "")) {
                            handleUpdate(categoryId, e.target.value);
                          }
                        }}
                        className="w-full bg-transparent text-sm font-extrabold text-brand-navy placeholder:font-medium placeholder:text-slate-400 focus:outline-hidden focus:text-brand-royal"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Max Tenure
                      </span>
                      <span className="font-bold text-sm text-slate-800">
                        {cat.maxTenure || "Not set"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Max Facility
                      </span>
                      <span className="font-bold text-sm text-slate-800">
                        {cat.maxAmount || "Not set"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Sanction Speed
                      </span>
                      <span className="font-bold text-sm text-emerald-600">
                        {cat.processingTime || "Not set"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {(cat.benefits || []).map((benefit, index) => (
                      <div key={index} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <span className="text-[10px] text-slate-400">
                    Syncs to public calculator
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEditClick(cat)}
                      className="flex items-center gap-1.5 text-brand-royal hover:text-brand-navy font-bold"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      disabled={deletingId === categoryId}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-bold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === categoryId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
