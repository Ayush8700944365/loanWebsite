import React, { useEffect, useMemo, useState } from "react";

import { useApp } from "../../context/AppContext";

import { exportToCSV } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Briefcase,
  FileSpreadsheet,
  Wallet,
  IndianRupee,
  TrendingUp,
  FileText,
} from "lucide-react";

const COLORS = [
  "#2864DC",

  "#16B8A6",

  "#F59E0B",

  "#8B5CF6",

  "#EF4444",

  "#64748B",
];

const CURRENCY = (value) =>
  `â‚¹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const dateValue = (record, fields) => {
  for (const field of fields) {
    if (record?.[field]) {
      const raw = record[field];

      let parsed = new Date(raw);

      // AppContext may expose display dates as DD/MM/YYYY.

      if (Number.isNaN(parsed.getTime()) && typeof raw === "string") {
        const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

        if (match)
          parsed = new Date(
            Number(match[3]),

            Number(match[2]) - 1,

            Number(match[1]),
          );
      }

      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
};

const sum = (records, field) =>
  records.reduce((total, item) => total + Number(item?.[field] || 0), 0);

const inRange = (record, fields, start, end) => {
  if (!start && !end) return true;

  const date = dateValue(record, fields);

  if (!date) return false;

  return (!start || date >= start) && (!end || date <= end);
};

const getRange = (range) => {
  const now = new Date();

  const year = now.getFullYear();

  const month = now.getMonth();

  if (range === "all")
    return { start: null, end: null, label: "All available records" };

  if (range === "fy") {
    const fyStartYear = month >= 3 ? year : year - 1;

    return {
      start: new Date(fyStartYear, 3, 1),

      end: new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999),

      label: `Financial Year ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
    };
  }

  if (range === "quarter") {
    // Indian financial-year quarters: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar.

    const quarterStartMonth = Math.floor(((month + 9) % 12) / 3) * 3;

    const startMonth = (quarterStartMonth + 3) % 12;

    const startYear = month >= 3 ? year : year - 1;

    const actualStartYear = startMonth > month ? startYear - 1 : startYear;

    const start = new Date(actualStartYear, startMonth, 1);

    const end = new Date(actualStartYear, startMonth + 3, 0, 23, 59, 59, 999);

    return { start, end, label: "Current Financial Quarter" };
  }

  const start = new Date(year, month - 1, 1);

  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start,

    end,

    label: start.toLocaleDateString("en-IN", {
      month: "long",

      year: "numeric",
    }),
  };
};

const monthKey = (date) =>
  date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

export const AdminReportsPage = () => {
  const {
    leads = [],

    employees = [],

    partners = [],

    invoices = [],

    payouts = [],

    showToast,
  } = useApp();

  const [reportType, setReportType] = useState("leads");

  const [timeRange, setTimeRange] = useState("fy");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const range = useMemo(() => getRange(timeRange), [timeRange]);

  const filteredLeads = useMemo(
    () =>
      leads.filter((item) =>
        inRange(item, ["createdAt", "createdDate"], range.start, range.end),
      ),

    [leads, range],
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((item) =>
        inRange(item, ["invoiceDate", "createdAt"], range.start, range.end),
      ),

    [invoices, range],
  );

  const filteredPayouts = useMemo(
    () =>
      payouts.filter((item) =>
        inRange(item, ["paymentDate", "createdAt"], range.start, range.end),
      ),

    [payouts, range],
  );

  const leadStatusData = useMemo(() => {
    const counts = filteredLeads.reduce((acc, lead) => {
      const status = lead.currentStatus || "Unspecified";

      acc[status] = (acc[status] || 0) + 1;

      return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const employeeData = useMemo(
    () =>
      employees.map((employee) => {
        const code = employee.employeeCode || employee.id;

        const assigned = filteredLeads.filter(
          (lead) =>
            lead.assignedEmployeeId === code ||
            lead.assignedEmployeeId === employee.id,
        );

        const converted = assigned.filter((lead) =>
          ["Sanctioned", "Disbursed", "Payout Complete"].includes(
            lead.currentStatus,
          ),
        ).length;

        return {
          id: code,

          name: employee.name || employee.fullName || code || "Employee",

          designation: employee.designation || employee.role || "â€”",

          status: employee.status || "â€”",

          assigned: assigned.length,

          converted,

          conversionRate: assigned.length
            ? Number(((converted / assigned.length) * 100).toFixed(1))
            : 0,
        };
      }),

    [employees, filteredLeads],
  );

  const partnerData = useMemo(
    () =>
      partners.map((partner) => {
        const code = partner.partnerCode || partner.id;

        const partnerLeads = filteredLeads.filter(
          (lead) => lead.partnerId === code || lead.partnerId === partner.id,
        );

        const records = filteredPayouts.filter(
          (payout) => payout.partnerId === code,
        );

        const paid = records.filter((payout) => payout.status === "Paid");

        const pending = records.filter((payout) =>
          ["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"].includes(payout.status),
        );

        const failed = records.filter(
          (payout) => payout.status === "Payout Failed",
        );

        return {
          id: code,

          name: partner.companyName || partner.name || code || "Partner",

          leads: partnerLeads.length,

          payoutRecords: records.length,

          commission: sum(records, "amount"),

          paid: sum(paid, "amount"),

          pending: sum(pending, "amount"),

          failed: sum(failed, "amount"),

          gst: sum(records, "gstAmount"),

          payable: sum(records, "totalAmount"),
        };
      }),

    [partners, filteredLeads, filteredPayouts],
  );

  const payoutSummary = useMemo(
    () => ({
      total: sum(filteredPayouts, "amount"),

      paid: sum(
        filteredPayouts.filter((p) => p.status === "Paid"),

        "amount",
      ),

      pending: sum(
        filteredPayouts.filter((p) =>
          ["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"].includes(p.status),
        ),

        "amount",
      ),

      failed: sum(
        filteredPayouts.filter((p) => p.status === "Payout Failed"),

        "amount",
      ),

      gst: sum(filteredPayouts, "gstAmount"),

      payable: sum(filteredPayouts, "totalAmount"),
    }),

    [filteredPayouts],
  );

  const invoiceSummary = useMemo(
    () => ({
      total: filteredInvoices.length,

      amount: sum(filteredInvoices, "invoiceAmount"),

      paid: filteredInvoices.filter((i) => i.invoiceStatus === "Paid").length,

      pending: filteredInvoices.filter((i) =>
        ["Pending", "Payment Initiated"].includes(i.invoiceStatus),
      ).length,
    }),

    [filteredInvoices],
  );

  const monthlyData = useMemo(() => {
    const buckets = new Map();

    const add = (record, fields, key) => {
      const date = dateValue(record, fields);

      if (!date) return;

      const id = `${date.getFullYear()}-${date.getMonth()}`;

      if (!buckets.has(id))
        buckets.set(id, {
          id,

          date: new Date(date.getFullYear(), date.getMonth(), 1),

          period: monthKey(date),

          leads: 0,

          invoices: 0,

          payouts: 0,
        });

      buckets.get(id)[key] += 1;
    };

    filteredLeads.forEach((item) =>
      add(item, ["createdAt", "createdDate"], "leads"),
    );

    filteredInvoices.forEach((item) =>
      add(item, ["invoiceDate", "createdAt"], "invoices"),
    );

    filteredPayouts.forEach((item) =>
      add(item, ["paymentDate", "createdAt"], "payouts"),
    );

    return [...buckets.values()].sort((a, b) => a.date - b.date).slice(-12);
  }, [filteredLeads, filteredInvoices, filteredPayouts]);

  const tabs = [
    { id: "leads", label: "Lead Pipeline", icon: BarChart3 },

    { id: "employees", label: "Employee Performance", icon: Users },

    { id: "partners", label: "Partner Performance", icon: Briefcase },

    { id: "invoices", label: "Invoice Audit", icon: FileSpreadsheet },

    { id: "payouts", label: "Payout Ledger", icon: Wallet },
  ];

  const exportRows = () => {
    if (reportType === "leads")
      return filteredLeads.map((l) => ({
        LeadCode: formatLeadUid(l.leadCode || l.id),

        Customer: l.customerName,

        Phone: l.phone,

        LeadType: l.leadType,

        LoanCategory: l.loanCategory,

        LoanAmount: l.loanAmount,

        Status: l.currentStatus,

        AssignedEmployee: l.assignedEmployee,

        Partner: l.partnerName,

        CreatedAt: l.createdAt || l.createdDate,
      }));

    if (reportType === "employees")
      return employeeData.map((e) => ({
        Employee: e.name,

        EmployeeCode: e.id,

        Designation: e.designation,

        AssignedLeads: e.assigned,

        ConvertedLeads: e.converted,

        ConversionRate: `${e.conversionRate}%`,
      }));

    if (reportType === "partners")
      return partnerData.map((p) => ({
        Partner: p.name,

        PartnerCode: p.id,

        Leads: p.leads,

        PayoutRecords: p.payoutRecords,

        Commission: p.commission,

        PaidCommission: p.paid,

        PendingCommission: p.pending,

        FailedCommission: p.failed,

        GST: p.gst,

        TotalPayable: p.payable,
      }));

    if (reportType === "invoices")
      return filteredInvoices.map((i) => ({
        InvoiceNumber: i.invoiceNumber,

        Date: i.invoiceDate || i.createdAt,

        Customer: i.customerName,

        LeadId: i.leadId ? formatLeadUid(i.leadId) : "",

        Bank: i.bankName,

        LoanAmount: i.loanAmount,

        InvoiceAmount: i.invoiceAmount,

        Status: i.invoiceStatus,

        AnnexureNumber: i.annexureNumber,

        UTR: i.utr,
      }));

    return filteredPayouts.map((p) => ({
      PaymentNumber: p.paymentNumber,

      Partner: p.partnerName,

      PartnerCode: p.partnerId,

      LeadId: p.leadId ? formatLeadUid(p.leadId) : "",

      Customer: p.customerName,

      LoanAmount: p.loanAmount,

      CommissionPercentage: p.commissionPercentage,

      Commission: p.amount,

      GST: p.gstAmount,

      TotalPayable: p.totalAmount,

      Status: p.status,

      PaymentDate: p.paymentDate,

      UTR: p.utr,
    }));
  };

  const handleExport = () => {
    const rows = exportRows();

    if (!rows.length) {
      showToast?.(
        "No records available for this report and date range.",

        "info",
      );

      return;
    }

    exportToCSV(rows, `realcred_${reportType}_report_${Date.now()}.csv`);

    showToast?.(
      `${tabs.find((tab) => tab.id === reportType)?.label} exported successfully.`,

      "success",
    );
  };

  const handleExportPDF = () => {
    const rows = exportRows();
    if (!rows.length) {
      showToast?.(
        "No records available for this report and date range.",
        "info",
      );
      return;
    }

    const escapeHTML = (value) =>
      String(value ?? "â€”").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      );

    const reportTitle =
      tabs.find((tab) => tab.id === reportType)?.label || "CRM Report";
    const columns = Object.keys(rows[0]);
    const tableHead = columns
      .map(
        (column) =>
          `<th>${escapeHTML(column.replace(/([A-Z])/g, " $1").trim())}</th>`,
      )
      .join("");
    const tableBody = rows
      .map(
        (row) =>
          `<tr>${columns
            .map((column) => `<td>${escapeHTML(row[column])}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast?.("Please allow pop-ups to export the PDF.", "error");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>RealCred ${escapeHTML(reportTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #172b4d; margin: 24px; }
            header { border-bottom: 3px solid #2864dc; padding-bottom: 14px; margin-bottom: 18px; }
            h1 { margin: 0 0 5px; font-size: 22px; }
            .subtitle { margin: 0; color: #64748b; font-size: 12px; }
            .meta { display: flex; justify-content: space-between; gap: 12px; margin: 16px 0; font-size: 11px; }
            .summary { background: #f1f5f9; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #142b4a; color: white; text-align: left; padding: 8px 6px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 7px 6px; overflow-wrap: anywhere; }
            tr:nth-child(even) td { background: #f8fafc; }
            footer { margin-top: 16px; text-align: center; color: #64748b; font-size: 9px; }
            @page { size: landscape; margin: 12mm; }
            @media print { body { margin: 0; } thead { display: table-header-group; } tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <header>
            <h1>REALCRED TECHNOLOGY PRIVATE LIMITED</h1>
            <p class="subtitle">Reports &amp; Analytics Â· ${escapeHTML(reportTitle)}</p>
          </header>
          <div class="meta">
            <span><strong>Report:</strong> ${escapeHTML(reportTitle)}</span>
            <span><strong>Period:</strong> ${escapeHTML(range.label)}</span>
            <span><strong>Generated:</strong> ${escapeHTML(new Date().toLocaleString("en-IN"))}</span>
          </div>
          <div class="summary"><strong>Total records:</strong> ${rows.length}</div>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
          <footer>Generated from the RealCred CRM Â· Confidential</footer>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const statCards =
    reportType === "employees"
      ? [
          { label: "Total Employees", value: employees.length, icon: Users },

          {
            label: "Assigned Leads",

            value: employeeData.reduce((n, e) => n + e.assigned, 0),

            icon: FileText,
          },

          {
            label: "Converted Leads",

            value: employeeData.reduce((n, e) => n + e.converted, 0),

            icon: TrendingUp,
          },

          {
            label: "Overall Conversion",

            value: `${
              filteredLeads.length
                ? (
                    (employeeData.reduce((n, e) => n + e.converted, 0) /
                      Math.max(
                        1,

                        employeeData.reduce((n, e) => n + e.assigned, 0),
                      )) *
                    100
                  ).toFixed(1)
                : "0.0"
            }%`,

            icon: BarChart3,
          },
        ]
      : reportType === "partners"
        ? [
            {
              label: "Total Partners",

              value: partners.length,

              icon: Briefcase,
            },

            {
              label: "Partner Leads",

              value: partnerData.reduce((n, p) => n + p.leads, 0),

              icon: Users,
            },

            {
              label: "Commission Generated",

              value: CURRENCY(payoutSummary.total),

              icon: IndianRupee,
            },

            {
              label: "Paid Commission",

              value: CURRENCY(payoutSummary.paid),

              icon: Wallet,
            },
          ]
        : reportType === "invoices"
          ? [
              {
                label: "Invoices",

                value: invoiceSummary.total,

                icon: FileSpreadsheet,
              },

              {
                label: "Invoice Value",

                value: CURRENCY(invoiceSummary.amount),

                icon: IndianRupee,
              },

              {
                label: "Paid Invoices",

                value: invoiceSummary.paid,

                icon: TrendingUp,
              },

              {
                label: "Pending Invoices",

                value: invoiceSummary.pending,

                icon: Calendar,
              },
            ]
          : reportType === "payouts"
            ? [
                {
                  label: "Payout Records",

                  value: filteredPayouts.length,

                  icon: Wallet,
                },

                {
                  label: "Commission",

                  value: CURRENCY(payoutSummary.total),

                  icon: IndianRupee,
                },

                {
                  label: "Paid Commission",

                  value: CURRENCY(payoutSummary.paid),

                  icon: TrendingUp,
                },

                {
                  label: "Pending Commission",

                  value: CURRENCY(payoutSummary.pending),

                  icon: Calendar,
                },
              ]
            : [
                {
                  label: "Total Leads",

                  value: filteredLeads.length,

                  icon: Users,
                },

                {
                  label: "Pipeline Loan Value",

                  value: CURRENCY(sum(filteredLeads, "loanAmount")),

                  icon: IndianRupee,
                },

                {
                  label: "Sanctioned / Disbursed",

                  value: filteredLeads.filter((l) =>
                    ["Sanctioned", "Disbursed", "Payout Complete"].includes(
                      l.currentStatus,
                    ),
                  ).length,

                  icon: TrendingUp,
                },

                {
                  label: "Unassigned Leads",

                  value: filteredLeads.filter((l) => !l.assignedEmployeeId)
                    .length,

                  icon: FileText,
                },
              ];

  const tableRows =
    reportType === "leads"
      ? filteredLeads
      : reportType === "employees"
        ? employeeData
        : reportType === "partners"
          ? partnerData
          : reportType === "invoices"
            ? filteredInvoices
            : filteredPayouts;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const pageRows = tableRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [reportType, timeRange]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  const formatDate = (value) => {
    if (!value) return "â€”";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("en-IN");
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Reports & Analytics
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Live management reports from CRM leads, employees, partners,
            invoices and payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold shadow-glow flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all ${reportType === tab.id ? "bg-white text-brand-navy shadow-xs font-extrabold" : "hover:text-slate-900"}`}
              >
                <Icon className="w-3.5 h-3.5" />

                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-slate-800"
          >
            <option value="quarter">Current Financial Quarter</option>

            <option value="fy">Current Financial Year</option>

            <option value="previous">Previous Month</option>

            <option value="all">All Time Records</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  {card.label}
                </p>

                <span className="p-2 rounded-xl bg-blue-50 text-brand-royal">
                  <Icon className="w-4 h-4" />
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-brand-navy break-words">
                {card.value}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">{range.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-extrabold text-brand-navy text-base">
                {reportType === "employees"
                  ? "Employee Lead Conversion"
                  : reportType === "partners"
                    ? "Partner Commission Summary"
                    : reportType === "invoices"
                      ? "Invoice Amount by Month"
                      : reportType === "payouts"
                        ? "Payout Records by Month"
                        : "Monthly CRM Activity"}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                {range.label} Â· Based on available CRM records
              </p>
            </div>

            <span className="text-xs font-bold text-brand-royal bg-blue-50 px-2.5 py-1 rounded-full">
              Live CRM Data
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {reportType === "employees" ? (
                <BarChart data={employeeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="assigned"
                    fill="#2864DC"
                    name="Assigned Leads"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="converted"
                    fill="#16B8A6"
                    name="Converted Leads"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : reportType === "partners" ? (
                <BarChart data={partnerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    tickFormatter={(v) =>
                      `â‚¹${Number(v).toLocaleString("en-IN")}`
                    }
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip formatter={(v) => CURRENCY(v)} />

                  <Legend />

                  <Bar
                    dataKey="commission"
                    fill="#D97706"
                    name="Commission (excl. GST)"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="paid"
                    fill="#16B8A6"
                    name="Paid Commission"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : reportType === "invoices" ? (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Bar
                    dataKey="invoices"
                    fill="#8B5CF6"
                    name="Invoices"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : reportType === "payouts" ? (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Bar
                    dataKey="payouts"
                    fill="#8B5CF6"
                    name="Payout Records"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="leads"
                    fill="#2864DC"
                    name="Leads Created"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="invoices"
                    fill="#16B8A6"
                    name="Invoices Created"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="payouts"
                    fill="#8B5CF6"
                    name="Payout Records"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-brand-navy text-base">
            Lead Status Breakdown
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Current status of leads in selected period
          </p>

          {leadStatusData.length ? (
            <>
              <div className="h-52 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={78}
                      innerRadius={42}
                      paddingAngle={2}
                    >
                      {leadStatusData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 max-h-28 overflow-y-auto">
                {leadStatusData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />

                      {entry.name}
                    </span>

                    <strong className="text-slate-800">{entry.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No lead records in this period.
            </div>
          )}
        </div>
      </div>

      {reportType === "payouts" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs text-slate-500">Failed Commission</p>

            <p className="text-lg font-bold text-red-600 mt-1">
              {CURRENCY(payoutSummary.failed)}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs text-slate-500">GST on Payouts</p>

            <p className="text-lg font-bold text-slate-800 mt-1">
              {CURRENCY(payoutSummary.gst)}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs text-slate-500">Total Payable (incl. GST)</p>

            <p className="text-lg font-bold text-slate-800 mt-1">
              {CURRENCY(payoutSummary.payable)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-brand-navy">
              {tabs.find((tab) => tab.id === reportType)?.label} Details
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              {tableRows.length} records Â· {range.label}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={handleExport}
              className="text-xs font-bold text-brand-royal hover:text-brand-navy flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
              <tr>
                {(reportType === "leads"
                  ? [
                      "Lead ID",

                      "Customer",

                      "Category",

                      "Loan Amount",

                      "Status",

                      "Assigned To",

                      "Created",
                    ]
                  : reportType === "employees"
                    ? [
                        "Employee",

                        "Code",

                        "Designation",

                        "Assigned",

                        "Converted",

                        "Conversion",
                      ]
                    : reportType === "partners"
                      ? [
                          "Partner",

                          "Code",

                          "Leads",

                          "Payouts",

                          "Commission",

                          "Paid",

                          "Pending",
                        ]
                      : reportType === "invoices"
                        ? [
                            "Invoice",

                            "Date",

                            "Customer",

                            "Bank",

                            "Amount",

                            "Status",

                            "UTR",
                          ]
                        : [
                            "Payment",

                            "Date",

                            "Partner",

                            "Lead",

                            "Commission",

                            "GST",

                            "Total",

                            "Status",

                            "UTR",
                          ]
                ).map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pageRows.map((row, index) => (
                <tr
                  key={
                    row._id ||
                    row.id ||
                    row.leadCode ||
                    row.invoiceNumber ||
                    row.paymentNumber ||
                    index
                  }
                  className="hover:bg-slate-50/70"
                >
                  {reportType === "leads" ? (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        {(row.leadCode || row.id) ? formatLeadUid(row.leadCode || row.id) : "-"}
                      </td>

                      <td className="px-4 py-3">{row.customerName || "â€”"}</td>

                      <td className="px-4 py-3">{row.loanCategory || "â€”"}</td>

                      <td className="px-4 py-3">{CURRENCY(row.loanAmount)}</td>

                      <td className="px-4 py-3">{row.currentStatus || "â€”"}</td>

                      <td className="px-4 py-3">
                        {row.assignedEmployee || "Unassigned"}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(row.createdAt || row.createdDate)}
                      </td>
                    </>
                  ) : reportType === "employees" ? (
                    <>
                      <td className="px-4 py-3 font-semibold">{row.name}</td>

                      <td className="px-4 py-3">{row.id || "â€”"}</td>

                      <td className="px-4 py-3">{row.designation}</td>

                      <td className="px-4 py-3">{row.assigned}</td>

                      <td className="px-4 py-3">{row.converted}</td>

                      <td className="px-4 py-3">{row.conversionRate}%</td>
                    </>
                  ) : reportType === "partners" ? (
                    <>
                      <td className="px-4 py-3 font-semibold">{row.name}</td>

                      <td className="px-4 py-3">{row.id || "â€”"}</td>

                      <td className="px-4 py-3">{row.leads}</td>

                      <td className="px-4 py-3">{row.payoutRecords}</td>

                      <td className="px-4 py-3">{CURRENCY(row.commission)}</td>

                      <td className="px-4 py-3">{CURRENCY(row.paid)}</td>

                      <td className="px-4 py-3">{CURRENCY(row.pending)}</td>
                    </>
                  ) : reportType === "invoices" ? (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        {row.invoiceNumber || "â€”"}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(row.invoiceDate || row.createdAt)}
                      </td>

                      <td className="px-4 py-3">{row.customerName || "â€”"}</td>

                      <td className="px-4 py-3">{row.bankName || "â€”"}</td>

                      <td className="px-4 py-3">
                        {CURRENCY(row.invoiceAmount)}
                      </td>

                      <td className="px-4 py-3">{row.invoiceStatus || "â€”"}</td>

                      <td className="px-4 py-3">{row.utr || "â€”"}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        {row.paymentNumber || "â€”"}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(row.paymentDate || row.createdAt)}
                      </td>

                      <td className="px-4 py-3">{row.partnerName || "â€”"}</td>

                      <td className="px-4 py-3">{row.leadId ? formatLeadUid(row.leadId) : "—"}</td>

                      <td className="px-4 py-3">{CURRENCY(row.amount)}</td>

                      <td className="px-4 py-3">{CURRENCY(row.gstAmount)}</td>

                      <td className="px-4 py-3">{CURRENCY(row.totalAmount)}</td>

                      <td className="px-4 py-3">{row.status || "â€”"}</td>

                      <td className="px-4 py-3">{row.utr || "â€”"}</td>
                    </>
                  )}
                </tr>
              ))}

              {!tableRows.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No records found for this report and date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tableRows.length > pageSize && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs"><span className="text-slate-500">Showing {(currentPage - 1) * pageSize + 1}â€“{Math.min(currentPage * pageSize, tableRows.length)} of {tableRows.length}</span><div className="flex gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><span className="self-center text-slate-500">Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></div></div>}
      </div>
    </div>
  );
};
