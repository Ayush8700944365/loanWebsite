// Centralized Demonstration Data for REALCRED CRM & Public Website

export const INITIAL_LEADS = [
  {
    id: "RC-LD-8901",
    customerName: "Rohit Sharma",
    phone: "+91 98765 43210",
    email: "rohit.sharma@gmail.com",
    leadType: "SBI",
    loanCategory: "Home Loan",
    cbsAccountNo: "38910294812",
    loanAmount: 8500000,
    rinnrakshaAmount: 145000,
    loanPayoutAmount: 8355000,
    invoiceAmount: 42500,
    currentStatus: "New",
    assignedEmployee: "Aman Dubey",
    assignedEmployeeId: "EMP-101",
    partnerName: "Apex Realty Finserve",
    partnerId: "PRT-301",
    createdDate: "2026-11-10",
    addedOn: "Today, 10:15 AM",
    city: "Mumbai",
    employmentType: "Salaried",
    monthlyIncome: 240000,
    tenureYears: 20,
    interestRate: 8.50,
    propertyAddress: "Flat 1402, Tower B, Oberoi Sky City, Borivali East, Mumbai 400066",
    timeline: [
      { step: "Lead Initiated", date: "10 Nov 2026, 10:15 AM", user: "Apex Realty Finserve", status: "completed" },
      { step: "Initial Contact", date: "10 Nov 2026, 11:30 AM", user: "Aman Dubey (Admin)", status: "current" },
      { step: "Document Verification", date: "Pending", user: "Verification Desk", status: "upcoming" }
    ],
    documents: [
      { name: "Aadhaar Card", fileName: "rohit_aadhaar_card.pdf", type: "KYC Identity", verified: true, date: "10 Nov 2026" },
      { name: "PAN Card", fileName: "rohit_pan_verified.pdf", type: "KYC Tax ID", verified: true, date: "10 Nov 2026" },
      { name: "Salary Slips (3 Mo)", fileName: "salary_slips_aug_sep_oct2026.pdf", type: "Income Proof", verified: true, date: "10 Nov 2026" }
    ],
    notes: [
      { author: "Aman Dubey", text: "Customer interested in SBI Maxgain scheme for ₹85 Lakhs. High CIBIL score.", date: "10 Nov 2026, 10:30 AM" }
    ]
  },
  {
    id: "RC-LD-8902",
    customerName: "Priya Singh",
    phone: "+91 87654 32109",
    email: "priya.singh@outlook.com",
    leadType: "Non-SBI",
    loanCategory: "Home Loan",
    cbsAccountNo: "77218491034",
    loanAmount: 6500000,
    rinnrakshaAmount: 110000,
    loanPayoutAmount: 6390000,
    invoiceAmount: 32500,
    currentStatus: "Contacted",
    assignedEmployee: "Sneha Kapadia",
    assignedEmployeeId: "EMP-102",
    partnerName: "Finbridge Consultants",
    partnerId: "PRT-302",
    createdDate: "2026-11-10",
    addedOn: "Today, 09:20 AM",
    city: "Bengaluru",
    employmentType: "Salaried",
    monthlyIncome: 180000,
    tenureYears: 20,
    interestRate: 8.60,
    propertyAddress: "Sobha Dream Acres, Panathur, Bengaluru 560087",
    timeline: [
      { step: "Lead Ingestion", date: "10 Nov 2026", user: "Website Application", status: "completed" },
      { step: "Eligibility Assessed", date: "10 Nov 2026", user: "Sneha Kapadia", status: "completed" }
    ],
    documents: [
      { name: "PAN Card", fileName: "priya_pan.pdf", type: "KYC Tax ID", verified: true, date: "10 Nov 2026" },
      { name: "Aadhaar Card", fileName: "priya_aadhaar.pdf", type: "KYC Identity", verified: true, date: "10 Nov 2026" }
    ],
    notes: [
      { author: "Sneha Kapadia", text: "Discussed eligibility check. Client requires 80% LTV on ready-possession flat.", date: "10 Nov 2026, 09:45 AM" }
    ]
  },
  {
    id: "RC-LD-8903",
    customerName: "Amit Kumar",
    phone: "+91 76543 21098",
    email: "amit.kumar@techcorp.in",
    leadType: "SBI",
    loanCategory: "Top-Up Loan",
    cbsAccountNo: "50192841022",
    loanAmount: 2500000,
    rinnrakshaAmount: 45000,
    loanPayoutAmount: 2455000,
    invoiceAmount: 15000,
    currentStatus: "Interested",
    assignedEmployee: "Aman Dubey",
    assignedEmployeeId: "EMP-101",
    partnerName: "Direct Portal",
    partnerId: "PRT-WEB",
    createdDate: "2026-11-09",
    addedOn: "Yesterday",
    city: "Pune",
    employmentType: "Salaried",
    monthlyIncome: 135000,
    tenureYears: 10,
    interestRate: 9.10,
    propertyAddress: "Kharadi Bypass, Pune 411014",
    timeline: [
      { step: "Top-Up Enquiry", date: "09 Nov 2026", user: "Web Portal", status: "completed" }
    ],
    documents: [],
    notes: [
      { author: "Aman Dubey", text: "Client wants ₹25L top-up on existing SBI home loan for home renovation.", date: "09 Nov 2026" }
    ]
  },
  {
    id: "RC-LD-8904",
    customerName: "Neha Verma",
    phone: "+91 65432 10987",
    email: "neha.verma@gmail.com",
    leadType: "Non-SBI",
    loanCategory: "Home Loan",
    cbsAccountNo: "39201948271",
    loanAmount: 12000000,
    rinnrakshaAmount: 210000,
    loanPayoutAmount: 11790000,
    invoiceAmount: 60000,
    currentStatus: "Follow-up",
    assignedEmployee: "Amitesh Varma",
    assignedEmployeeId: "EMP-103",
    partnerName: "Apex Realty Finserve",
    partnerId: "PRT-301",
    createdDate: "2026-11-09",
    addedOn: "Yesterday",
    city: "Gurugram",
    employmentType: "Self-Employed",
    monthlyIncome: 350000,
    tenureYears: 15,
    interestRate: 8.55,
    propertyAddress: "DLF Phase 5, Golf Course Road, Gurugram 122009",
    timeline: [
      { step: "Lead Sourced", date: "09 Nov 2026", user: "Apex Realty", status: "completed" }
    ],
    documents: [],
    notes: [
      { author: "Amitesh Varma", text: "Follow-up scheduled to collect 3-year audited financials.", date: "09 Nov 2026" }
    ]
  },
  {
    id: "RC-LD-8905",
    customerName: "Suresh Patel",
    phone: "+91 54321 09876",
    email: "suresh.patel@pateltextiles.com",
    leadType: "SBI",
    loanCategory: "Balance Transfer",
    cbsAccountNo: "88291047192",
    loanAmount: 9500000,
    rinnrakshaAmount: 160000,
    loanPayoutAmount: 9340000,
    invoiceAmount: 47500,
    currentStatus: "New",
    assignedEmployee: "Aman Dubey",
    assignedEmployeeId: "EMP-101",
    partnerName: "Finbridge Consultants",
    partnerId: "PRT-302",
    createdDate: "2026-10-29",
    addedOn: "Oct 29, 2026",
    city: "Ahmedabad",
    employmentType: "Business Owner",
    monthlyIncome: 280000,
    tenureYears: 18,
    interestRate: 8.40,
    propertyAddress: "SG Highway, Bodakdev, Ahmedabad 380054",
    timeline: [
      { step: "Balance Transfer Application", date: "29 Oct 2026", user: "Finbridge", status: "completed" }
    ],
    documents: [],
    notes: [
      { author: "Aman Dubey", text: "Transferring loan from private NBFC (10.25%) to SBI EBLR (8.40%). Substantial interest savings.", date: "29 Oct 2026" }
    ]
  }
];

export const INITIAL_APPLICATIONS = [
  {
    id: "APP-HL-2026-101",
    customerName: "Rohit Sharma",
    phone: "+91 98765 43210",
    loanType: "Home Loan",
    bankName: "State Bank of India (RACPC)",
    requestedAmount: 8500000,
    sanctionedAmount: 8500000,
    propertyValuation: 11000000,
    ltv: "77%",
    roi: "8.50%",
    tenure: "20 Years",
    status: "Approved",
    cibilScore: 785,
    submissionDate: "10 Nov 2026",
    applicantIncome: 240000
  },
  {
    id: "APP-HL-2026-102",
    customerName: "Priya Singh",
    phone: "+91 87654 32109",
    loanType: "Home Loan",
    bankName: "HDFC Bank Ltd",
    requestedAmount: 6500000,
    sanctionedAmount: 6200000,
    propertyValuation: 8000000,
    ltv: "77.5%",
    roi: "8.60%",
    tenure: "20 Years",
    status: "In Process",
    cibilScore: 742,
    submissionDate: "10 Nov 2026",
    applicantIncome: 180000
  },
  {
    id: "APP-HL-2026-103",
    customerName: "Amit Kumar",
    phone: "+91 76543 21098",
    loanType: "Top-Up Loan",
    bankName: "State Bank of India",
    requestedAmount: 2500000,
    sanctionedAmount: 2500000,
    propertyValuation: 7500000,
    ltv: "55%",
    roi: "9.10%",
    tenure: "10 Years",
    status: "In Process",
    cibilScore: 760,
    submissionDate: "09 Nov 2026",
    applicantIncome: 135000
  },
  {
    id: "APP-HL-2026-104",
    customerName: "Gajendra Singhania",
    phone: "+91 99200 11293",
    loanType: "Home Loan",
    bankName: "State Bank of India",
    requestedAmount: 32000000,
    sanctionedAmount: 32000000,
    propertyValuation: 45000000,
    ltv: "71%",
    roi: "8.35%",
    tenure: "20 Years",
    status: "Approved",
    cibilScore: 815,
    submissionDate: "05 Nov 2026",
    applicantIncome: 850000
  },
  {
    id: "APP-HL-2026-105",
    customerName: "Mohd. Farooq Qureshi",
    phone: "+91 98901 67123",
    loanType: "Plot Loan",
    bankName: "ICICI Bank",
    requestedAmount: 2800000,
    sanctionedAmount: 0,
    propertyValuation: 3500000,
    ltv: "80%",
    roi: "8.95%",
    tenure: "15 Years",
    status: "Rejected",
    cibilScore: 598,
    submissionDate: "01 Nov 2026",
    applicantIncome: 80000
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: "CUST-401",
    name: "Rohit Sharma",
    phone: "+91 98765 43210",
    email: "rohit.sharma@gmail.com",
    city: "Mumbai",
    activeLoan: "Home Loan (SBI)",
    totalBorrowed: 8500000,
    kycStatus: "Verified",
    creditScore: 785,
    cbsAccountNo: "38910294812",
    since: "Nov 2026"
  },
  {
    id: "CUST-402",
    name: "Priya Singh",
    phone: "+91 87654 32109",
    email: "priya.singh@outlook.com",
    city: "Bengaluru",
    activeLoan: "Home Loan (HDFC)",
    totalBorrowed: 6200000,
    kycStatus: "Verified",
    creditScore: 742,
    cbsAccountNo: "77218491034",
    since: "Nov 2026"
  },
  {
    id: "CUST-403",
    name: "Amit Kumar",
    phone: "+91 76543 21098",
    email: "amit.kumar@techcorp.in",
    city: "Pune",
    activeLoan: "Top-Up Loan (SBI)",
    totalBorrowed: 2500000,
    kycStatus: "Verified",
    creditScore: 760,
    cbsAccountNo: "50192841022",
    since: "Oct 2026"
  },
  {
    id: "CUST-404",
    name: "Gajendra Singhania",
    phone: "+91 99200 11293",
    email: "gajendra@singhaniagroup.com",
    city: "Mumbai",
    activeLoan: "Luxury Home Loan (SBI)",
    totalBorrowed: 32000000,
    kycStatus: "Verified",
    creditScore: 815,
    cbsAccountNo: "38192049104",
    since: "Oct 2026"
  },
  {
    id: "CUST-405",
    name: "Suresh Patel",
    phone: "+91 54321 09876",
    email: "suresh.patel@pateltextiles.com",
    city: "Ahmedabad",
    activeLoan: "Balance Transfer",
    totalBorrowed: 9500000,
    kycStatus: "Under Review",
    creditScore: 728,
    cbsAccountNo: "88291047192",
    since: "Oct 2026"
  }
];

export const INITIAL_FOLLOWUPS = [
  {
    id: "FLW-701",
    customerName: "Rohit Sharma",
    phone: "+91 98765 43210",
    task: "Call for documents",
    timeDisplay: "Today, 05:00 PM",
    followUpDate: "2026-11-10",
    followUpTime: "05:00 PM",
    reminderStatus: "Scheduled",
    priority: "High",
    notes: "Collect builder agreement and pending Franking duty receipt."
  },
  {
    id: "FLW-702",
    customerName: "Priya Singh",
    phone: "+91 87654 32109",
    task: "Loan eligibility check",
    timeDisplay: "Today, 06:30 PM",
    followUpDate: "2026-11-10",
    followUpTime: "06:30 PM",
    reminderStatus: "Scheduled",
    priority: "High",
    notes: "Review revised HDFC offer letter with 8.60% ROI."
  },
  {
    id: "FLW-703",
    customerName: "Amit Kumar",
    phone: "+91 76543 21098",
    task: "Discuss loan amount",
    timeDisplay: "Tomorrow, 11:00 AM",
    followUpDate: "2026-11-11",
    followUpTime: "11:00 AM",
    reminderStatus: "Scheduled",
    priority: "Medium",
    notes: "Explain difference between Maxgain overdraft and term top-up."
  }
];

export const INITIAL_BANKS_NBFC = [
  {
    id: "BNK-01",
    name: "State Bank of India (RACPC)",
    category: "PSU Commercial Bank",
    minRoi: "8.35%",
    maxLtv: "90%",
    tat: "48 - 72 Hours",
    processingFee: "0.25% (Festive Waiver)",
    relationshipManager: "Sanjay Sharma (AGM Credit)",
    contactPhone: "+91 22 2659 8800",
    activeFiles: 34,
    status: "Active"
  },
  {
    id: "BNK-02",
    name: "HDFC Bank Ltd",
    category: "Private Bank",
    minRoi: "8.55%",
    maxLtv: "85%",
    tat: "24 - 48 Hours",
    processingFee: "0.35%",
    relationshipManager: "Aakash Mehta (Chief Mgr Mortgages)",
    contactPhone: "+91 22 6652 1000",
    activeFiles: 22,
    status: "Active"
  },
  {
    id: "BNK-03",
    name: "ICICI Bank Ltd",
    category: "Private Bank",
    minRoi: "8.65%",
    maxLtv: "85%",
    tat: "48 Hours",
    processingFee: "0.30%",
    relationshipManager: "Divya Nambiar (Regional Head)",
    contactPhone: "+91 22 4008 8200",
    activeFiles: 18,
    status: "Active"
  },
  {
    id: "BNK-04",
    name: "Axis Bank",
    category: "Private Bank",
    minRoi: "8.75%",
    maxLtv: "85%",
    tat: "3 - 4 Days",
    processingFee: "0.25%",
    relationshipManager: "Gaurav Malhotra (AVP Retail)",
    contactPhone: "+91 22 2425 2525",
    activeFiles: 12,
    status: "Active"
  },
  {
    id: "BNK-05",
    name: "Bajaj Housing Finance Ltd",
    category: "Premier AAA NBFC",
    minRoi: "8.85%",
    maxLtv: "80%",
    tat: "24 Hours (Fast-track)",
    processingFee: "0.20%",
    relationshipManager: "Sunil Joshi (Area Manager)",
    contactPhone: "+91 20 7157 6064",
    activeFiles: 9,
    status: "Active"
  }
];

export const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    title: "Loan application approved for Rohit Sharma",
    timestamp: "2 hours ago",
    type: "approval",
    color: "bg-emerald-500"
  },
  {
    id: "act-2",
    title: "New lead added: Neha Verma",
    timestamp: "3 hours ago",
    type: "lead",
    color: "bg-blue-500"
  },
  {
    id: "act-3",
    title: "Follow-up scheduled for Amit Kumar",
    timestamp: "5 hours ago",
    type: "followup",
    color: "bg-amber-500"
  },
  {
    id: "act-4",
    title: "Document uploaded by Priya Singh",
    timestamp: "6 hours ago",
    type: "document",
    color: "bg-purple-500"
  }
];

export const INITIAL_ACTIVITIES = RECENT_ACTIVITIES;

export const INITIAL_INVOICES = [
  {
    invoiceNumber: "INV-2026-0982",
    invoiceDate: "2026-10-26",
    customerName: "Harishankar Trivedi",
    leadId: "RC-LD-8903",
    loanCategory: "Business Loan",
    leadType: "SBI",
    loanAmount: 4500000,
    invoiceAmount: 27000,
    annexureNumber: "ANX-SBI-7721",
    annexureDate: "2026-10-28",
    utr: "SBI998129420914",
    invoiceStatus: "Paid",
    bankName: "State Bank of India",
    partnerName: "Apex Realty Finserve",
    gstNumber: "27AAACA9912Q1Z3"
  },
  {
    invoiceNumber: "INV-2026-1049",
    invoiceDate: "2026-11-09",
    customerName: "Pooja Ananthakrishnan",
    leadId: "RC-LD-8902",
    loanCategory: "Loan Against Property",
    leadType: "Non-SBI",
    loanAmount: 12000000,
    invoiceAmount: 60000,
    annexureNumber: "ANX-HDFC-8891",
    annexureDate: "2026-11-08",
    utr: "PENDING-UTR",
    invoiceStatus: "Payment Initiated",
    bankName: "HDFC Bank",
    partnerName: "Finbridge Consultants",
    gstNumber: "29AADCF1194P1Z8"
  }
];

export const INITIAL_EMPLOYEES = [
  {
    id: "EMP-101",
    name: "Aman Dubey",
    email: "aman.dubey@realcred.in",
    phone: "+91 98202 33190",
    role: "Admin & Lead Manager",
    department: "SBI Operations & Underwriting",
    status: "Active",
    activeLeads: 28,
    convertedThisMonth: 12,
    targetThisMonth: 15,
    payoutVolume: "₹5.85 Cr",
    conversionRate: "86%",
    joinDate: "15 Jan 2024"
  },
  {
    id: "EMP-102",
    name: "Sneha Kapadia",
    email: "sneha.kapadia@realcred.in",
    phone: "+91 98114 77201",
    role: "Credit & Mortgage Specialist",
    department: "Private Banks & LAP Desk",
    status: "Active",
    activeLeads: 22,
    convertedThisMonth: 8,
    targetThisMonth: 12,
    payoutVolume: "₹3.80 Cr",
    conversionRate: "82%",
    joinDate: "01 Aug 2023"
  },
  {
    id: "EMP-103",
    name: "Amitesh Varma",
    email: "amitesh.varma@realcred.in",
    phone: "+91 99201 66532",
    role: "Branch Relationship Manager",
    department: "Retail & Vehicle Loans",
    status: "Active",
    activeLeads: 14,
    convertedThisMonth: 5,
    targetThisMonth: 8,
    payoutVolume: "₹1.60 Cr",
    conversionRate: "71%",
    joinDate: "10 Mar 2025"
  }
];

export const INITIAL_PARTNERS = [
  {
    id: "PRT-301",
    companyName: "Apex Realty Finserve LLP",
    contactPerson: "Rajeshwar Aggarwal",
    email: "rajesh@apexrealty.com",
    phone: "+91 98200 44102",
    city: "Mumbai",
    businessType: "Direct Selling Agent (DSA)",
    status: "Active",
    totalLeads: 64,
    approvedLeads: 48,
    totalCommission: 840000,
    pendingCommission: 142500,
    paidCommission: 697500,
    gstNo: "27AAACA9912Q1Z3",
    panNo: "AAACA9912Q",
    bankAccount: "HDFC Bank (A/C: 502000192841, IFSC: HDFC0000060)",
    joinedDate: "14 Feb 2024"
  },
  {
    id: "PRT-302",
    companyName: "Finbridge Consultants",
    contactPerson: "Kavish Narang",
    email: "kavish@finbridge.co.in",
    phone: "+91 98450 12891",
    city: "Bengaluru",
    businessType: "Chartered Accountant / Advisor",
    status: "Active",
    totalLeads: 42,
    approvedLeads: 35,
    totalCommission: 580000,
    pendingCommission: 107500,
    paidCommission: 472500,
    gstNo: "29AADCF1194P1Z8",
    panNo: "AADCF1194P",
    bankAccount: "ICICI Bank (A/C: 000205018291, IFSC: ICIC0000002)",
    joinedDate: "20 May 2024"
  }
];

export const INITIAL_TICKETS = [
  {
    ticketId: "TKT-2026-891",
    title: "Sanction letter delayed at SBI RACPC Borivali hub",
    ticketType: "Lead",
    leadType: "SBI",
    leadId: "RC-LD-8901",
    customerName: "Rohit Sharma",
    subcategory: "Disbursement Delay",
    status: "In Progress",
    priority: "High",
    createdAt: "08 Nov 2026, 11:30 AM",
    updatedAt: "09 Nov 2026, 04:15 PM",
    createdBy: "Apex Realty Finserve",
    assignedTo: "Aman Dubey",
    messages: [
      {
        id: "msg-1",
        sender: "Rajeshwar (Apex Realty)",
        role: "Partner",
        isStaff: false,
        timestamp: "08 Nov 2026, 11:30 AM",
        text: "Customer Rohit Sharma is waiting for final sanction copy. Please expedite RACPC desk clearance."
      },
      {
        id: "msg-2",
        sender: "Aman Dubey",
        role: "Admin & Lead Manager",
        isStaff: true,
        timestamp: "08 Nov 2026, 02:45 PM",
        text: "Spoke with Chief Manager at RACPC. Appraisal is cleared; digital sanction will be uploaded by noon."
      }
    ]
  }
];

export const INITIAL_INTERIOR_REFERRALS = [
  {
    id: "REF-INT-501",
    customerName: "Rohit Sharma",
    phone: "+91 98765 43210",
    email: "rohit.sharma@gmail.com",
    city: "Mumbai",
    propertyDetails: "Oberoi Sky City, 3BHK (1,450 sq.ft)",
    possessionTimeline: "Immediate (Within 1 Month)",
    estimatedBudget: "₹20,00,000 - ₹30,00,000",
    partnerName: "Apex Realty Finserve",
    status: "Consultation Scheduled",
    createdDate: "10 Nov 2026",
    assignedDesigner: "LivSpace Premium Studio",
    notes: "High-end luxury Italian modular kitchen + master bedroom acoustic panelling requested."
  }
];

export const INITIAL_GUIDES = [
  {
    id: "GD-101",
    title: "SBI Home Loan Master Product Policy (Nov 2026)",
    category: "Policy & Guidelines",
    description: "Detailed parameters for Regular Home Loan, Maxgain, Privileged, and NRI schemes with margin requirements.",
    uploadDate: "01 Nov 2026",
    fileSize: "3.4 MB",
    fileFormat: "PDF",
    downloadsCount: 342,
    badge: "Official Bank Circular"
  },
  {
    id: "GD-102",
    title: "DSA Commission Grid & Tiered Payout Matrix 2026-27",
    category: "Rate Cards & Commissions",
    description: "Complete commission breakdown across SBI, HDFC, ICICI, Axis and Bajaj Housing Finance with volume bonuses.",
    uploadDate: "25 Oct 2026",
    fileSize: "1.8 MB",
    fileFormat: "PDF",
    downloadsCount: 890,
    badge: "Confidential Partner SOP"
  }
];

export const LOAN_CATEGORIES_DATA = [
  {
    id: "home-loan",
    name: "Home Loan",
    slug: "home-loan",
    tagline: "Turn dream homes into proud addresses",
    minInterest: "8.35%",
    maxTenure: "30 Years",
    maxAmount: "₹10+ Crores",
    processingTime: "48 - 72 Hours",
    description: "Whether purchasing a new luxury apartment, constructing your customized villa, or buying residential land plots, our home loan schemes offer the industry's lowest interest rates.",
    benefits: [
      "SBI & Leading PSU/Private bank tie-ups",
      "Up to 90% property funding (LTV ratio)",
      "Zero prepayment penalties on floating rate loans",
      "Tax benefits up to ₹3.5 Lakhs under Section 80C & 24(b)"
    ],
    eligibility: "Age: 18-65 yrs | Salaried & Self-Employed | CIBIL: 720+",
    icon: "Home"
  },
  {
    id: "balance-transfer",
    name: "Balance Transfer",
    slug: "balance-transfer",
    tagline: "Slash your existing high-interest EMIs",
    minInterest: "8.35%",
    maxTenure: "30 Years",
    maxAmount: "Existing Balance + Top-up",
    processingTime: "4 - 5 Days",
    description: "Transfer your existing home loan from another bank or NBFC to SBI/HDFC at substantially lower interest rates and unlock extra top-up liquidity.",
    benefits: [
      "Save lakhs of rupees in interest outflow",
      "Additional top-up loan at home loan interest rate",
      "Seamless documentation & takeover process",
      "Reduced monthly EMI burden"
    ],
    eligibility: "Clean repayment track record (min 12 months) | CIBIL: 730+",
    icon: "TrendingUp"
  },
  {
    id: "plot-loan",
    name: "Plot Loan",
    slug: "plot-loan",
    tagline: "Acquire residential land & construct your haven",
    minInterest: "8.65%",
    maxTenure: "15 Years",
    maxAmount: "₹5 Crores",
    processingTime: "5 - 7 Days",
    description: "Finance the purchase of residential land plots from government development authorities or approved private developers.",
    benefits: [
      "Up to 75% funding on registered plot value",
      "Composite loan: Plot purchase + construction combined",
      "Flexible repayment and step-up options",
      "Available across all metro and Tier-1/2 locations"
    ],
    eligibility: "Clear non-agricultural residential title | Salaried & Business",
    icon: "Building"
  },
  {
    id: "personal-loan",
    name: "Personal Loan",
    slug: "personal-loan",
    tagline: "Instant liquidity with zero collateral required",
    minInterest: "10.49%",
    maxTenure: "5 Years",
    maxAmount: "₹40 Lakhs",
    processingTime: "24 - 48 Hours",
    description: "Meet your personal financial needs—whether it's emergency medical expenses, luxury weddings, debt consolidation, or travel—with hassle-free credit.",
    benefits: [
      "Zero physical paperwork required with e-KYC",
      "Competitive interest rates starting from 10.49% p.a.",
      "Flexible repayment options from 12 to 60 months",
      "No collateral or third-party guarantor needed"
    ],
    eligibility: "Age: 21-58 yrs | Min Monthly Income: ₹25,000 | CIBIL: 700+",
    icon: "Wallet"
  },
  {
    id: "business-loan",
    name: "Business Loan",
    slug: "business-loan",
    tagline: "Fuel enterprise expansion and working capital",
    minInterest: "11.25%",
    maxTenure: "7 Years",
    maxAmount: "₹5 Crores",
    processingTime: "3 - 5 Days",
    description: "Scale your business operations, invest in modern machinery, ramp up inventory, or manage cash flow gaps with collateral-free facilities.",
    benefits: [
      "Working capital and term loan configurations",
      "Overdraft / Cash Credit facility available",
      "High funding based on GST returns & banking turnover",
      "Minimal financial covenants and quick approvals"
    ],
    eligibility: "Min 2 Years in Business | Annual Turnover: ₹40L+ | Clean ITR",
    icon: "Briefcase"
  },
  {
    id: "loan-against-property",
    name: "Loan Against Property (LAP)",
    slug: "loan-against-property",
    tagline: "Unlock high-value liquidity from real estate equity",
    minInterest: "8.95%",
    maxTenure: "20 Years",
    maxAmount: "₹25 Crores",
    processingTime: "7 - 10 Days",
    description: "Monetize your residential, commercial, or industrial real estate assets at significantly lower interest rates than unsecured personal or business loans.",
    benefits: [
      "Substantially lower interest rates compared to personal loans",
      "Loan amounts up to 70% of market property valuation",
      "Long tenure up to 20 years for comfortable EMIs",
      "Both residential and commercial properties eligible"
    ],
    eligibility: "Clear property title chain | Property owners age 25-68 yrs",
    icon: "Building"
  }
];

export const TESTIMONIALS = [
  {
    name: "Rajiv & Meenakshi Sundaram",
    role: "Home Loan Borrowers (₹1.15 Cr)",
    location: "Bengaluru, Karnataka",
    quote: "REALCRED made our home purchase so transparent. Within 5 days our SBI sanction was cleared with zero running around. The portal tracking kept us informed at every single milestone.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    name: "Vikramjit Singh Chadha",
    role: "Managing Director, Chadha Logistics",
    location: "Gurugram, NCR",
    quote: "Secured our ₹3.5 Crore commercial machinery loan with unbeatable interest terms. The financial advisory team worked like true banking veterans.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  }
];

export const TRUST_STATS = [
  { label: "Disbursed Capital", value: "₹12.5+ Cr", icon: "TrendingUp" },
  { label: "Total Applications", value: "88", icon: "FileText" },
  { label: "Approved Loans", value: "52", icon: "CheckCircle2" },
  { label: "Lending Bank Partners", value: "45+", icon: "Building2" },
  { label: "Average Sanction Speed", value: "48 Hours", icon: "Clock" },
  { label: "Customer CSAT Rating", value: "4.9 / 5.0", icon: "Star" }
];

export const FAQS_DATA = [
  {
    question: "How does REALCRED help me get the lowest home loan interest rate?",
    answer: "REALCRED aggregates underwriting rules from top PSU institutions like SBI alongside premier private lenders (HDFC, ICICI, Axis). Our proprietary algorithm matches your income profile, credit score, and property location to the exact lender offering the lowest risk-adjusted rate."
  },
  {
    question: "Is there any charge for checking loan eligibility or applying through REALCRED?",
    answer: "No. Checking your eligibility, calculating EMIs, and submitting initial applications through REALCRED is 100% free for all customers."
  }
];

export const WEBSITE_CMS_DATA = {
  hero: {
    headline: "Make Your Financial Dreams a Reality.",
    subheadline: "Discover smarter loan solutions with transparent processes, flexible options and trusted financial guidance.",
    bannerNotice: "🔥 Festive Interest Rate Special: Home loans starting at 8.35% p.a. with Zero Processing Fee."
  },
  about: {
    title: "About REALCRED FinTech",
    intro: "REALCRED is India's premier tech-enabled financial distribution and loan management ecosystem.",
    mission: "To eliminate friction and opacity from credit accessibility by bridging prospective borrowers, certified channel partners, and premier banking institutions.",
    vision: "To power over ₹20,000 Crores in trusted retail and enterprise lending with zero friction by 2030."
  }
};
