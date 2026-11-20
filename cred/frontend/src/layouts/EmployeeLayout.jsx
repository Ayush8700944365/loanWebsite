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
  CalendarClock,
  FolderOpen,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Bell,
  Search,
  LifeBuoy,
} from "lucide-react";

export const EmployeeLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { leads, followUps, showToast } = useApp();

  const { user, logout } = useAuth();

  // Active authenticated or assigned leads
  const myLeads = leads.filter(
    (lead) => Boolean(user?.employeeCode) && lead.assignedEmployeeId === user.employeeCode,
  );

  const pendingFollowupsCount = followUps.filter(
    (f) => f.reminderStatus === "Scheduled",
  ).length;

  const sidebarItems = [
    { name: "Dashboard", path: "/employee", icon: LayoutDashboard },
    {
      name: "My Leads",
      path: "/employee/leads",
      icon: FileCheck2,
      badge: myLeads.length,
    },
    {
      name: "Follow-ups",
      path: "/employee/followups",
      icon: CalendarClock,
      badge: pendingFollowupsCount,
    },
    { name: "Documents", path: "/employee/documents", icon: FolderOpen },
    { name: "Support Tickets", path: "/employee/tickets", icon: LifeBuoy },
    { name: "Profile", path: "/employee/profile", icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    showToast("Loan Officer signed out", "info");
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-brand-bg text-brand-dark">
      {/* Fixed Officer Sidebar (100% viewport height, permanent left anchor, never scrolls with page) */}
      <aside
        className={`h-full flex flex-col flex-shrink-0 bg-slate-900 text-white transition-all duration-300 z-30 shadow-2xl relative ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header: Logo & Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          {!collapsed ? (
            <RealCredLogo theme="light" to="/employee" />
          ) : (
            <div className="mx-auto">
              <RealCredLogo theme="light" variant="compact" to="/employee" />
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

        {/* Officer Role Badge */}
        {!collapsed && (
          <div className="mx-3 my-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-[11px] flex-shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <div className="font-bold text-emerald-300 truncate">
                {user?.name || "Employee"}
              </div>
              <div className="text-[10px] text-slate-400">
                Loan Officer ({user?.employeeCode || ""})
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items (Scrolls independently within sidebar only if necessary) */}
        <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md font-bold"
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
                        ? "bg-white text-emerald-700"
                        : "bg-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Compact Footer */}
        <div className="p-3 border-t border-white/10 bg-[#070e1b] flex-shrink-0">
          {!collapsed ? (
            <div className="text-center text-[10px] text-slate-400">
              RealCred Underwriting Desk • RACPC Hub
            </div>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto" />
          )}
        </div>
      </aside>

      {/* Main Content Layout Body (Independent vertical scroll container) */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Fixed Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Portal:
            </span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              Loan Officer Workspace
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Queue:{" "}
              <strong className="text-slate-800">{myLeads.length} files</strong>
            </span>
            <Link
              to="/employee/followups"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Today's Follow-ups</span>
            </Link>

            {/* Header Quick Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Sign Out Officer Desk"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ONLY THIS VIEWPORT SCROLLS VERTICALLY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
          <Outlet />
        </main>
      </div>

      <LeadDetailsModal />
      <ToastContainer />
    </div>
  );
};
