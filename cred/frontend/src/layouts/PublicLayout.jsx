import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { RealCredLogo } from '../components/common/RealCredLogo';
import { ToastContainer } from '../components/common/ToastContainer';
import { LeadDetailsModal } from '../components/modals/LeadDetailsModal';
import { publicLoanCategoriesApi } from '../services/api';
import {
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  UserCheck,
  Briefcase
} from 'lucide-react';

export const PublicLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [serviceCategories, setServiceCategories] = useState([]);
  const servicesMenuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    publicLoanCategoriesApi.getAll()
      .then((response) => { if (active) setServiceCategories(response.categories || []); })
      .catch(() => { if (active) setServiceCategories([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setServicesOpen(false);
    setMobileServicesOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!servicesMenuRef.current?.contains(event.target)) setServicesOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setServicesOpen(false);
        setMobileServicesOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Loan Services', path: '/services' },
    { name: 'EMI Calculator', path: '/emi-calculator' },
    { name: 'Check Eligibility', path: '/eligibility' },
    { name: 'Partner With Us', path: '/partner-register' },
    { name: 'Contact & FAQs', path: '/contact' },
    { name: 'CRM Login', path: '/login' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-[#DC2626] selection:text-white font-sans">
      
      {/* Main Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <RealCredLogo />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              if (link.name === 'Loan Services') {
                return (
                  <div
                    key={link.name}
                    ref={servicesMenuRef}
                    className="relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                  >
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={servicesOpen}
                      aria-controls="desktop-services-menu"
                      onClick={() => setServicesOpen((open) => !open)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setServicesOpen(true);
                          requestAnimationFrame(() => document.querySelector('#desktop-services-menu a')?.focus());
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${location.pathname === link.path ? 'text-[#DC2626] bg-red-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
                    >
                      {link.name}<span aria-hidden="true" className="text-[10px]"></span>
                    </button>
                    {servicesOpen && (
                      <div id="desktop-services-menu" role="menu" className="public-dropdown-enter absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        <Link role="menuitem" to="/services" className="block rounded-xl px-3 py-2 text-sm font-bold text-brand-navy hover:bg-slate-50">All loan services</Link>
                        {serviceCategories.map((category) => (
                          <Link role="menuitem" key={category._id || category.slug} to={`/services#${category.slug}`} className="block rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-brand-royal">
                            {category.name}
                          </Link>
                        ))}
                        {serviceCategories.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Browse available services</p>}
                      </div>
                    )}
                  </div>
                );
              }
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'text-[#DC2626] bg-red-50 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action CTA: Apply Now */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Apply Now Primary CTA */}
            <Link
              to="/apply"
              className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-extrabold shadow-md shadow-red-200 hover:shadow-lg transition-all flex items-center space-x-1.5 group cursor-pointer"
            >
              <span>Apply for Loan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-4 duration-200">
            {navLinks.map((link) => link.name === 'Loan Services' ? (
              <div key={link.name}>
                <button
                  type="button"
                  aria-expanded={mobileServicesOpen}
                  onClick={() => setMobileServicesOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {link.name}<span aria-hidden="true">{mobileServicesOpen ? '−' : '+'}</span>
                </button>
                {mobileServicesOpen && <div className="ml-3 border-l border-slate-200 pl-2">
                  <Link to="/services" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">All loan services</Link>
                  {serviceCategories.map((category) => <Link key={category._id || category.slug} to={`/services#${category.slug}`} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">{category.name}</Link>)}
                </div>}
              </div>
            ) : (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              <Link
                to="/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 bg-[#DC2626] text-white text-sm font-bold rounded-xl shadow-xs"
              >
                Apply for Loan Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Viewport */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            
            {/* Col 1 & 2: About RealCred */}
            <div className="lg:col-span-2 space-y-4">
              <RealCredLogo theme="light" />
              <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
                RealCred Technology Private Limited is a corporate loan distribution and financial services company connecting customers with suitable banking and NBFC solutions.
              </p>
              <p className="text-slate-400 text-xs italic">
                “ Your Loan. One Guided Route. “
              </p>
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/10 border border-white/10 font-mono text-[11px]">
                  Loan services
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/10 border border-white/10 font-mono text-[11px]">
                  Banks and NBFC listings
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#DC2626]" />
                  <span>Address & location- D-9, Ground Floor, Workshala,Vyapar Marg, Block D, Noida Sector 3, Noida, Uttar Pradesh 201301</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-[#DC2626]" />
                  <span>7048976349</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-[#DC2626]" />
                  <span>info@realcred.in</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-[#DC2626]" />
                  <span>Customercare@realcred.in</span>
                </div>
              </div>
            </div>

            {/* Col 3: Our Products */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold tracking-wide uppercase text-white">Our Products</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/services" className="hover:text-red-400 transition-colors">Home Loans (PSU & Private)</Link></li>
                <li><Link to="/services" className="hover:text-red-400 transition-colors">Loan Against Property (LAP)</Link></li>
                <li><Link to="/services" className="hover:text-red-400 transition-colors">Business & Working Capital</Link></li>
                <li><Link to="/services" className="hover:text-red-400 transition-colors">Personal Loan Express</Link></li>
                <li><Link to="/emi-calculator" className="hover:text-red-400 transition-colors">Dynamic EMI Tool</Link></li>
                <li><Link to="/eligibility" className="hover:text-red-400 transition-colors">Eligibility Calculator</Link></li>
              </ul>
            </div>

            {/* Col 4: Quick Navigation & Portals */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold tracking-wide uppercase text-white">Portals & Links</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/about" className="hover:text-red-400 transition-colors">About Us</Link></li>
                <li><Link to="/partner-register" className="hover:text-red-400 transition-colors">Partner With Us (DSA)</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-red-400 transition-colors font-semibold">Privacy Policy</Link></li>
                <li><Link to="/contact" className="hover:text-red-400 transition-colors">Contact Us & FAQs</Link></li>
              </ul>
            </div>

            {/* Col 5: Banking Network */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold tracking-wide uppercase text-white">Lending Network</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                View institution listings currently published by the RealCred team.
              </p>
              <div className="pt-2">
                <Link
                  to="/apply"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors"
                >
                  <span>Apply Online Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

          {/* Bottom Copyright & Legal */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 border-t border-slate-800">
            <p>© RealCred Technology Private Limited. All Rights Reserved.</p>
            <div className="flex space-x-6 text-[11px]">
              <Link to="/privacy-policy" className="hover:text-white transition-colors cursor-pointer">
                Privacy Policy
              </Link>
              <Link to="/contact" className="hover:text-white transition-colors cursor-pointer">
                Contact Information
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Modals & Notifications */}
      <LeadDetailsModal />
      <ToastContainer />
    </div>
  );
};
