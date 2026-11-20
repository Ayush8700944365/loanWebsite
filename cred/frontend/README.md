# REALCRED – Complete Loan Management CRM & Fintech Website

> **"Your Dreams. Our Financial Support."**

REALCRED is a commercial-grade, modern, and visually stunning Loan Management CRM and public-facing financial platform built with React.js, Vite, and Tailwind CSS. The platform delivers four complete, interconnected frontend experiences designed with enterprise fintech SaaS aesthetics.

---

## 🌟 Four Core Portals

### 1. 🌐 Public Website
- **Landing Page**: High-conversion hero section, festive rate ribbons, trust indicators, interactive EMI calculator preview, loan category cards, Why Choose RealCred, 4-step process guide, customer testimonials, and quick lead capture.
- **About Us**: Corporate mission, 2030 vision, underwriting principles, and proven institutional track record.
- **Loan Categories**: Detailed product parameters for 6 major credit verticals:
  1. *Home Loan* (PSU & Private)
  2. *Personal Loan* (Express Disbursal)
  3. *Business Loan* (Working Capital)
  4. *Vehicle Loan* (Up to 100% on-road)
  5. *Loan Against Property (LAP)*
  6. *Education Loan* (Global Universities)
- **Interactive EMI Calculator**: Real-time sliders for Principal, Interest Rate, and Tenure with instant Donut Chart breakdown (Principal vs Interest) using Recharts.
- **Credit Eligibility Checker**: 55% FOIR banking capacity algorithm calculating maximum permissible borrowing based on income and existing EMIs.
- **Multi-Step Loan Application**: 4-step digital sanction flow (Personal Info, Loan Details, Encrypted Document Uploads, Review & Submit) with live lead ingestion into CRM.
- **Partner Registration Form**: Dedicated onboarding for DSAs, CAs, and channel partners.
- **Contact & Support Center**: Corporate headquarters details, BKC Mumbai map preview, social links, and interactive FAQ accordions.

---

### 2. 🛡️ Admin CRM Portal (`/admin`)
- **Executive Analytics Dashboard**:
  - 8 Gradient Metric Cards: Total Leads, New Leads, Verified Leads, Invoice Generated, Invoice Rejected, Rejected Leads, Payout Completed, Payout Failed.
  - Interactive Recharts: Monthly Loan Volume Trend (Area Chart), Pipeline Status Distribution (Donut Chart), Category Distribution (Bar Chart).
  - Date Filters: 1 Week, 1 Month, 1 Year, Custom range selector.
- **Leads Management**:
  - Multi-dimensional filters: Search by name/phone/ID, **SBI / Non-SBI** toggle, **Mine / Team** toggle.
  - Real-time status tabs with count badges: *All, New, Verified, Invoice Generated, Invoice Rejected, Rejected, Hold, Payout Failed, Payout Complete*.
  - Full CRUD interactions: View Details, Add Lead, Edit Status, Reassign Officer, and CSV Export.
- **Lead Details Modal**:
  - Large scrollable modal with 6 collapsible accordion sections:
    1. *Basic Information* (Identity, contacts, verified income)
    2. *Financial Details* (Loan Amount, Rinnraksha Insurance, Net Payout, Partner Commission)
    3. *Additional Information* (Partner attribution, Core Banking CBS account)
    4. *Status Timeline* (Chronological audit history with actors)
    5. *Uploaded Documents* (PDF cards with inspection & download actions)
    6. *Case Notes & Remarks* (Telephonic communication thread)
- **Employee Management**: Staff onboarding, active/inactive status toggle, target tracking, and lead workload allocation.
- **Partner (DSA) Management**: Channel partner registry, commission grid configuration, and performance tracking.
- **Invoice Management**: Complete annexure matching, UTR tracking, invoice status filters, and tax PDF downloads.
- **Commission & Payouts Ledger**: Automated NEFT disbursement tracking and GST reconciliation.
- **Audit & Analytics Reports**: Customizable reporting views with instant CSV/Excel export.
- **Guides & SOP Library**: Official bank circulars, commission matrices, and compliance PDFs.
- **Support Ticketing Hub**: Multi-category ticket management (Lead, Invoice, Other), conversation threads, and staff reply functionality.
- **Interior Referrals**: Cross-sell module tracking homebuyer interior design requirements and partner commissions.
- **Institutional Profile & Settings**: Read-only display of NBST license, registered BKC office, and corporate SBI current account.

---

### 3. 👤 Loan Officer Portal (`/employee`)
- **Officer Workspace**: Personalized interface for senior underwriting officer (*Rahul Deshmukh - EMP-101*).
- **Assigned Cases Queue**: Filtered view displaying only leads allocated to the officer.
- **Follow-up Management**: Calendar/list schedule for upcoming client calls, reminder statuses, and follow-up creation.
- **Document Verification Hub**: Dedicated document inspector allowing officers to review and mark customer KYC as *Verified* or *Pending*.
- **Officer Profile**: Accreditations, sanction authority limits, and monthly targets.

---

### 4. 🤝 Partner (DSA) Portal (`/partner`)
- **Channel Partner Workspace**: Dedicated dashboard for partner firm (*Apex Realty Finserve - PRT-301*).
- **My Sourced Leads**: Real-time status cards showing live bank sanction progress.
- **Submit New Lead**: Streamlined lead intake form with branch designation and document attachment.
- **Commission & Payout History**: Transparent ledger tracking gross earnings, pending payouts, and NEFT UTR numbers.
- **Policy Circulars**: Partner access to confidential commission grids and bank checklists.
- **Partner Support Desk**: Direct escalation channel to RealCred operations.

---

## 🎨 Brand Identity & Design System

- **Primary Navy**: `#142B4A`
- **Royal Blue**: `#2864DC`
- **Electric Blue**: `#4385F5`
- **Teal Accent**: `#16B8A6`
- **Soft Background**: `#F4F7FC`
- **Surface White**: `#FFFFFF`
- **Dark Text**: `#1B263B`
- **Muted Text**: `#7C8798`
- **Typography**: Plus Jakarta Sans (Google Fonts)

---

## 🛠️ Technology Stack

- **React 18.3.1**
- **Vite 5.4.14**
- **React Router DOM 6.29.0**
- **Tailwind CSS 3.4.17**
- **Recharts 2.15.1** (Dynamic analytics, area charts, donut graphs, and vertical bars)
- **Lucide React 0.474.0** (Fintech and enterprise iconography)
- **Framer Motion 11.18.2** (Smooth transitions and animations)

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The application will start at `http://localhost:5173/`.

### 3. Build for Production
```bash
npm run build
```

The optimized static production bundle will be generated in `dist/`.

---

## 💡 Client Presentation Tip

At the top of the interface, a persistent **Enterprise Fintech Demo Bar** allows you to switch between the 4 portals with a single click:
- `Public Site` (`/`)
- `Admin Portal` (`/admin`)
- `Employee Portal` (`/employee`)
- `Partner Portal` (`/partner`)

All data changes (submitting a loan application, updating lead status, scheduling follow-ups, and raising support tickets) are dynamically stored in the central React state and synchronized with `localStorage` for a continuous live demo experience.

