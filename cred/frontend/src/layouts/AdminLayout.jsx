import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { RealCredLogo } from "../components/common/RealCredLogo";
import { DemoRoleBar } from "../components/common/DemoRoleBar";
import { ToastContainer } from "../components/common/ToastContainer";
import { LeadDetailsModal } from "../components/modals/LeadDetailsModal";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Layers,
  Banknote,
  Percent,
  BadgeCheck,
  Files,
  BarChart3,
  BookOpen,
  LifeBuoy,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Home,
  CheckCircle2,
  UserCheck,
  Palette,
  Sofa,
  CalendarClock,
  ShieldCheck,
  Landmark,
  Calendar,
} from "lucide-react";

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { leads, tickets, invoices, showToast } = useApp();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const newLeadsCount = (leads || []).filter(
    (l) => l.currentStatus === "New",
  ).length;
  const openTicketsCount = (tickets || []).filter(
    (t) => t.status === "Open",
  ).length;

  // Restructured Admin Sidebar: exactly 12 modules in required order
  const adminSidebarItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    {
      name: "Leads Management",
      path: "/admin/leads",
      icon: FileCheck2,
      badge: newLeadsCount,
    },
    { name: "Employees", path: "/admin/employees", icon: Users },
    { name: "Partners", path: "/admin/partners", icon: Briefcase },
    { name: "Loan Categories", path: "/admin/loan-categories", icon: Layers },
    { name: "Banks & NBFC", path: "/admin/banks-nbfc", icon: Landmark },
    { name: "Website Management", path: "/admin/website-cms", icon: Palette },
    {
      name: "Invoices",
      path: "/admin/invoices",
      icon: FileSpreadsheet,
      badge: invoices?.length,
    },
    { name: "Payments", path: "/admin/payouts", icon: Banknote },
    { name: "Commission Rules", path: "/admin/commission-rules", icon: Percent },
    { name: "Document Verification", path: "/admin/document-verification", icon: FileText },
    { name: "Disbursement Review", path: "/admin/disbursements", icon: BadgeCheck },
    { name: "Document Templates", path: "/admin/document-templates", icon: Files },
    { name: "Reports & Analytics", path: "/admin/reports", icon: BarChart3 },
    { name: "Guides & Documents", path: "/admin/guides", icon: BookOpen },
    {
      name: "Support Tickets",
      path: "/admin/tickets",
      icon: LifeBuoy,
      badge: openTicketsCount,
    },
    { name: "Profile", path: "/admin/settings", icon: UserRound },
  ];

  const handleLogout = async () => {
    await logout();
    showToast("Admin session signed out", "info");
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-100 text-slate-900 font-sans">
      {/* Collapsible Fixed Admin Sidebar (Permanent left anchor, 100% viewport height, never scrolls with page) */}
      <aside
        className={`h-full flex flex-col flex-shrink-0 bg-[#0B132B] text-white transition-all duration-300 z-30 shadow-2xl relative ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header: Logo & Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          {!collapsed ? (
            <RealCredLogo theme="light" to="/admin" />
          ) : (
            <div className="mx-auto">
              <RealCredLogo theme="light" variant="compact" to="/admin" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items (Scrolls independently within sidebar only if screen is tiny) */}
        <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {adminSidebarItems.map((item) => {
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-[#DC2626] text-white shadow-md shadow-red-900/30 font-bold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white"
                  }`}
                />
                {!collapsed && (
                  <span className="ml-3 flex-1 truncate">{item.name}</span>
                )}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white text-[#DC2626]"
                        : "bg-[#DC2626]/80 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: Profile Information */}
        <div className="p-3 border-t border-white/10 bg-[#070D1E]/60 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 ring-2 ring-blue-400/40">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || "Administrator"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || "Admin Account"}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-full bg-[#1E3A8A] text-white font-bold text-xs flex items-center justify-center ring-2 ring-blue-400/40">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
          )}
        </div>
      </aside>

      {/* Admin Main Layout Body (Independent vertical scroll container) */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Top Admin Navigation Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 z-20">
          {/* Search Input */}
          <div className="relative max-w-lg w-full hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search leads, customers, applications..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#DC2626] focus:bg-white transition-all"
            />
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center space-x-3 ml-auto">

            {/* Quick Add Lead CTA */}
            <Link
              to="/admin/leads?action=add"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Lead</span>
            </Link>

            {/* Live Link to Public Site */}
            <Link
              to="/"
              title="View Live Public Website"
              className="hidden md:flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>

            {/* Top Header Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ONLY THIS VIEWPORT SCROLLS VERTICALLY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <LeadDetailsModal />
      <ToastContainer />
    </div>
  );
};
