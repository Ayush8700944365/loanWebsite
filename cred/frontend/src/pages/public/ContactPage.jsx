import React, { useEffect, useState } from 'react';
import { EnquiryForm } from '../../components/forms/EnquiryForm';
import { websiteContentApi } from '../../services/api';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Globe,
  Share2,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';

export const ContactPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  useEffect(() => { websiteContentApi.get().then((response) => setFaqs(response.content?.faqs || [])).catch((error) => console.error("Public FAQ fetch error:", error)); }, []);

  return (
    <div className="space-y-16 pb-20">
      <section className="bg-gradient-to-b from-blue-50/50 to-brand-bg pt-12 pb-14 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-royal bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
            Connect With Lending Desk
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-navy tracking-tight">
            Contact & Support Center
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Have questions about your ongoing file or need a custom loan quotation? Send your question through the form and the team can follow up using the details you provide.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Contact Cards & Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-6">
              <h2 className="text-xl font-bold text-brand-navy">Headquarters & Desk</h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-royal flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Registered Office</span>
                    <span className="text-slate-600 leading-relaxed">
                      Address & location- D-9, Ground Floor, Workshala,Vyapar Marg, Block D, Noida Sector 3, Noida, Uttar Pradesh 201301
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Direct Hotline</span>
                    <span className="text-slate-600">7048976349

</span>
                    <span className="block text-slate-500 font-mono"></span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Email Inquiries</span>
                    <span className="text-slate-600"></span>
                    <span className="block text-slate-500">info@realcred.in</span>
                    <span className="block text-slate-500">globalmarketing140@gmail.com</span>
                  </div>
                </div>
{/* 
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Business Hours</span>
                    <span className="text-slate-600">Business hours are not configured.</span>
                  </div>
                </div> */}
              </div>

              {/* Social Channels */}
              {/* <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Connect on Social</span>
                <div className="flex space-x-2">
                  {['LinkedIn', 'Twitter / X', 'YouTube', 'Facebook'].map((plat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-brand-royal hover:text-white cursor-pointer transition-colors"
                    >
                      {plat}
                    </span>
                  ))}
                </div>
              </div> */}
            </div>

            {/* Google Maps Location Preview UI */}
            
{/* Google Maps Real Office Location */}
<div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">

  <div className="flex items-center justify-between">
    <span className="text-xs font-bold text-slate-700">
      Office Location
    </span>
    <span className="text-[10px] text-brand-royal font-semibold">
      28.583139° N, 77.318750° E
    </span>
  </div>

  <div className="h-44 rounded-2xl border border-slate-200 overflow-hidden">
    <iframe
      title="Office Location"
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=28.583139,77.318750&z=17&output=embed"
    />
  </div>

  <a
    href="https://www.google.com/maps?q=28.583139,77.318750"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs font-semibold text-blue-600 hover:underline"
  >
    View on Google Maps →
  </a>

</div>

          </div>

          {/* Right Column: Callback Request Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-premium">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-royal bg-blue-50 px-3 py-1 rounded-full">
                Express Callback Desk
              </span>
              <h2 className="text-2xl font-extrabold text-brand-navy mt-2">
                Send Us a Message or Schedule a Callback
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill out the form below. A dedicated loan relationship officer will reach out with customized loan options.
              </p>
            </div>

            <EnquiryForm />
          </div>

        </div>
      </div>

      {/* FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-brand-navy">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Quick answers to common questions about REALCRED.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-brand-navy hover:text-brand-royal transition-colors"
                >
                  <span>{faq.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
