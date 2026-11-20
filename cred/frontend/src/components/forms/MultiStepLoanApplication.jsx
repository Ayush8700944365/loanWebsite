import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatINR } from '../../utils/formatters';
import { uploadWithProgress, loanCategoriesApi } from '../../services/api';
import {
  User,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check,
  AlertCircle
} from 'lucide-react';

export const MultiStepLoanApplication = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedLeadId, setSubmittedLeadId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    fullName: '',
    mobileNumber: '',
    email: '',
    dob: '',
    gender: '',
    city: '',
    residentialAddress: '',
    // Step 2: Loan Details
    loanType: 'Home Loan',
    leadType: 'SBI',
    preferredBank: '',
    requiredAmount: '',
    employmentType: 'Salaried',
    monthlyIncome: '',
    loanTenureYears: 20,
    // Step 3: Document Uploads
    documents: {}
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loanCategoriesApi.getPublic().then((response) => {
      const active = response.categories || [];
      setCategories(active);
      const requestedInstitution = searchParams.get('institution') || '';
      if (active.length) {
        const requestedCategory = searchParams.get('category');
        const preselected = active.find((category) => category.name === requestedCategory || category.slug === requestedCategory);
        setFormData((prev) => ({ ...prev, loanType: preselected?.name || active[0].name, preferredBank: requestedInstitution || prev.preferredBank }));
      } else if (requestedInstitution) {
        setFormData((prev) => ({ ...prev, preferredBank: requestedInstitution }));
      }
      else setCategoriesError('No loan categories are currently available. Please try again later.');
    }).catch(() => { setCategories([]); setCategoriesError('Loan categories could not be loaded. Please try again later.'); });
  }, [searchParams]);

  const selectedCategory = categories.find((category) => category.name === formData.loanType || category.slug === formData.loanType);
  const configuredRequirements = (selectedCategory?.documentRequirements || []).filter((requirement) =>
    !requirement.employmentTypes?.length || requirement.employmentTypes.some((type) => type.toLowerCase() === formData.employmentType.toLowerCase()),
  );
  const documentOptions = configuredRequirements.map((requirement) => ({ name: requirement.documentType, required: true }));

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Each document must be no larger than 5 MB.');
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!validTypes[extension] || file.type !== validTypes[extension]) {
      setSubmitError('Only valid PDF, JPG, JPEG, or PNG files are accepted.');
      return;
    }
    setSubmitError('');
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: file
      }
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      const digits = formData.mobileNumber.replace(/\D/g, '');
      if (formData.fullName.trim().length < 2 || formData.fullName.trim().length > 100) newErrors.fullName = 'Enter a name between 2 and 100 characters';
      if (!/^[+\d\s().-]+$/.test(formData.mobileNumber.trim()) || digits.length < 7 || digits.length > 15) newErrors.mobileNumber = 'Enter a valid phone number with 7 to 15 digits';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) || formData.email.length > 254) newErrors.email = 'Enter a valid email address';
      if (!formData.residentialAddress.trim() || formData.residentialAddress.trim().length > 500) newErrors.residentialAddress = 'Enter an address up to 500 characters';
      if (formData.dob && (Number.isNaN(new Date(formData.dob).getTime()) || new Date(formData.dob) > new Date())) newErrors.dob = 'Date of birth cannot be in the future';
    } else if (step === 2) {
      if (!Number.isFinite(Number(formData.requiredAmount)) || Number(formData.requiredAmount) <= 0) newErrors.requiredAmount = 'Enter a requested loan amount greater than zero';
      if (!Number.isFinite(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0) newErrors.monthlyIncome = 'Enter a valid monthly income greater than zero';
      if (!Number.isFinite(Number(formData.loanTenureYears)) || Number(formData.loanTenureYears) <= 0) newErrors.loanTenureYears = 'Enter a valid loan tenure';
      if (!categories.some((category) => category.name === formData.loanType || category.slug === formData.loanType)) newErrors.loanType = categoriesError || 'Choose an available loan category';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validateStep(1)) { setCurrentStep(1); return; }
    if (!validateStep(2)) { setCurrentStep(2); return; }
    setSubmitting(true);
    setSubmitError('');
    setUploadProgress(0);
    try {
      const payload = new FormData();
      payload.append('customerName', formData.fullName);
      payload.append('phone', formData.mobileNumber);
      payload.append('email', formData.email);
      payload.append('dob', formData.dob);
      payload.append('gender', formData.gender);
      payload.append('leadType', formData.leadType);
      payload.append('preferredBank', formData.preferredBank);
      payload.append('loanCategory', formData.loanType);
      payload.append('loanAmount', String(formData.requiredAmount));
      payload.append('monthlyIncome', String(formData.monthlyIncome));
      payload.append('employmentType', formData.employmentType);
      payload.append('tenureYears', String(formData.loanTenureYears));
      payload.append('city', formData.city);
      payload.append('propertyAddress', formData.residentialAddress);
      const picked = Object.entries(formData.documents).filter(([, file]) => file instanceof File);
      payload.append('documentTypes', JSON.stringify(picked.map(([name]) => ({ name, type: 'Customer upload' }))));
      picked.forEach(([, file]) => payload.append('documents', file, file.name));
      const response = await uploadWithProgress('/leads/website', payload, setUploadProgress);
      setSubmittedLeadId(response.lead?.leadCode);
      setCurrentStep(5);
    } catch (error) {
      setSubmitError(error.message || 'Application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Personal Info', desc: 'Identity & Contacts' },
    { num: 2, title: 'Loan Details', desc: 'Amount & Purpose' },
    { num: 3, title: 'Documents', desc: 'e-KYC Uploads' },
    { num: 4, title: 'Review', desc: 'Verify & Submit' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-premium p-6 sm:p-10 max-w-4xl mx-auto">
      
      {/* Steps Header Bar */}
      {currentStep <= 4 && (
        <div className="mb-10">
          <div className="grid grid-cols-4 gap-2 relative">
            {stepsList.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <div key={s.num} className="text-center group">
                  <div className="flex items-center justify-center mb-2">
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-brand-royal text-white ring-4 ring-blue-100 shadow-glow'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? <Check className="w-5 h-5" /> : s.num}
                    </div>
                  </div>
                  <span className={`block text-xs sm:text-sm font-bold ${isActive ? 'text-brand-navy' : 'text-slate-500'}`}>
                    {s.title}
                  </span>
                  <span className="hidden sm:block text-[11px] text-slate-400">{s.desc}</span>
                </div>
              );
            })}
          </div>
          {/* Progress track */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-royal to-brand-teal h-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: Personal Details */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xl font-bold text-brand-navy">Step 1: Personal & Contact Information</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please enter your full official name as registered on your PAN and Aadhaar records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Legal Name *</label>
              <input
                type="text"
                placeholder="Full name" maxLength={100} required aria-invalid={Boolean(errors.fullName)}
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`w-full text-sm font-medium border rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal ${
                  errors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.fullName && <p className="text-rose-500 text-[11px] mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Contact Number *</label>
              <input
                type="tel"
                placeholder="Phone number" maxLength={10} required inputMode="tel" aria-invalid={Boolean(errors.mobileNumber)}
                value={formData.mobileNumber}
                onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                className={`w-full text-sm font-medium border rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal ${
                  errors.mobileNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.mobileNumber && <p className="text-rose-500 text-[11px] mt-1">{errors.mobileNumber}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="Email address" maxLength={254} required aria-invalid={Boolean(errors.email)}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full text-sm font-medium border rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal ${
                  errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.email && <p className="text-rose-500 text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
              <input
                type="date"
                aria-invalid={Boolean(errors.dob)}
                value={formData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
              />
              {errors.dob && <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.dob}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Non-Binary</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Current City</label>
              <select
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                <option value="Mumbai">Mumbai</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Ahmedabad">Ahmedabad</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Residential Address *</label>
              <textarea
                rows="2"
                placeholder="Apartment, Street name, Landmark, Pincode"
                value={formData.residentialAddress}
                onChange={(e) => handleInputChange('residentialAddress', e.target.value)}
                className={`w-full text-sm font-medium border rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal ${
                  errors.residentialAddress ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.residentialAddress && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.residentialAddress}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-xs"
            >
              <span>Continue to Loan Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Loan Details */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xl font-bold text-brand-navy">Step 2: Loan Requirements & Financials</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your required facility type and banking scheme.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Loan Category</label>
              <select
                value={formData.loanType}
                aria-invalid={Boolean(errors.loanType)}
                onChange={(e) => handleInputChange('loanType', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                {categories.map((category) => <option key={category._id || category.slug} value={category.name}>{category.name}</option>)}
              </select>
              {errors.loanType && <p role="alert" className="mt-1 text-rose-600">{errors.loanType}</p>}
              {!categories.length && <p role="status" className="mt-1 text-rose-600">{categoriesError || 'No active loan categories are available.'}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Preferred Banking Route</label>
              <select
                value={formData.leadType}
                onChange={(e) => handleInputChange('leadType', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                <option value="SBI">SBI processing route</option>
                <option value="Non-SBI">Other institution route</option>
              </select>
              <label htmlFor="preferred-institution" className="mt-3 block font-bold text-slate-700">Institution preference (optional)</label>
              <input id="preferred-institution" value={formData.preferredBank} onChange={(event) => handleInputChange('preferredBank', event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" placeholder="Enter an institution preference" />
              <p className="mt-1 text-[11px] text-slate-500">A preference is recorded for RealCred follow-up and does not confirm lender availability.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Required Loan Amount: <span className="text-brand-royal font-extrabold">{formatINR(formData.requiredAmount)}</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                aria-invalid={Boolean(errors.requiredAmount)}
                value={formData.requiredAmount}
                onChange={(e) => handleInputChange('requiredAmount', Number(e.target.value))}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
              />
              {errors.requiredAmount && <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.requiredAmount}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => handleInputChange('employmentType', e.target.value)}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                <option value="Salaried">Salaried (MNC / Corporate)</option>
                <option value="Self-Employed">Self-Employed Professional</option>
                <option value="Business Owner">Business Owner / Enterprise</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Net Monthly In-Hand Income: <span className="text-emerald-600 font-extrabold">{formatINR(formData.monthlyIncome)}</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                aria-invalid={Boolean(errors.monthlyIncome)}
                value={formData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', Number(e.target.value))}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
              />
              {errors.monthlyIncome && <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.monthlyIncome}</p>}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Desired Tenure (Years)</label>
              <select
                value={formData.loanTenureYears}
                aria-invalid={Boolean(errors.loanTenureYears)}
                onChange={(e) => handleInputChange('loanTenureYears', Number(e.target.value))}
                className="w-full text-sm font-medium border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
              >
                <option value={5}>5 Years (60 Months)</option>
                <option value={10}>10 Years (120 Months)</option>
                <option value={15}>15 Years (180 Months)</option>
                <option value={20}>20 Years (240 Months)</option>
                <option value={25}>25 Years (300 Months)</option>
                <option value={30}>30 Years (360 Months)</option>
              </select>
              {errors.loanTenureYears && <p role="alert" className="mt-1 text-[11px] text-rose-600">{errors.loanTenureYears}</p>}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-3 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-xs"
            >
              <span>Continue to Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Document Upload */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xl font-bold text-brand-navy">Step 3: Upload Encrypted Verification Documents</h3>
            <p className="text-xs text-slate-500 mt-1">Upload PDF, JPG, JPEG, or PNG files. The current server upload limit is 5 MB per file.</p>
            {!configuredRequirements.length && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No required-document policy is published for this loan category and employment type. No sample documents are shown. An administrator must configure the approved policy before this application can be verified.</p>}
          </div>

          <div className="space-y-3">
            {documentOptions.map((doc) => {
              const uploaded = formData.documents[doc.name];
              return (
                <div
                  key={doc.name}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    uploaded ? 'bg-emerald-50/40 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        uploaded ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {uploaded ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {doc.name} {doc.required && <span className="text-rose-500">*</span>}
                      </p>
                      {uploaded ? (
                        <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                          {uploaded.name} ({(uploaded.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">PDF, JPG, PNG accepted</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-slate-100 text-brand-navy border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-all">
                      <span>{uploaded ? 'Replace' : 'Upload File'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => { handleFileUpload(doc.name, e.target.files[0]); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
            {documentOptions.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">No document upload fields are available until an approved document policy is published.</p>}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-3 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-xs"
            >
              <span>Review Application</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xl font-bold text-brand-navy">Step 4: Review Details & Authorize Submission</h3>
            <p className="text-xs text-slate-500 mt-1">
              Confirm your loan parameters before digital submission to underwriting.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block mb-0.5">Applicant</span>
                <span className="font-bold text-slate-800 text-sm">{formData.fullName || 'Vikram Malhotra'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Contact</span>
                <span className="font-semibold text-slate-800">{formData.mobileNumber || '+91 98200 44521'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-semibold text-slate-800">{formData.email || 'applicant@realcred.in'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Loan Category</span>
                <span className="font-bold text-brand-royal text-sm">{formData.loanType}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Lender Pipeline</span>
                <span className="font-bold text-purple-700">{formData.leadType} route</span>
              </div>
              {formData.preferredBank && <div className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Institution preference</span><span className="font-semibold text-slate-800">{formData.preferredBank}</span></div>}
              <div>
                <span className="text-slate-400 block mb-0.5">Requested Amount</span>
                <span className="font-extrabold text-brand-navy text-sm">{formatINR(formData.requiredAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Monthly Income</span>
                <span className="font-semibold text-emerald-600">{formatINR(formData.monthlyIncome)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tenure</span>
                <span className="font-semibold text-slate-800">{formData.loanTenureYears} Years</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">City</span>
                <span className="font-semibold text-slate-800">{formData.city}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="text-slate-400 block mb-1">Attached KYC & Financial Documents:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData.documents).filter(([, file]) => file instanceof File).map(([name, file]) => (
                  <span key={name} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">{name}: {file.name}</span>
                ))}
                {!Object.values(formData.documents).some((file) => file instanceof File) && <span className="text-[11px] text-slate-500">No files attached</span>}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-brand-navy space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-brand-royal" />
              <span>Borrower Consent & Data Authorization</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              By clicking "Submit Loan Application", I authorize REALCRED and its RBI-approved lending partners to verify my CIBIL credit score, inspect my uploaded documents, and contact me regarding this application.
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-3 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleSubmitApplication}
              disabled={submitting || !categories.length}
              className="px-8 py-3.5 bg-gradient-to-r from-brand-royal to-brand-navy hover:from-brand-navy hover:to-brand-royal text-white text-xs font-extrabold rounded-xl shadow-glow flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{submitting ? `Uploading ${uploadProgress}%` : 'Submit Loan Application'}</span>
              <CheckCircle2 className="w-4 h-4 text-brand-teal" />
            </button>
          </div>
          {submitting && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-royal transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
          {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{submitError}</p>}
        </div>
      )}

      {/* STEP 5: Success Screen */}
      {currentStep === 5 && (
        <div className="text-center py-10 px-4 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-premium">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full">
              Application Submitted
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
              Your loan application was received.
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
              Your application is awaiting review. Use this reference if you contact support:
            </p>
            <div className="inline-block py-2 px-5 bg-slate-100 rounded-xl font-mono font-extrabold text-brand-navy text-base tracking-wider border border-slate-200">
              {submittedLeadId}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setCurrentStep(1);
                setFormData({
                  fullName: '',
                  mobileNumber: '',
                  email: '',
                  dob: '',
                  gender: '',
                  city: '',
                  residentialAddress: '',
                  loanType: 'Home Loan',
                  leadType: 'SBI',
                  preferredBank: '',
                  requiredAmount: '',
                  employmentType: 'Salaried',
                  monthlyIncome: '',
                  loanTenureYears: 20,
                  documents: {}
                });
              }}
              className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

