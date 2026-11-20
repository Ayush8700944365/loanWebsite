import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { RealCredLogo } from "../components/common/RealCredLogo";
import { ToastContainer } from "../components/common/ToastContainer";
import { LeadDetailsModal } from "../components/modals/LeadDetailsModal";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

import {
  LayoutDashboard,
  FileCheck2,
  PlusCircle,
  Banknote,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  LifeBuoy,
} from "lucide-react";

export const PartnerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { leads, showToast } = useApp();
  const { user, logout } = useAuth();

  // Only show leads belonging to the authenticated partner.
  const myPartnerLeads = leads.filter(
    (lead) => lead.partnerId === user?.partnerCode,
  );

  const sidebarItems = [
    {
      name: "Dashboard",
      path: "/partner",
      icon: LayoutDashboard,
    },
    {
      name: "My Leads",
      path: "/partner/leads",
      icon: FileCheck2,
      badge: myPartnerLeads.length,
    },
    {
      name: "Submit New Lead",
      path: "/partner/submit-lead",
      icon: PlusCircle,
    },
    {
      name: "Payouts",
      path: "/partner/payouts",
      icon: Banknote,
    },
    {
      name: "Partner Profile",
      path: "/partner/profile",
      icon: User,
    },
    {
      name: "Support Tickets",
      path: "/partner/tickets",
      icon: LifeBuoy,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Channel Partner signed out", "info");
      navigate("/login", { replace: true });
    } catch (error) {
      showToast("Unable to sign out. Please try again.", "error");
    }
  };

  const isItemActive = (path) => {
    if (path === "/partner") {
      return location.pathname === "/partner";
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const partnerName = user?.companyName || user?.name || "Partner";

  const partnerCode = user?.partnerCode || "Not assigned";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-brand-dark">
      {/* Partner Sidebar */}
      <aside
        className={`relative z-30 flex h-full flex-shrink-0 flex-col bg-[#0d1e33] text-white shadow-2xl transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-4">
          {!collapsed ? (
            <RealCredLogo theme="light" to="/partner" />
          ) : (
            <div className="mx-auto">
              <RealCredLogo theme="light" variant="compact" to="/partner" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white sm:block"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Authenticated Partner Identity */}
        {!collapsed && (
          <div className="mx-3 my-2 flex flex-shrink-0 items-center space-x-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px]">
            <Briefcase className="h-4 w-4 flex-shrink-0 text-amber-400" />

            <div className="overflow-hidden">
              <div className="truncate font-bold text-amber-300">
                {partnerName}
              </div>

              <div className="text-[10px] text-slate-400">
                DSA Code: {partnerCode}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="scrollbar-thin scrollbar-thumb-white/10 flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
          {sidebarItems.map((item) => {
            const active = isItemActive(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`group flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 font-bold text-white shadow-md"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    active
                      ? "text-amber-200"
                      : "text-slate-400 group-hover:text-white"
                  }`}
                />

                {!collapsed && (
                  <span className="ml-3 flex-1 truncate">{item.name}</span>
                )}

                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-white text-amber-800"
                        : "bg-amber-500/30 text-amber-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 border-t border-white/10 bg-[#071322] p-3">
          {!collapsed ? (
            <div className="text-center text-[10px] text-slate-400">
              RealCred Partner Portal
            </div>
          ) : (
            <div className="mx-auto h-2.5 w-2.5 rounded-full bg-amber-400" />
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="z-20 flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Portal:
            </span>

            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
              DSA Channel Partner Desk
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/partner/submit-lead"
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:from-amber-700 hover:to-amber-800"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Submit Customer Lead</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex cursor-pointer items-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
              title="Sign Out Partner"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <LeadDetailsModal />
      <ToastContainer />
    </div>
  );
};

export default PartnerLayout;
