import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Banknote, Check, CheckCircle2, ChevronDown,
  Clock3, FileCheck2, FileText, Landmark, MessageCircle, Percent,
  ShieldCheck as ShieldIcon, Users,
} from "lucide-react";
import { EnquiryForm } from "../../components/forms/EnquiryForm";
import { banksApi, publicLoanCategoriesApi, websiteContentApi } from "../../services/api";
import { calculateEligibleLoanAmount } from "../../components/common/LoanEligibilityChecker";
import { CountUp, DrawLine, FadeUp, StaggerContainer, StaggerItem, HOME_EASE } from "../../components/motion/HomeMotion";
import {
  BriefcaseIcon, BuildingIcon, CarIcon, CoinStack, GradCap,
  GrowthChart, HomeIcon,
} from "../../components/illustrations/HomeIllustrations";
import { HomeLoanScene } from "../../components/illustrations/HomeLoanScenes";
import { HomeBankOfficeScene } from "../../components/illustrations/HomeBankOfficeScene";
import { LoanDocumentsScene } from "../../components/illustrations/LoanDocumentsScene";
import { HomeLoanCityScene } from "../../components/illustrations/HomeLoanCityScene";
import "./HomePage.css";

const HomeEmiSection = lazy(() => import("./HomeEmiSection"));

const FALLBACK_HERO = {
  bannerNotice: "A clearer route to the right loan",
  headline: "Loan options with clearer next steps.",
  subheadline: "Explore published loan categories, share your requirements, and get help understanding the application process.",
};

const FAQS = [
  { question: "Who can apply for a loan through REALCRED?", answer: "Eligibility depends on the loan type, income, age, credit history, existing obligations, and lender policy. Salaried applicants, professionals, and business owners can enquire; the lender makes the final credit decision." },
  { question: "What documents should I keep ready?", answer: "Most applications need PAN and identity/address proof. Salaried applicants are commonly asked for recent payslips, bank statements, and Form 16 or ITR. Self-employed applicants may need business proof, GST returns, and financial statements. Property loans also need property papers." },
  { question: "What CIBIL score is needed?", answer: "There is no single score accepted by every lender. A stronger repayment history and credit score can improve the options available, but lenders also assess income, existing EMIs, and the loan purpose." },
  { question: "How long does loan processing take?", answer: "Timelines vary by lender, product, document readiness, property checks, and verification. Some cases move in a few working days; complex or secured loans can take longer. Any estimate is indicative, not a sanction commitment." },
  { question: "Are there prepayment or foreclosure charges?", answer: "Charges depend on the lender, loan agreement, rate type, borrower type, and applicable rules. Review the lender's Key Facts Statement and sanction terms before accepting or repaying early." },
  { question: "What fees should I expect?", answer: "Processing, legal, valuation, documentation, insurance, and other charges may apply depending on the lender and product. Ask for a written fee schedule and Key Facts Statement before proceeding." },
  { question: "What is the difference between fixed and floating interest?", answer: "A fixed rate is set for the period stated in your agreement. A floating rate can change with its benchmark and lender reset terms, which may change the EMI or loan tenure." },
  { question: "Can I apply with a co-applicant?", answer: "Many lenders allow co-applicants, especially for home loans. Their income and credit profile may be considered, and they will share repayment responsibility under the loan agreement." },
  { question: "Does checking eligibility affect my credit score?", answer: "The estimate on this page is an indicative calculation and does not request a credit bureau enquiry. A lender may make a bureau enquiry later with your consent as part of an application." },
  { question: "Is a loan guaranteed after I submit an enquiry?", answer: "No. An enquiry is only a request for guidance. Approval, final rate, amount, and disbursal are decided by the lender after verification and underwriting." },
];

const FILTERS = ["All", "Property", "Personal", "Business", "Vehicle & Education"];
const HERO_LOAN_ICONS = [HomeIcon, CoinStack, BriefcaseIcon, CarIcon, GradCap];
const knownBankLogo = (name) => {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("hdfc")) return "/media/banks/hdfc-bank-logo.svg";
  if (normalized.includes("kotak")) return "/media/banks/kotak-bank-logo.svg";
  if (normalized.includes("icici")) return "/media/banks/icici-bank-logo.png";
  if (normalized.includes("axis")) return "/media/banks/axis-bank-logo.svg";
  if (normalized.includes("state bank") || normalized === "sbi") return "/media/banks/sbi-logo.png";
  return "";
};
const institutionLogoUrl = (institution) => (institution.logoStorageKey ? banksApi.publicLogoUrl(institution.logoStorageKey, institution._id) : knownBankLogo(institution.name));

function LoanCategoryVisual({ product }) {
  const [failed, setFailed] = useState(false);
  if (product.imageUrl && !failed) return <img className="home-category-image" src={product.imageUrl} alt={`${product.name} category`} loading="lazy" onError={() => setFailed(true)} />;
  return <HomeLoanScene type={product.id} />;
}

function PublicAssetImage({ src, alt, fallback, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={className} role="img" aria-label={alt}>{fallback}</span>;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function PublicTeamPhoto({ storageKey, name }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!storageKey) { setSrc(""); return undefined; }
    let cancelled = false;
    let objectUrl = "";
    websiteContentApi.loadPublicAsset(storageKey).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => { if (!cancelled) setSrc(""); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [storageKey]);
  const initials = String(name || "?").trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return src
    ? <img className="home-team-photo" src={src} alt={name} loading="lazy" />
    : <span className="home-team-photo home-team-photo-fallback" role="img" aria-label={`${name} photo`}>{initials}</span>;
}

const SectionHeading = ({ kicker, title, body, align = "left" }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`home-section-heading home-section-heading--${align}`}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: .25 }}
      transition={{ duration: .55, ease: HOME_EASE }}
    >
      {kicker && <p className="home-kicker">{kicker}</p>}
      <h2>{title}</h2>
      {body && <p className="home-section-copy">{body}</p>}
    </motion.div>
  );
};

function SeoMetadata() {
  useEffect(() => {
    const oldTitle = document.title;
    const tags = [
      ["name", "description", "Explore home, personal and business loans with REALCRED. Compare lender options, estimate EMIs and get guided application support."],
      ["property", "og:title", "REALCRED | Loan guidance for your next step"],
      ["property", "og:description", "Compare loan options, estimate repayments and get help through your application."],
      ["property", "og:type", "website"],
    ];
    const previous = tags.map(([key, name]) => {
      const element = document.querySelector(`meta[${key}="${name}"]`);
      return { element, content: element?.getAttribute("content") };
    });
    const created = [];
    tags.forEach(([key, name, content], index) => {
      let element = previous[index].element;
      if (!element) { element = document.createElement("meta"); element.setAttribute(key, name); document.head.appendChild(element); created.push(element); }
      element.setAttribute("content", content);
    });
    document.title = "REALCRED | Loan guidance for your next step";
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.realcredHomeSchema = "true";
    schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": ["Organization", "FinancialService"], name: "REALCRED", description: "Loan application guidance and customer support." });
    document.head.appendChild(schema);
    return () => {
      document.title = oldTitle;
      previous.forEach(({ element, content }) => { if (element && content !== null) element.setAttribute("content", content); });
      created.forEach((element) => element.remove());
      schema.remove();
    };
  }, []);
  return null;
}

function HeroJourneyPanel({ reduceMotion }) {
  const stages = ["Enquire", "Prepare", "Compare", "Apply"];
  return (
    <motion.div
      className="home-hero-journey"
      aria-hidden="true"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: [0, -4, 0] }}
      transition={reduceMotion ? undefined : { opacity: { duration: .55, delay: .25 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: .8 } }}
    >
      <div className="home-hero-journey-head"><span><i /> LOAN JOURNEY</span><strong>4 clear stages</strong></div>
      <div className="home-hero-journey-stages">
        {stages.map((stage, index) => <span className={index === 0 ? "is-current" : ""} key={stage}><i>{String(index + 1).padStart(2, "0")}</i>{stage}</span>)}
      </div>
      <div className="home-hero-journey-foot"><span>One guided route</span><span>From enquiry to lender review <ArrowRight size={12} /></span></div>
    </motion.div>
  );
}

function EligibilityTeaser() {
  const [income, setIncome] = useState(85000);
  const [emi, setEmi] = useState(12000);
  const [result, setResult] = useState(() => calculateEligibleLoanAmount(85000, 12000));
  const format = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  return (
    <div className="home-eligibility-card">
      <div className="home-eligibility-fields">
        <label>Monthly take-home income<input type="number" min="0" value={income} onChange={(e) => { const next = Number(e.target.value); setIncome(next); setResult(calculateEligibleLoanAmount(next, emi)); }} /></label>
        <label>Existing monthly EMIs<input type="number" min="0" value={emi} onChange={(e) => { const next = Number(e.target.value); setEmi(next); setResult(calculateEligibleLoanAmount(income, next)); }} /></label>
      </div>
      <div className="home-eligibility-result"><p>Indicative borrowing capacity</p><strong>{format(result)}</strong><span>Estimate only. Lender eligibility and terms may differ.</span><Link className="home-text-link" to="/eligibility">Check full eligibility <ArrowRight size={16} /></Link></div>
    </div>
  );
}

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [homepageLoading, setHomepageLoading] = useState(true);
  const [publicContentError, setPublicContentError] = useState("");
  const [cmsContent, setCmsContent] = useState(null);
  const [publicStats, setPublicStats] = useState({ customersReached: 0, confirmedDisbursements: 0 });
  const [filter, setFilter] = useState("All");
  const [faqOpen, setFaqOpen] = useState(0);
  const [docTab, setDocTab] = useState("Salaried");
  const [showStickyApply, setShowStickyApply] = useState(false);
  const [loadEmiSection, setLoadEmiSection] = useState(false);
  const [heroLoanType, setHeroLoanType] = useState(0);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [showAllBanks, setShowAllBanks] = useState(false);
  const emiSectionRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    let active = true;
    let requestPending = false;
    const refreshPublishedContent = async (initial = false) => {
      if (requestPending) return;
      requestPending = true;
      if (initial) setHomepageLoading(true);
      const [contentResult, categoriesResult, institutionsResult, statsResult] = await Promise.allSettled([
        websiteContentApi.get(),
        publicLoanCategoriesApi.getAll(),
        banksApi.getPublic(),
        websiteContentApi.getPublicStats(),
      ]);
      if (!active) return;
      const errors = [];
      if (contentResult.status === "fulfilled") setCmsContent(contentResult.value?.content || null);
      else errors.push("Some homepage content could not be loaded.");
      if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value?.categories || []);
      else errors.push("Loan options could not be loaded.");
      if (institutionsResult.status === "fulfilled") setInstitutions(institutionsResult.value?.banks || []);
      else errors.push("Lender listings could not be loaded.");
      if (statsResult.status === "fulfilled") setPublicStats(statsResult.value?.stats || { customersReached: 0, confirmedDisbursements: 0 });
      setPublicContentError(errors.length ? `${errors.join(" ")} Please try again later.` : "");
      setHomepageLoading(false);
      requestPending = false;
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshPublishedContent();
    };
    refreshPublishedContent(true);
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    const update = () => setShowStickyApply(window.scrollY > 650);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const target = emiSectionRef.current;
    if (!target) return undefined;
    if (!("IntersectionObserver" in window)) {
      setLoadEmiSection(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoadEmiSection(true);
        observer.disconnect();
      }
    }, { rootMargin: "700px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const typeCount = Math.max(categories.length, 1);
    const timer = window.setInterval(() => setHeroLoanType((index) => (index + 1) % typeCount), 3200);
    return () => window.clearInterval(timer);
  }, [reduceMotion, categories.length]);

  const looksLikeJunk = (value) => {
    const text = String(value || "").trim();
    return text.length < 15 || /(demo|prajapati|ayush|test|you are the goat)/i.test(text) || /(.)\1{5,}/.test(text) || (text.match(/[!?]/g) || []).length > 4;
  };
  const hero = useMemo(() => {
    const cmsHero = cmsContent?.hero || {};
    return {
      bannerNotice: looksLikeJunk(cmsHero.bannerNotice) ? FALLBACK_HERO.bannerNotice : cmsHero.bannerNotice.trim(),
      headline: looksLikeJunk(cmsHero.headline) ? FALLBACK_HERO.headline : cmsHero.headline.trim(),
      subheadline: looksLikeJunk(cmsHero.subheadline) ? FALLBACK_HERO.subheadline : cmsHero.subheadline.trim(),
    };
  }, [cmsContent]);
  const cmsFaqs = Array.isArray(cmsContent?.faqs)
    ? cmsContent.faqs.filter((faq) => !looksLikeJunk(faq?.question) && !looksLikeJunk(faq?.answer) && faq.question.trim().length >= 15 && faq.answer.trim().length >= 35)
    : [];
  const faqs = cmsFaqs.length >= 3 ? cmsFaqs : FAQS;
  const heroTypes = categories.slice(0, 5).map((category) => category.name);
  const categoryProducts = categories.map((category) => {
    const slug = String(category.slug || "").toLowerCase();
    const icon = category.icon === "Briefcase" ? BriefcaseIcon : category.icon === "Car" ? CarIcon : category.icon === "GraduationCap" ? GradCap : category.icon === "Building" ? BuildingIcon : category.icon === "Wallet" ? CoinStack : HomeIcon;
    const group = /personal/.test(slug) ? "Personal" : /business|property|lap/.test(slug) ? "Business" : /vehicle|education/.test(slug) ? "Vehicle & Education" : "Property";
    const cleanDetail = (value) => {
      const text = String(value ?? "").trim();
      if (!text || /(demo|test|prajapati|ayush)/i.test(text) || /(.)\1{5,}/.test(text)) return "";
      if (!/\d/.test(text) && text.length < 18) return "";
      return text;
    };
    const interest = cleanDetail(category.minInterest);
    const rate = interest && /\d/.test(interest) ? `${interest}${interest.includes("%") ? "" : "%"}${/p\.?a\.?/i.test(interest) ? "" : " p.a."}` : "";
    const amountText = cleanDetail(category.maxAmount);
    const maxAmount = amountText && /^\d+(?:\.\d+)?$/.test(amountText)
      ? `â‚¹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amountText))}`
      : amountText;
    const tenureText = cleanDetail(category.maxTenure);
    const maxTenure = tenureText && /^\d+(?:\.\d+)?$/.test(tenureText) ? `${tenureText} years` : tenureText;
    const processingTime = cleanDetail(category.processingTime);
    const details = [
      rate && { label: "Interest rate", value: rate },
      maxAmount && { label: "Loan amount", value: maxAmount },
      maxTenure && { label: "Maximum tenure", value: maxTenure },
      processingTime && { label: "Processing time", value: processingTime },
    ].filter(Boolean);
    return {
      id: slug || category._id,
      name: category.name,
      group,
      rate,
      details,
      icon,
      summary: cleanDetail(category.description) || cleanDetail(category.tagline) || "Explore the requirements and available options for this loan.",
      benefits: Array.isArray(category.benefits) ? category.benefits.map(cleanDetail).filter(Boolean).slice(0, 3) : [],
      imageUrl: category.imageStorageKey ? websiteContentApi.assetUrl(category.imageStorageKey) : "",
    };
  });
  const filteredProducts = filter === "All" ? categoryProducts : categoryProducts.filter((product) => product.group === filter);
  const activeCategory = categories.find((category) => category.name === docTab) || categories[0];
  const documentTypes = (activeCategory?.documentRequirements || [])
    .filter((item) => docTab.toLowerCase() === "all" || !Array.isArray(item.employmentTypes) || item.employmentTypes.length === 0 || item.employmentTypes.some((type) => String(type).toLowerCase() === docTab.toLowerCase()))
    .map((item) => item.documentType)
    .filter(Boolean);
  const documentTabs = [...new Set((activeCategory?.documentRequirements || []).flatMap((item) => item.employmentTypes || []).filter(Boolean))];
  const stats = [
    { value: categories.length, label: "Published loan categories", icon: Landmark },
    { value: institutions.length, label: "Listed lending institutions", icon: HomeIcon },
    { value: (cmsContent?.team || []).filter((member) => member.active).length, label: "Published team profiles", icon: Users },
    { value: publicStats.confirmedDisbursements, label: "Confirmed disbursements", icon: Banknote },
    { value: publicStats.customersReached, label: "Customer enquiries", icon: Users },
    ...(cmsContent?.homepageGoals?.customersReachedTarget !== null && cmsContent?.homepageGoals?.customersReachedTarget !== undefined
      ? [{ value: Number(cmsContent.homepageGoals.customersReachedTarget), label: "Customer reach goal", icon: Users }]
      : []),
    ...(cmsContent?.homepageGoals?.disbursementsTarget !== null && cmsContent?.homepageGoals?.disbursementsTarget !== undefined
      ? [{ value: Number(cmsContent.homepageGoals.disbursementsTarget), label: "Disbursement goal", icon: Banknote }]
      : []),
    ...(cmsContent?.homepageGoals?.disbursementAmountTarget !== null && cmsContent?.homepageGoals?.disbursementAmountTarget !== undefined
      ? [{ value: Number(cmsContent.homepageGoals.disbursementAmountTarget), label: "Disbursement amount goal", icon: Banknote, prefix: "â‚¹", suffix: cmsContent.homepageGoals.disbursementAmountUnit === "crore" ? " Cr" : " Lakh", decimals: String(cmsContent.homepageGoals.disbursementAmountTarget).split(".")[1]?.length || 0 }]
      : []),
  ];
  const activeLenders = institutions.filter((institution) => institution.name);

  return (
      <div className="home-page" id="home-top">
      <SeoMetadata />
      {publicContentError && <p className="home-public-error" role="status">{publicContentError}</p>}
      <motion.div className="home-scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img className="home-hero-backdrop" src="/media/images/hero-architecture.svg" alt="" aria-hidden="true" fetchPriority="high" />
        <div className="home-container home-hero-grid">
          <FadeUp className="home-hero-copy">
            <p className="home-kicker"><span className="home-live-dot" />{hero.bannerNotice}</p>
            <h1 id="home-hero-title">{hero.headline}</h1>
            {heroTypes.length > 0 ? <><div className="home-hero-loan-types"><span>Published loan categories</span><AnimatePresence mode="wait"><motion.strong key={heroLoanType} initial={reduceMotion ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: .28 }}>{heroTypes[heroLoanType % heroTypes.length]}</motion.strong></AnimatePresence><span className="home-hero-type-dot" /></div><div className="home-hero-type-picker" role="group" aria-label="Choose a loan category">{heroTypes.map((type, index) => { const TypeIcon = HERO_LOAN_ICONS[index % HERO_LOAN_ICONS.length]; return <button type="button" key={type} aria-pressed={heroLoanType === index} className={heroLoanType === index ? "is-active" : ""} onClick={() => setHeroLoanType(index)}><TypeIcon size={14} />{type}</button>; })}</div></> : <p className="home-hero-loan-types" role="status">Loan categories will appear here when published.</p>}
            <p className="home-hero-lede">{hero.subheadline}</p>
            <div className="home-actions"><Link to="/apply" className="home-button home-button--primary">Apply now <ArrowRight size={17} /></Link><Link to="/services" className="home-button home-button--secondary">Explore loan options <ArrowDown size={16} /></Link></div>
            <div className="home-trust-list">
              <span><ShieldIcon size={17} /> Lender-led decisions</span><span><Clock3 size={17} /> Clear next steps</span><span><Percent size={17} /> Ask about fees</span>
            </div>
            <div className="home-rate-note"><span>Published information</span><strong>{categories.length} active loan categories</strong><i /><strong>{institutions.length} listed institutions</strong><small>Rates and final terms depend on each lender and application.</small></div>
          </FadeUp>
          <FadeUp delay={0.12} className="home-hero-visual">
            <div className="home-hero-art-wrap"><HomeLoanCityScene /><HomeBankOfficeScene /><HeroJourneyPanel reduceMotion={reduceMotion} /></div>
            <div className="home-enquiry-card"><div className="home-enquiry-head"><span className="home-kicker">Talk to a loan specialist</span><h2>Request a callback</h2><p>Share a few details. Weâ€™ll help you understand the next step.</p></div><EnquiryForm /></div>
          </FadeUp>
        </div>
      </section>

      <section className="home-section home-bank-offers" aria-labelledby="home-bank-offers-title">
        <div className="home-container">
          <motion.div className="home-bank-offers-heading" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .55, ease: HOME_EASE }}>
            <div><p className="home-kicker">Published directory</p><h2 id="home-bank-offers-title">Banks &amp; NBFCs</h2><p>Browse the lending institutions currently published by the RealCred team.</p></div>
            <span className="home-bank-live"><span /> {institutions.length} listed</span>
          </motion.div>
          <div className="home-bank-offer-list">
            {(showAllBanks ? activeLenders : activeLenders.slice(0, 5)).map((institution) => <article className="home-bank-offer" key={institution._id || institution.name}>
              <div className="home-bank-identity">
                <div className="home-bank-mark"><PublicAssetImage src={institutionLogoUrl(institution)} alt={`${institution.name} logo`} fallback={<Landmark size={22} aria-hidden="true" />} /></div>
                <h3>{institution.name}</h3>
              </div>
              <div className="home-bank-offer-metrics">
                <div><span>Interest Rate</span><strong>{institution.minRoi || "Not provided"}</strong></div>
                <div><span>Maximum LTV</span><strong>{institution.maxLtv || "Not provided"}</strong></div>
                <div><span>Processing Time</span><strong>{institution.tat || "Not provided"}</strong></div>
                <div><span>Processing Fee</span><strong>{institution.processingFee || "Not provided"}</strong></div>
              </div>
              <button type="button" onClick={() => setSelectedInstitution(institution)} className="home-bank-explore">Explore Offer <ArrowUpRight size={16} /></button>
            </article>)}
            {activeLenders.length === 0 && <p role="status" className="home-bank-disclaimer">{homepageLoading ? "Loading published institutionsâ€¦" : "No institutions are currently published."}</p>}
          </div>
          {activeLenders.length > 5 && <div className="home-bank-show-more-wrap"><button type="button" className="home-bank-show-more" onClick={() => setShowAllBanks((current) => !current)}>{showAllBanks ? "Show less" : "Show more"}</button></div>}
          <p className="home-bank-disclaimer">Availability, rates, eligibility and final terms are determined by each lender.</p>
        </div>
      </section>

      <section className="home-stats-band" aria-label="REALCRED at a glance">
        <div className="home-container"><StaggerContainer className="home-stats-grid">{stats.map((stat) => { const Icon = stat.icon; return <StaggerItem className="home-stat" key={stat.label}><Icon size={19} aria-hidden="true" /><strong><CountUp value={stat.value} prefix={stat.prefix || ""} suffix={stat.suffix || ""} decimals={stat.decimals || 0} /></strong><span>{stat.label}</span></StaggerItem>; })}</StaggerContainer><p className="home-stat-footnote">Directory totals and achieved counts come from current records. Goals are targets set by the RealCred team.</p></div>
      </section>

      <section className="home-section home-products" id="loan-options" aria-labelledby="home-products-title">
        <div className="home-container"><FadeUp><div className="home-products-intro"><SectionHeading kicker="Loan options" title="Find a loan that fits the plan." body="Start with your goal. Weâ€™ll help you compare lender options, costs and documents before you decide." /><Link to="/services" className="home-text-link">View all loan services <ArrowUpRight size={16} /></Link></div></FadeUp>
          <div className="home-filter-row" role="group" aria-label="Filter loan products">{FILTERS.map((item) => <button type="button" key={item} className={filter === item ? "is-active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <motion.div layout className="home-product-grid">
            {homepageLoading ? Array.from({ length: 4 }, (_, index) => <div className="home-product-card home-product-loading" key={`category-loading-${index}`} aria-hidden="true"><div /><div /><div /></div>) : <AnimatePresence mode="popLayout">{filteredProducts.map((product) => { const Icon = product.icon; const serviceUrl = `/services#${encodeURIComponent(product.id)}`; const applicationUrl = `/apply?category=${encodeURIComponent(product.name)}`; return <motion.article layout key={product.id} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} transition={{ duration: 0.32, ease: HOME_EASE }} className="home-product-card"><LoanCategoryVisual product={product} /><div className="home-product-top"><span className="home-product-icon"><Icon size={25} /></span><span className="home-product-type">Loan option</span></div><h3>{product.name}</h3>{product.summary && <p>{product.summary}</p>}{product.details.length > 0 && <dl className="home-product-details">{product.details.map((detail) => <div className={detail.label === "Interest rate" ? "is-rate" : ""} key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>}<ul>{product.benefits.map((benefit) => <li key={benefit}><Check size={15} />{benefit}</li>)}</ul><div className="home-product-actions"><Link to={serviceUrl} className="home-text-link">Read more <ArrowRight size={15} /></Link><Link to={applicationUrl} aria-label={`Apply for ${product.name}`} className="home-icon-link"><ArrowUpRight size={18} /></Link></div></motion.article>; })}</AnimatePresence>}
          </motion.div>
          {!homepageLoading && !categories.length && <p className="home-empty-state" role="status">{publicContentError ? "Loan categories could not be loaded." : "No loan categories are currently published."}</p>}
        </div>
      </section>

      <div ref={emiSectionRef} className="home-emi-lazy-slot">
        {loadEmiSection ? <Suspense fallback={<div className="home-container home-calculator-skeleton" aria-label="Loading EMI calculator" />}><HomeEmiSection /></Suspense> : <div className="home-container home-calculator-skeleton" aria-hidden="true" />}
      </div>

      <section className="home-section home-why" aria-labelledby="home-why-title"><div className="home-container"><div className="home-why-heading"><SectionHeading kicker="A more guided process" title="More clarity at every decision." body="A loan is a long-term commitment. Review lender terms and ask questions before deciding." /><Link to="/about" className="home-text-link">How our process works <ArrowRight size={16} /></Link></div><div className="home-why-grid"><FadeUp className="home-compare-card"><div className="home-compare-visual"><div className="home-compare-bars"><span style={{ height: "42%" }} /><span style={{ height: "58%" }} /><span style={{ height: "76%" }} /><span style={{ height: "92%" }} /></div><div className="home-compare-label"><span><Landmark size={16} /> Lender information</span><strong>Rate Â· fees Â· tenure</strong></div></div><h3>Understand the terms before you decide.</h3><p>Compare the information available for your requirements and ask the lender about details that apply to your case.</p></FadeUp><StaggerContainer className="home-why-benefit-grid">{[{ icon: MessageCircle, title: "A person to ask", text: "Get help understanding documents and lender questions." }, { icon: FileCheck2, title: "Application information", text: "Keep track of information shared with the team." }, { icon: Percent, title: "Costs discussed", text: "Ask about lender fees and repayment terms." }, { icon: ShieldIcon, title: "Your choice", text: "Review the lender offer before deciding whether to proceed." }].map((item) => { const Icon = item.icon; return <StaggerItem key={item.title} className="home-benefit"><Icon size={21} /><h3>{item.title}</h3><p>{item.text}</p></StaggerItem>; })}</StaggerContainer></div></div></section>

      <section className="home-section home-process" aria-labelledby="home-process-title"><div className="home-container"><FadeUp className="home-process-heading"><SectionHeading kicker="Four clear steps" title="From first question to lender decision." body="Your application moves through these stages. Timing depends on the loan and lender checks." align="center" /></FadeUp><div className="home-stepper"><DrawLine className="home-step-line" />{[{ icon: MessageCircle, title: "Tell us what you need", text: "Share your loan purpose, income range and preferred contact." }, { icon: FileText, title: "Prepare the documents", text: "See the usual documents for your profile and loan type." }, { icon: Landmark, title: "Review lender options", text: "Compare eligible offers, fees, rate type and repayment." }, { icon: CheckCircle2, title: "Lender completes review", text: "The lender verifies your application and makes the final decision." }].map((step, i) => { const Icon = step.icon; return <FadeUp key={step.title} delay={i * 0.07} className="home-step"><span className="home-step-number">0{i + 1}</span><span className="home-step-icon"><Icon size={21} /></span><h3>{step.title}</h3><p>{step.text}</p></FadeUp>; })}</div></div></section>

      <section className="home-lenders" aria-label="Lending network"><div className="home-container home-lenders-inner"><FadeUp><div><p className="home-kicker">Lending network</p><h2>Options from participating lenders.</h2><p>Availability depends on product, location and eligibility.</p></div></FadeUp><FadeUp delay={0.12}><div className="home-lender-grid">{activeLenders.length ? activeLenders.map((institution) => <article className="home-lender-card" key={institution._id || institution.name}><span className="home-lender-mark"><PublicAssetImage className="home-lender-logo" src={institutionLogoUrl(institution)} alt={`${institution.name} logo`} fallback={<Landmark size={20} aria-hidden="true" />} /></span><strong>{institution.name}</strong></article>) : <p className="home-lender-empty">No institutions currently published</p>}</div></FadeUp></div></section>

      <section className="home-section home-eligibility" aria-labelledby="home-eligibility-title"><div className="home-container home-eligibility-grid"><FadeUp><div><p className="home-kicker">A local estimate</p><h2 id="home-eligibility-title">See how existing EMIs affect an illustrative estimate.</h2><p>The on-page calculator applies its displayed local assumptions only. It does not check lender policy, credit history or approve a loan.</p><Link to="/eligibility" className="home-text-link">See full eligibility checker <ArrowRight size={16} /></Link></div></FadeUp><FadeUp delay={0.12}><EligibilityTeaser /></FadeUp></div></section>

      <section className="home-section home-documents" aria-labelledby="home-docs-title"><div className="home-container home-doc-grid"><FadeUp><div className="home-doc-intro"><p className="home-kicker">Get ready to apply</p><h2 id="home-docs-title">A short document checklist.</h2><p>Requirements shown here come from the currently published loan category.</p><label className="home-doc-tabs-label" htmlFor="home-doc-category">Loan category</label><select id="home-doc-category" value={activeCategory?.name || ""} onChange={(event) => { const nextCategory = categories.find((category) => category.name === event.target.value); setDocTab(nextCategory?.documentRequirements?.flatMap((item) => item.employmentTypes || [])[0] || "All"); }}><option value="">Select a loan category</option>{categories.map((category) => <option key={category._id || category.slug} value={category.name}>{category.name}</option>)}</select><div className="home-doc-tabs" role="tablist" aria-label="Applicant type">{(documentTabs.length ? documentTabs : ["All"]).map((tab) => <button key={tab} role="tab" aria-selected={docTab.toLowerCase() === tab.toLowerCase()} aria-controls="home-doc-panel" className={docTab.toLowerCase() === tab.toLowerCase() ? "is-active" : ""} onClick={() => setDocTab(tab)}>{tab}</button>)}</div></div></FadeUp><FadeUp delay={0.12}><div className="home-doc-panel" id="home-doc-panel" role="tabpanel"><div className="home-doc-illustration"><LoanDocumentsScene /><div className="home-doc-category"><span>Selected category</span><strong>{activeCategory?.name || "Loan documents"}</strong><small>{documentTypes.length ? `${documentTypes.length} document requirements` : "Checklist information"}</small></div></div>{documentTypes.length ? <ul>{documentTypes.map((doc) => <li key={doc}><CheckCircle2 size={18} />{doc}</li>)}</ul> : <div className="home-doc-empty" role="status"><FileText size={19} /><div><strong>No checklist published yet</strong><span>Requirements for this category will appear here when available.</span></div></div>}<Link to="/apply" className="home-text-link">Start an application <ArrowRight size={15} /></Link></div></FadeUp></div></section>

      <section className="home-section home-testimonials" aria-labelledby="home-testimonials-title"><div className="home-container"><div className="home-testimonial-head"><div><p className="home-kicker">RealCred</p><h2 id="home-testimonials-title">Benefits of RealCred</h2><p>Benefits published by the RealCred team.</p></div></div>{homepageLoading && !cmsContent ? <p role="status" className="home-bank-disclaimer">Loading published contentâ€¦</p> : (cmsContent?.benefits || []).length ? <div className="home-testimonial-grid home-benefit-grid">{cmsContent.benefits.map((benefit) => <article className="home-testimonial-card home-benefit-card" key={benefit._id || benefit.title}><span className="home-benefit-icon"><CheckCircle2 size={20} /></span><div><p className="home-benefit-eyebrow">RealCred benefit</p><h3>{benefit.title}</h3>{benefit.description && <p className="home-benefit-description">{benefit.description}</p>}</div></article>)}</div> : <p role="status" className="home-bank-disclaimer">Benefits will be listed here after business review.</p>}<div className="home-testimonial-head" style={{ marginTop: 48 }}><div><p className="home-kicker">People</p><h2>Our Team</h2></div></div>{homepageLoading && !cmsContent ? <p role="status" className="home-bank-disclaimer">Loading published contentâ€¦</p> : (cmsContent?.team || []).length ? <div className="home-testimonial-grid">{cmsContent.team.filter((member) => member.active).map((member) => <article className="home-testimonial-card" key={member._id || member.name}><PublicTeamPhoto storageKey={member.photoStorageKey} name={member.name} /><h3>{member.name}</h3><p>{member.designation}</p>{member.biography && <p>{member.biography}</p>}</article>)}</div> : <p role="status" className="home-bank-disclaimer">Team profiles will be added when approved information is available.</p>}</div></section>

      <section className="home-section home-faq" aria-labelledby="home-faq-title"><div className="home-container home-faq-grid"><div className="home-faq-aside"><p className="home-kicker">Useful answers</p><h2 id="home-faq-title">Questions before you apply?</h2><p>Loan terms depend on the lender and your application. Contact us if you need help understanding a step.</p><Link to="/contact" className="home-contact-card"><MessageCircle size={19} /><span><small>Talk to our team</small><strong>Contact RealCred</strong></span><ArrowUpRight size={17} /></Link></div><div className="home-faq-list">{faqs.map((faq, index) => { const opened = faqOpen === index; const id = `home-faq-answer-${index}`; return <div className={`home-faq-item ${opened ? "is-open" : ""}`} key={`${faq.question}-${index}`}><h3><button type="button" aria-expanded={opened} aria-controls={id} onClick={() => setFaqOpen(opened ? -1 : index)}>{faq.question}<ChevronDown size={19} /></button></h3><div id={id} role="region" aria-label={faq.question} className="home-faq-answer" style={{ gridTemplateRows: opened ? "1fr" : "0fr" }}><div><p>{faq.answer}</p></div></div></div>; })}</div></div></section>

      <section className="home-final-cta"><div className="home-container home-final-inner"><div><p className="home-kicker home-kicker--light">A practical next step</p><h2>Letâ€™s make the loan process easier to understand.</h2><p>Tell us what youâ€™re planning. Weâ€™ll help you understand your options and what to prepare.</p></div><div className="home-actions"><Link to="/apply" className="home-button home-button--white">Start an application <ArrowRight size={17} /></Link><Link to="/contact" className="home-button home-button--outline">Talk to our team</Link></div></div></section>

      <AnimatePresence>{showStickyApply && <motion.div className="home-mobile-apply" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}><Link to="/apply">Apply for a loan <ArrowRight size={17} /></Link></motion.div>}</AnimatePresence>
      {selectedInstitution && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedInstitution(null); }}><section role="dialog" aria-modal="true" aria-labelledby="institution-detail-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="home-bank-mark"><PublicAssetImage src={institutionLogoUrl(selectedInstitution)} alt={`${selectedInstitution.name} logo`} fallback={<Landmark size={22} aria-hidden="true" />} /></div><div><h2 id="institution-detail-title" className="text-lg font-bold">{selectedInstitution.name}</h2><p className="text-sm text-slate-500">{selectedInstitution.institutionType || "Lending institution"}{selectedInstitution.category ? ` Â· ${selectedInstitution.category}` : ""}</p></div></div><button type="button" aria-label="Close institution details" onClick={() => setSelectedInstitution(null)} className="rounded-lg border px-3 py-2 text-sm">Close</button></div>{selectedInstitution.publicDescription && <p className="mt-4 text-sm leading-relaxed text-slate-700">{selectedInstitution.publicDescription}</p>}{selectedInstitution.availableLoanCategories?.length > 0 && <div className="mt-4"><h3 className="text-xs font-bold uppercase text-slate-600">Configured loan categories</h3><ul className="mt-2 flex flex-wrap gap-2">{selectedInstitution.availableLoanCategories.map((category) => <li key={category._id || category.slug} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-900">{category.name}</li>)}</ul></div>}<dl className="mt-5 grid grid-cols-2 gap-3 text-sm">{[["Interest rate", selectedInstitution.minRoi], ["Maximum LTV", selectedInstitution.maxLtv], ["Processing time", selectedInstitution.tat], ["Processing fee", selectedInstitution.processingFee]].filter(([, value]) => String(value || "").trim()).map(([label, value]) => <div key={label} className="rounded-lg border bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value}</dd></div>)}</dl>{selectedInstitution.websiteUrl && <a href={selectedInstitution.websiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-red-700 underline">Visit institution website</a>}<p className="mt-3 text-xs text-slate-500">A preference is sent to RealCred for follow-up. This directory does not confirm product availability, a direct lender application, or an offer.</p><Link to={`/apply?institution=${encodeURIComponent(selectedInstitution.name)}${selectedInstitution.availableLoanCategories?.length === 1 ? `&category=${encodeURIComponent(selectedInstitution.availableLoanCategories[0].name)}` : ""}`} onClick={() => setSelectedInstitution(null)} className="mt-5 inline-flex rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">Apply Now</Link></section></div>}
    </div>
  );
};

