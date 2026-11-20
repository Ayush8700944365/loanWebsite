import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { websiteContentApi } from "../../services/api";
import { Save, Plus, Trash2, Upload, UserRound } from "lucide-react";

const TeamPhotoPreview = ({ storageKey, name }) => {
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    if (!storageKey) { setImageUrl(""); return undefined; }
    let objectUrl;
    let cancelled = false;
    websiteContentApi.loadAdminAsset(storageKey)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setImageUrl(""); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [storageKey]);
  return imageUrl
    ? <img src={imageUrl} alt={`${name || "Team member"} photo preview`} className="h-16 w-16 rounded-full bg-white object-cover" />
    : <UserRound className="h-12 w-12 rounded-full bg-white p-3 text-slate-400" />;
};

export const AdminWebsiteCmsPage = () => {
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState("banners");

  const [heroContent, setHeroContent] = useState({
    bannerNotice: "",
    headline: "",
    subheadline: "",
  });

  const [aboutContent, setAboutContent] = useState({
    intro: "",
    mission: "",
    vision: "",
  });

  const [faqsList, setFaqsList] = useState([]);
  const [benefitsList, setBenefitsList] = useState([]);
  const [homepageGoals, setHomepageGoals] = useState({ customersReachedTarget: "", disbursementsTarget: "", disbursementAmountTarget: "", disbursementAmountUnit: "lakh" });
  const [teamList, setTeamList] = useState([]);
  const [uploadingMember, setUploadingMember] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch CMS content from MongoDB
  useEffect(() => {
    const fetchWebsiteContent = async () => {
      try {
        setIsLoading(true);

        const response = await websiteContentApi.get();
        const content = response?.content;

        if (content) {
          setHeroContent({
            bannerNotice: content.hero?.bannerNotice || "",
            headline: content.hero?.headline || "",
            subheadline: content.hero?.subheadline || "",
          });

          setAboutContent({
            intro: content.about?.intro || "",
            mission: content.about?.mission || "",
            vision: content.about?.vision || "",
          });

          setFaqsList(Array.isArray(content.faqs) ? content.faqs : []);
          setBenefitsList(Array.isArray(content.benefits) ? content.benefits : []);
          setHomepageGoals({
            customersReachedTarget: content.homepageGoals?.customersReachedTarget ?? "",
            disbursementsTarget: content.homepageGoals?.disbursementsTarget ?? "",
            disbursementAmountTarget: content.homepageGoals?.disbursementAmountTarget ?? "",
            disbursementAmountUnit: content.homepageGoals?.disbursementAmountUnit || "lakh",
          });
          setTeamList(Array.isArray(content.team) ? content.team : []);
        }
      } catch (error) {
        console.error("Website CMS fetch error:", error);
        showToast(error.message || "Failed to load website content", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsiteContent();
  }, []);

  // Save CMS content to MongoDB
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    try {
      setIsSaving(true);

      const payload = {
        hero: heroContent,
        about: aboutContent,
        faqs: faqsList,
        benefits: benefitsList,
        homepageGoals,
        team: teamList.map((member, displayOrder) => ({ ...member, displayOrder })),
      };

      const response = await websiteContentApi.update(payload);

      if (response?.content) {
        const savedContent = response.content;

        setHeroContent({
          bannerNotice: savedContent.hero?.bannerNotice || "",
          headline: savedContent.hero?.headline || "",
          subheadline: savedContent.hero?.subheadline || "",
        });

        setAboutContent({
          intro: savedContent.about?.intro || "",
          mission: savedContent.about?.mission || "",
          vision: savedContent.about?.vision || "",
        });

        setFaqsList(Array.isArray(savedContent.faqs) ? savedContent.faqs : []);
        setBenefitsList(Array.isArray(savedContent.benefits) ? savedContent.benefits : []);
        setHomepageGoals({
          customersReachedTarget: savedContent.homepageGoals?.customersReachedTarget ?? "",
          disbursementsTarget: savedContent.homepageGoals?.disbursementsTarget ?? "",
          disbursementAmountTarget: savedContent.homepageGoals?.disbursementAmountTarget ?? "",
          disbursementAmountUnit: savedContent.homepageGoals?.disbursementAmountUnit || "lakh",
        });
        setTeamList(Array.isArray(savedContent.team) ? savedContent.team : []);
      }

      showToast(
        response?.message || "Website content saved successfully!",
        "success",
      );
    } catch (error) {
      console.error("Website CMS save error:", error);
      showToast(error.message || "Failed to save website content", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const updateFaq = (index, field, value) => {
    setFaqsList((previousFaqs) =>
      previousFaqs.map((faq, i) =>
        i === index ? { ...faq, [field]: value } : faq,
      ),
    );
  };

  const updateListItem = (setter, index, field, value) => setter((items) => items.map((item, current) => current === index ? { ...item, [field]: value } : item));

  const uploadTeamPhoto = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      setUploadingMember(index);
      const response = await websiteContentApi.uploadTeamPhoto(formData);
      if (!response?.success || !response.photoStorageKey) throw new Error(response?.message || "Photo upload failed.");
      setTeamList((members) => members.map((member, current) => current === index ? { ...member, photoStorageKey: response.photoStorageKey } : member));
      showToast("Photo uploaded. Save team to publish the profile.", "success");
    } catch (error) {
      showToast(error.message || "Unable to upload profile photo.", "error");
    } finally {
      setUploadingMember(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-sm font-semibold text-slate-500">
        Loading website content...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Website Content Management (CMS)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Edit consumer-facing headline copy, promotional rate banners,
            mission statements and FAQs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy disabled:opacity-60 text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Publishing..." : "Publish to Public Site"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab("banners")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "banners"
              ? "bg-brand-navy text-white shadow-xs"
              : "hover:text-slate-900"
          }`}
        >
          Hero & Banners
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "content"
              ? "bg-brand-navy text-white shadow-xs"
              : "hover:text-slate-900"
          }`}
        >
          About & Mission
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === "faqs"
              ? "bg-brand-navy text-white shadow-xs"
              : "hover:text-slate-900"
          }`}
        >
          FAQs Content
        </button>
        <button type="button" onClick={() => setActiveTab("benefits")} className={`flex-1 min-w-24 py-2 rounded-xl transition-all ${activeTab === "benefits" ? "bg-brand-navy text-white shadow-xs" : "hover:text-slate-900"}`}>Benefits</button>
        <button type="button" onClick={() => setActiveTab("goals")} className={`flex-1 min-w-24 py-2 rounded-xl transition-all ${activeTab === "goals" ? "bg-brand-navy text-white shadow-xs" : "hover:text-slate-900"}`}>Stats &amp; Goals</button>
        <button type="button" onClick={() => setActiveTab("team")} className={`flex-1 min-w-24 py-2 rounded-xl transition-all ${activeTab === "team" ? "bg-brand-navy text-white shadow-xs" : "hover:text-slate-900"}`}>Our Team</button>
      </div>

      {/* Tab 1: Hero & Banners */}
      {activeTab === "banners" && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 text-xs"
        >
          <h3 className="text-base font-extrabold text-brand-navy">
            Homepage Hero & Promotional Alerts
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Top Announcement Ribbon
            </label>
            <input
              type="text"
              value={heroContent.bannerNotice}
              onChange={(e) =>
                setHeroContent({
                  ...heroContent,
                  bannerNotice: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 font-semibold text-brand-navy"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Primary Hero Headline
            </label>
            <input
              type="text"
              value={heroContent.headline}
              onChange={(e) =>
                setHeroContent({
                  ...heroContent,
                  headline: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 font-extrabold text-brand-navy"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Supporting Sub-headline Text
            </label>
            <textarea
              rows="3"
              value={heroContent.subheadline}
              onChange={(e) =>
                setHeroContent({
                  ...heroContent,
                  subheadline: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl p-3 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-royal text-white font-bold rounded-xl shadow-xs hover:bg-brand-navy disabled:opacity-60 transition-colors"
          >
            {isSaving ? "Saving..." : "Update Hero Section"}
          </button>
        </form>
      )}

      {/* Tab 2: About & Mission */}
      {activeTab === "content" && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 text-xs"
        >
          <h3 className="text-base font-extrabold text-brand-navy">
            Corporate Story & Vision
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Company Intro Tagline
            </label>
            <input
              type="text"
              value={aboutContent.intro}
              onChange={(e) =>
                setAboutContent({
                  ...aboutContent,
                  intro: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Official Mission Statement
            </label>
            <textarea
              rows="3"
              value={aboutContent.mission}
              onChange={(e) =>
                setAboutContent({
                  ...aboutContent,
                  mission: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl p-3 leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              2030 Corporate Vision
            </label>
            <textarea
              rows="3"
              value={aboutContent.vision}
              onChange={(e) =>
                setAboutContent({
                  ...aboutContent,
                  vision: e.target.value,
                })
              }
              className="w-full text-sm border border-slate-300 rounded-xl p-3 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-royal text-white font-bold rounded-xl shadow-xs hover:bg-brand-navy disabled:opacity-60 transition-colors"
          >
            {isSaving ? "Saving..." : "Update Corporate Content"}
          </button>
        </form>
      )}

      {/* Tab 3: FAQs */}
      {activeTab === "faqs" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-brand-navy">
              Frequently Asked Questions
            </h3>

            <button
              type="button"
              onClick={() => {
                setFaqsList((previousFaqs) => [
                  ...previousFaqs,
                  {
                    question: "",
                    answer: "",
                  },
                ]);

                showToast("New FAQ draft added", "info");
              }}
              className="px-3 py-1.5 bg-blue-50 text-brand-royal font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {faqsList.map((faq, i) => (
              <div
                key={faq._id || i}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
              >
                <input
                  type="text"
                  placeholder="Enter question"
                  value={faq.question || ""}
                  onChange={(e) => updateFaq(i, "question", e.target.value)}
                  className="w-full font-bold text-sm text-brand-navy border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />

                <textarea
                  rows="2"
                  placeholder="Enter answer"
                  value={faq.answer || ""}
                  onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-300 rounded-xl p-2.5 bg-white"
                />
              </div>
            ))}

            {faqsList.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">
                No FAQs available. Click Add FAQ Item to create one.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-royal text-white font-bold rounded-xl shadow-xs hover:bg-brand-navy disabled:opacity-60 transition-colors"
          >
            {isSaving ? "Saving..." : "Save FAQs"}
          </button>
        </div>
      )}

      {activeTab === "benefits" && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div>
            <h3 className="text-base font-extrabold text-brand-navy">Homepage benefits</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Only publish claims that have been reviewed and confirmed by the business owner. This section is empty until you add approved content.</p>
          </div>
          {benefitsList.map((benefit, index) => (
            <div key={benefit._id || index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_auto]">
              <label className="text-xs font-semibold text-slate-600">Title<input maxLength={100} value={benefit.title || ""} onChange={(event) => updateListItem(setBenefitsList, index, "title", event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>
              <label className="text-xs font-semibold text-slate-600">Description<textarea maxLength={500} rows={2} value={benefit.description || ""} onChange={(event) => updateListItem(setBenefitsList, index, "description", event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>
              <button type="button" aria-label="Remove benefit" onClick={() => { if (window.confirm("Remove this benefit from the draft?")) setBenefitsList((items) => items.filter((_, current) => current !== index)); }} className="self-end rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {benefitsList.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No approved benefits have been added.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setBenefitsList((items) => [...items, { title: "", description: "", displayOrder: items.length }])} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-brand-royal"><Plus className="h-4 w-4" />Add benefit</button>
            <button type="button" onClick={handleSave} disabled={isSaving} className="rounded-xl bg-brand-royal px-5 py-2 text-xs font-bold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save benefits"}</button>
          </div>
        </section>
      )}

      {activeTab === "goals" && (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div>
            <h3 className="text-base font-extrabold text-brand-navy">Homepage growth goals</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Set public targets for your team. These appear as goals and are kept separate from actual customer enquiries and confirmed disbursements.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Customer reach goal<input type="text" inputMode="numeric" maxLength={10} value={homepageGoals.customersReachedTarget} onChange={(event) => setHomepageGoals((goals) => ({ ...goals, customersReachedTarget: event.target.value.replace(/\D/g, "") }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" placeholder="Type customer goal" /></label>
            <label className="text-xs font-semibold text-slate-600">Disbursement count goal<input type="text" inputMode="numeric" maxLength={10} value={homepageGoals.disbursementsTarget} onChange={(event) => setHomepageGoals((goals) => ({ ...goals, disbursementsTarget: event.target.value.replace(/\D/g, "") }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" placeholder="Type disbursement count" /></label>
            <div className="text-xs font-semibold text-slate-600">Disbursement amount goal<div className="mt-1 flex gap-2"><input type="text" inputMode="decimal" maxLength={12} value={homepageGoals.disbursementAmountTarget} onChange={(event) => setHomepageGoals((goals) => ({ ...goals, disbursementAmountTarget: event.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1") }))} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2" placeholder="e.g. 2.5" /><select aria-label="Disbursement amount unit" value={homepageGoals.disbursementAmountUnit} onChange={(event) => setHomepageGoals((goals) => ({ ...goals, disbursementAmountUnit: event.target.value }))} className="rounded-lg border bg-white px-3 py-2"><option value="lakh">Lakh</option><option value="crore">Crore</option></select></div></div>
          </div>
          <button type="button" onClick={handleSave} disabled={isSaving} className="rounded-xl bg-brand-royal px-5 py-2 text-xs font-bold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save goals"}</button>
        </section>
      )}

      {activeTab === "team" && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div>
            <h3 className="text-base font-extrabold text-brand-navy">Our Team</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Only add real team members and owner-approved biographies. Profiles appear in the order listed; new members stay off the public site until Active is checked.</p>
          </div>
          {teamList.map((member, index) => (
            <div key={member._id || index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[100px_1fr_1fr_100px]">
              <div className="flex flex-col items-center gap-2">
                <TeamPhotoPreview storageKey={member.photoStorageKey} name={member.name} />
                <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-brand-royal">
                  <Upload className="h-3.5 w-3.5" />{uploadingMember === index ? "Uploading" : "Photo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp" disabled={uploadingMember === index} onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
                      showToast("Choose a PNG, JPEG, or WebP photo no larger than 2 MB.", "error");
                      return;
                    }
                    uploadTeamPhoto(index, file);
                  }} className="sr-only" />
                </label>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Name<input required maxLength={100} value={member.name || ""} onChange={(event) => updateListItem(setTeamList, index, "name", event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>
                <label className="block text-xs font-semibold text-slate-600">Designation<input required maxLength={100} value={member.designation || ""} onChange={(event) => updateListItem(setTeamList, index, "designation", event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>
              </div>
              <label className="text-xs font-semibold text-slate-600">Short biography<textarea maxLength={1000} rows={3} value={member.biography || ""} onChange={(event) => updateListItem(setTeamList, index, "biography", event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>
              <div className="flex items-end gap-2">
                <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700"><input type="checkbox" checked={member.active === true} onChange={(event) => updateListItem(setTeamList, index, "active", event.target.checked)} />Active</label>
                <button type="button" aria-label="Delete team member" onClick={() => { if (window.confirm("Remove this team member from the draft?")) setTeamList((items) => items.filter((_, current) => current !== index)); }} className="mb-1 rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {teamList.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No team members have been published.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setTeamList((members) => [...members, { name: "", designation: "", biography: "", photoStorageKey: "", displayOrder: members.length, active: false }])} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-brand-royal"><Plus className="h-4 w-4" />Add team member</button>
            <button type="button" onClick={handleSave} disabled={isSaving || uploadingMember !== null} className="rounded-xl bg-brand-royal px-5 py-2 text-xs font-bold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save team"}</button>
          </div>
        </section>
      )}
    </div>
  );
};
