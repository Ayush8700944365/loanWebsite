import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { EmployeeLayout } from "../layouts/EmployeeLayout";
import { PartnerLayout } from "../layouts/PartnerLayout";

// Route Protection
import { ProtectedRoute } from "../components/common/ProtectedRoute";

// Public Pages
const HomePage = lazy(() => import("../pages/public/HomePage").then((module) => ({ default: module.HomePage })));
const AboutPage = lazy(() => import("../pages/public/AboutPage").then((module) => ({ default: module.AboutPage })));
const ServicesPage = lazy(() => import("../pages/public/ServicesPage").then((module) => ({ default: module.ServicesPage })));
const EMICalculatorPage = lazy(() => import("../pages/public/EMICalculatorPage").then((module) => ({ default: module.EMICalculatorPage })));
const EligibilityPage = lazy(() => import("../pages/public/EligibilityPage").then((module) => ({ default: module.EligibilityPage })));
const ApplyPage = lazy(() => import("../pages/public/ApplyPage").then((module) => ({ default: module.ApplyPage })));
const PartnerRegisterPage = lazy(() => import("../pages/public/PartnerRegisterPage").then((module) => ({ default: module.PartnerRegisterPage })));
const PartnerCorrectionPage = lazy(() => import("../pages/public/PartnerCorrectionPage").then((module) => ({ default: module.PartnerCorrectionPage })));
const ContactPage = lazy(() => import("../pages/public/ContactPage").then((module) => ({ default: module.ContactPage })));
const PrivacyPolicyPage = lazy(() => import("../pages/public/PrivacyPolicyPage").then((module) => ({ default: module.PrivacyPolicyPage })));
const CentralizedLoginPage = lazy(() => import("../pages/public/CentralizedLoginPage").then((module) => ({ default: module.CentralizedLoginPage })));
const PasswordRecoveryPage = lazy(() => import("../pages/public/PasswordRecoveryPage").then((module) => ({ default: module.PasswordRecoveryPage })));
const ChangePasswordPage = lazy(() => import("../pages/shared/ChangePasswordPage").then((module) => ({ default: module.ChangePasswordPage })));

// Admin Pages
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const AdminLeadsPage = lazy(() => import("../pages/admin/AdminLeadsPage").then((module) => ({ default: module.AdminLeadsPage })));
const AdminApplicationsPage = lazy(() => import("../pages/admin/AdminApplicationsPage").then((module) => ({ default: module.AdminApplicationsPage })));
const AdminCustomersPage = lazy(() => import("../pages/admin/AdminCustomersPage").then((module) => ({ default: module.AdminCustomersPage })));
const AdminTasksFollowupsPage = lazy(() => import("../pages/admin/AdminTasksFollowupsPage").then((module) => ({ default: module.AdminTasksFollowupsPage })));
const AdminDocVerificationPage = lazy(() => import("../pages/admin/AdminDocVerificationPage").then((module) => ({ default: module.AdminDocVerificationPage })));
const AdminBanksNbfcPage = lazy(() => import("../pages/admin/AdminBanksNbfcPage").then((module) => ({ default: module.AdminBanksNbfcPage })));
const AdminEmployeesPage = lazy(() => import("../pages/admin/AdminEmployeesPage").then((module) => ({ default: module.AdminEmployeesPage })));
const AdminPartnersPage = lazy(() => import("../pages/admin/AdminPartnersPage").then((module) => ({ default: module.AdminPartnersPage })));
const AdminLoanCategoriesPage = lazy(() => import("../pages/admin/AdminLoanCategoriesPage").then((module) => ({ default: module.AdminLoanCategoriesPage })));
const AdminWebsiteCmsPage = lazy(() => import("../pages/admin/AdminWebsiteCmsPage").then((module) => ({ default: module.AdminWebsiteCmsPage })));
const AdminInvoicesPage = lazy(() => import("../pages/admin/AdminInvoicesPage").then((module) => ({ default: module.AdminInvoicesPage })));
const AdminPayoutsPage = lazy(() => import("../pages/admin/AdminPayoutsPage").then((module) => ({ default: module.AdminPayoutsPage })));
const AdminReportsPage = lazy(() => import("../pages/admin/AdminReportsPage").then((module) => ({ default: module.AdminReportsPage })));
const AdminGuidesPage = lazy(() => import("../pages/admin/AdminGuidesPage").then((module) => ({ default: module.AdminGuidesPage })));
const AdminTicketsPage = lazy(() => import("../pages/admin/AdminTicketsPage").then((module) => ({ default: module.AdminTicketsPage })));
const AdminInteriorReferralsPage = lazy(() => import("../pages/admin/AdminInteriorReferralsPage").then((module) => ({ default: module.AdminInteriorReferralsPage })));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage").then((module) => ({ default: module.AdminSettingsPage })));
const AdminCommissionRulesPage = lazy(() => import("../pages/admin/AdminCommissionRulesPage").then((module) => ({ default: module.AdminCommissionRulesPage })));
const AdminDisbursementsPage = lazy(() => import("../pages/admin/AdminDisbursementsPage").then((module) => ({ default: module.AdminDisbursementsPage })));
const AdminDocumentTemplatesPage = lazy(() => import("../pages/admin/AdminDocumentTemplatesPage").then((module) => ({ default: module.AdminDocumentTemplatesPage })));

// Employee Pages
const EmployeeDashboardPage = lazy(() => import("../pages/employee/EmployeeDashboardPage").then((module) => ({ default: module.EmployeeDashboardPage })));
const EmployeeLeadsPage = lazy(() => import("../pages/employee/EmployeeLeadsPage").then((module) => ({ default: module.EmployeeLeadsPage })));
const EmployeeFollowupsPage = lazy(() => import("../pages/employee/EmployeeFollowupsPage").then((module) => ({ default: module.EmployeeFollowupsPage })));
const EmployeeDocumentsPage = lazy(() => import("../pages/employee/EmployeeDocumentsPage").then((module) => ({ default: module.EmployeeDocumentsPage })));
const EmployeeProfilePage = lazy(() => import("../pages/employee/EmployeeProfilePage").then((module) => ({ default: module.EmployeeProfilePage })));

// Partner Pages
const PartnerDashboardPage = lazy(() => import("../pages/partner/PartnerDashboardPage").then((module) => ({ default: module.PartnerDashboardPage })));
const PartnerLeadsPage = lazy(() => import("../pages/partner/PartnerLeadsPage").then((module) => ({ default: module.PartnerLeadsPage })));
const PartnerSubmitLeadPage = lazy(() => import("../pages/partner/PartnerSubmitLeadPage").then((module) => ({ default: module.PartnerSubmitLeadPage })));
const PartnerCommissionPage = lazy(() => import("../pages/partner/PartnerCommissionPage").then((module) => ({ default: module.PartnerCommissionPage })));
const PartnerPayoutsPage = lazy(() => import("../pages/partner/PartnerPayoutsPage").then((module) => ({ default: module.PartnerPayoutsPage })));
const PartnerInteriorReferralsPage = lazy(() => import("../pages/partner/PartnerInteriorReferralsPage").then((module) => ({ default: module.PartnerInteriorReferralsPage })));
const PartnerGuidesPage = lazy(() => import("../pages/partner/PartnerGuidesPage").then((module) => ({ default: module.PartnerGuidesPage })));
const SupportTicketsPage = lazy(() => import("../pages/shared/SupportTicketsPage").then((module) => ({ default: module.SupportTicketsPage })));
const PartnerProfilePage = lazy(() => import("../pages/partner/PartnerProfilePage").then((module) => ({ default: module.PartnerProfilePage })));

export const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="p-6 text-center" role="status">Loading page…</div>}><Routes>
      {/* 1. Public Website Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/emi-calculator" element={<EMICalculatorPage />} />
        <Route path="/eligibility" element={<EligibilityPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/partner-register" element={<PartnerRegisterPage />} />
        <Route path="/partner-correction/:token" element={<PartnerCorrectionPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      </Route>

      {/* 2. Centralized Authentication Entry Point */}
      <Route path="/login" element={<CentralizedLoginPage />} />
      <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
      <Route path="/reset-password" element={<PasswordRecoveryPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Legacy login paths automatically route to centralized login */}
      <Route path="/admin/login" element={<Navigate to="/login" replace state={{ role: "admin" }} />} />
      <Route
        path="/employee/login"
        element={<Navigate to="/login" replace state={{ role: "employee" }} />}
      />
      <Route path="/partner/login" element={<Navigate to="/login" replace state={{ role: "partner" }} />} />

      {/* 3. Protected Admin Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="tasks-followups" element={<AdminTasksFollowupsPage />} />
          <Route
            path="document-verification"
            element={<AdminDocVerificationPage />}
          />
          <Route path="banks-nbfc" element={<AdminBanksNbfcPage />} />
          <Route path="employees" element={<AdminEmployeesPage />} />
          <Route path="partners" element={<AdminPartnersPage />} />
          <Route path="loan-categories" element={<AdminLoanCategoriesPage />} />
          <Route path="website-cms" element={<AdminWebsiteCmsPage />} />
          <Route path="invoices" element={<AdminInvoicesPage />} />
          <Route path="payouts" element={<AdminPayoutsPage />} />
          <Route path="commission-rules" element={<AdminCommissionRulesPage />} />
          <Route path="disbursements" element={<AdminDisbursementsPage />} />
          <Route path="document-templates" element={<AdminDocumentTemplatesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="guides" element={<AdminGuidesPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route
            path="interior-referrals"
            element={<AdminInteriorReferralsPage />}
          />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* 4. Protected Employee Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={["employee"]} />}>
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<EmployeeDashboardPage />} />
          <Route
            path="dashboard"
            element={<Navigate to="/employee" replace />}
          />
          <Route path="leads" element={<EmployeeLeadsPage />} />
          <Route path="followups" element={<EmployeeFollowupsPage />} />
          <Route path="documents" element={<EmployeeDocumentsPage />} />
          <Route path="profile" element={<EmployeeProfilePage />} />
          <Route path="tickets" element={<SupportTicketsPage />} />
        </Route>
      </Route>

      {/* 5. Protected Partner Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={["partner"]} />}>
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<PartnerDashboardPage />} />
          <Route
            path="dashboard"
            element={<Navigate to="/partner" replace />}
          />
          <Route path="leads" element={<PartnerLeadsPage />} />
          <Route path="submit-lead" element={<PartnerSubmitLeadPage />} />
          <Route path="commission" element={<PartnerCommissionPage />} />
          <Route path="payouts" element={<PartnerPayoutsPage />} />
          <Route
            path="interior-referrals"
            element={<PartnerInteriorReferralsPage />}
          />
          <Route path="guides" element={<PartnerGuidesPage />} />
          <Route path="tickets" element={<SupportTicketsPage />} />
          <Route path="profile" element={<PartnerProfilePage />} />
        </Route>
      </Route>

      {/* Catch-all Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  );
};
