import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ticketsApi, publicLoanCategoriesApi } from '../../services/api';
import { Send, PhoneCall, CheckCircle2, User, Mail, MapPin, MessageSquare } from 'lucide-react';

export const EnquiryForm = ({ onSubmitted }) => {
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: '',
    city: '',
    loanAmount: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [categories, setCategories] = useState([]);
  const [referenceId, setReferenceId] = useState("");
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    publicLoanCategoriesApi.getAll().then((response) => {
      if (!active) return;
      const loaded = response.categories || [];
      setCategories(loaded);
      setFormData((current) => ({ ...current, category: loaded.some((item) => item.name === current.category) ? current.category : loaded[0]?.name || '' }));
    }).catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, []);

  const validate = () => {
    const next = {};
    const digits = formData.phone.replace(/\D/g, '');
    const amount = Number(formData.loanAmount);
    if (formData.name.trim().length < 2 || formData.name.trim().length > 100) next.name = 'Enter a name between 2 and 100 characters.';
    if (!/^[+\d\s().-]+$/.test(formData.phone.trim()) || digits.length < 7 || digits.length > 15) next.phone = 'Enter a valid phone number with 7 to 15 digits.';
    if (formData.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) || formData.email.length > 254)) next.email = 'Enter a valid email address.';
    if (!Number.isFinite(amount) || amount <= 0) next.loanAmount = 'Enter a requested amount greater than zero.';
    if (!formData.category || !categories.some((category) => category.name === formData.category)) next.category = 'Choose an available loan category.';
    if (formData.city.trim().length > 100) next.city = 'City must be 100 characters or fewer.';
    if (formData.message.length > 1000) next.message = 'Message must be 1,000 characters or fewer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const change = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSubmissionError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      const response = await ticketsApi.createCallback({ name: formData.name, phone: formData.phone, email: formData.email, loanCategory: formData.category, city: formData.city, loanAmount: Number(formData.loanAmount), message: formData.message, idempotencyKey: submissionKey });
      if (!response?.success || !response?.referenceId) throw new Error(response?.message || "Unable to submit your callback request.");
      setSubmissionError("");
      setReferenceId(response.referenceId);
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (error) {
      setSubmissionError(error.message || "Unable to submit your enquiry. Please try again.");
      showToast(error.message || "Unable to submit your enquiry. Please try again.", "error");
    }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 px-4 bg-emerald-50 rounded-2xl border border-emerald-200">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-slate-800">Callback Request Received!</h4>
        <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
          Your request has been saved. Reference <span className="font-semibold text-slate-800">{referenceId}</span>. The team can follow up using <span className="font-semibold text-slate-800">{formData.phone}</span>.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ name: '', phone: '', email: '', category: categories[0]?.name || '', city: '', loanAmount: '', message: '' });
            setReferenceId("");
            setSubmissionKey(crypto.randomUUID());
          }}
          className="mt-4 text-xs text-brand-royal font-bold hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 text-xs">
      {submissionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{submissionError}</p>}
      <div>
        <label htmlFor="enquiry-name" className="font-bold text-slate-700 block mb-1">Your Full Name *</label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            required
            placeholder="e.g. Rajesh Khurana"
            id="enquiry-name" maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'enquiry-name-error' : undefined}
            value={formData.name}
            onChange={(e) => change('name', e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
          />
        </div>
        {errors.name && <p id="enquiry-name-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="enquiry-phone" className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
          <div className="relative">
            <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="tel"
              id="enquiry-phone" maxLength={20} inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'enquiry-phone-error' : undefined}
              required
              placeholder="+91 98200 XXXXX"
              value={formData.phone}
              onChange={(e) => change('phone', e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
            />
          </div>
          {errors.phone && <p id="enquiry-phone-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="enquiry-email" className="font-bold text-slate-700 block mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              id="enquiry-email" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'enquiry-email-error' : undefined}
              placeholder="rajesh@example.com"
              value={formData.email}
              onChange={(e) => change('email', e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
            />
          </div>
          {errors.email && <p id="enquiry-email-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="enquiry-amount" className="font-bold text-slate-700 block mb-1">Requested loan amount *</label>
        <input id="enquiry-amount" type="number" min="0.01" step="any" required aria-invalid={Boolean(errors.loanAmount)} aria-describedby={errors.loanAmount ? 'enquiry-amount-error' : undefined} value={formData.loanAmount} onChange={(e) => change('loanAmount', e.target.value)} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5" />
        {errors.loanAmount && <p id="enquiry-amount-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.loanAmount}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="enquiry-category" className="font-bold text-slate-700 block mb-1">Loan Category</label>
          <select
            id="enquiry-category" required value={formData.category} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'enquiry-category-error' : undefined}
            onChange={(e) => change('category', e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal bg-white"
          >
            <option value="">Select a loan category</option>
            {categories.map((category) => <option key={category._id || category.slug} value={category.name}>{category.name}</option>)}
          </select>
          {errors.category && <p id="enquiry-category-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="enquiry-city" className="font-bold text-slate-700 block mb-1">City</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              id="enquiry-city" placeholder="City"
              maxLength={100} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'enquiry-city-error' : undefined}
              value={formData.city}
              onChange={(e) => change('city', e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
            />
          </div>
          {errors.city && <p id="enquiry-city-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.city}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="enquiry-message" className="font-bold text-slate-700 block mb-1">Specific Query / Message</label>
        <div className="relative">
          <textarea
            id="enquiry-message"
            rows="2"
            placeholder="Tell us about the property, required loan amount or specific bank preference..."
            value={formData.message}
            maxLength={1000} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'enquiry-message-error' : undefined}
            onChange={(e) => change('message', e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
          />
        </div>
        {errors.message && <p id="enquiry-message-error" role="alert" className="mt-1 text-[11px] text-red-700">{errors.message}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl shadow-glow transition-all flex items-center justify-center space-x-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{submitting ? 'Submitting…' : 'Request a callback'}</span>
        <Send className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};

