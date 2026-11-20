import Lead from "../models/Lead.js";

const applicationView = (lead) => ({
  id: lead.leadCode, leadCode: lead.leadCode, customerName: lead.customerName, phone: lead.phone,
  loanType: lead.loanCategory, bankName: lead.preferredBank || "", requestedAmount: lead.loanAmount,
  sanctionedAmount: lead.sanctionedAmount || 0, propertyValuation: lead.propertyValuation || 0,
  ltv: lead.ltv || 0, roi: lead.interestRate || 0, tenure: lead.tenureYears || 0,
  cibilScore: lead.cibilScore || 0, applicantIncome: lead.applicantIncome || lead.monthlyIncome || 0,
  status: lead.currentStatus, submissionDate: lead.createdAt,
});

export async function getApplications(_req, res) {
  const leads = await Lead.find({ source: { $in: ["Admin", "Website", "Partner Referral"] } }).sort({ createdAt: -1 }).limit(500);
  return res.json({ success: true, count: leads.length, data: leads.map(applicationView) });
}

export async function createApplication(req, res) {
  try {
    const body = req.body || {};
    if (!String(body.customerName || "").trim() || !String(body.phone || "").trim() || !String(body.loanType || body.loanCategory || "").trim()) return res.status(400).json({ success: false, message: "Customer name, phone and loan category are required." });
    const loanAmount = Number(body.requestedAmount ?? body.loanAmount);
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) return res.status(400).json({ success: false, message: "Requested loan amount must be greater than zero." });
    const lead = await Lead.create({ customerName: String(body.customerName).trim(), phone: String(body.phone).trim(), email: String(body.email || "").trim().toLowerCase(), loanCategory: String(body.loanType || body.loanCategory).trim(), loanAmount, preferredBank: String(body.bankName || "").trim(), sanctionedAmount: Number(body.sanctionedAmount) || 0, propertyValuation: Number(body.propertyValuation) || 0, ltv: Number(String(body.ltv ?? "").replace(/%$/, "")) || 0, interestRate: Number(String(body.roi ?? "").replace(/%$/, "")) || 0, tenureYears: Number(String(body.tenure ?? "").replace(/ Years?$/i, "")) || 0, cibilScore: Number(body.cibilScore) || 0, applicantIncome: Number(body.applicantIncome) || 0, currentStatus: "In Process", source: "Admin", submittedBy: req.user.name, statusHistory: [{ fromStatus: "", toStatus: "In Process", actorId: req.user._id, actorRole: "admin", actorName: req.user.name }], timeline: [{ step: "Application created", user: req.user.name, status: "completed" }] });
    return res.status(201).json({ success: true, data: applicationView(lead), lead });
  } catch { return res.status(500).json({ success: false, message: "Unable to create loan application." }); }
}

export async function updateApplication(req, res) {
  try {
    if (!req.body || Object.keys(req.body).some((key) => key !== "status")) return res.status(400).json({ success: false, message: "Only the application status can be changed here." });
    const statuses = ["Pending", "Contacted", "In Process", "Interested", "Follow-up", "Approved", "Sanctioned", "Rejected"];
    if (!statuses.includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid application status." });
    const lead = await Lead.findOne({ leadCode: req.params.id });
    if (!lead) return res.status(404).json({ success: false, message: "Application not found." });
    const previous = lead.currentStatus; lead.currentStatus = req.body.status;
    lead.statusHistory.push({ fromStatus: previous, toStatus: req.body.status, actorId: req.user._id, actorRole: "admin", actorName: req.user.name });
    lead.timeline.push({ step: `Application status changed to ${req.body.status}`, user: req.user.name, status: "completed" });
    await lead.save();
    return res.json({ success: true, data: applicationView(lead), lead });
  } catch { return res.status(500).json({ success: false, message: "Unable to update application." }); }
}

export async function getCustomers(_req, res) {
  const leads = await Lead.find().sort({ createdAt: -1 }).limit(500);
  const data = leads.map((lead) => ({ id: lead.leadCode, leadCode: lead.leadCode, name: lead.customerName, phone: lead.phone, email: lead.email, city: lead.city, activeLoan: lead.loanCategory, totalBorrowed: lead.loanPayoutAmount || lead.loanAmount, cibilScore: lead.cibilScore || 0, kycStatus: lead.currentStatus === "Verified" ? "Verified" : "Pending", cbsAccountNo: lead.cbsAccountNo || "", since: lead.createdAt }));
  return res.json({ success: true, count: data.length, data });
}

export async function createCustomer(req, res) {
  const body = req.body || {};
  const customerName = String(body.name || body.customerName || "").trim();
  const phone = String(body.phone || "").trim();
  const loanCategory = String(body.activeLoan || body.loanCategory || "").trim();
  const loanAmount = Number(body.totalBorrowed ?? body.loanAmount);
  if (!customerName || !phone || !loanCategory || !Number.isFinite(loanAmount) || loanAmount <= 0) return res.status(400).json({ success: false, message: "Name, phone, loan category and loan amount are required to create a customer lead." });
  try {
    const lead = await Lead.create({ customerName, phone, email: String(body.email || "").trim().toLowerCase(), city: String(body.city || "").trim(), loanCategory, loanAmount, cibilScore: Number(body.creditScore) || 0, currentStatus: "New", source: "Admin", submittedBy: req.user.name, timeline: [{ step: "Customer lead created", user: req.user.name, status: "completed" }] });
    return res.status(201).json({ success: true, data: { id: lead.leadCode, leadCode: lead.leadCode, name: lead.customerName, phone: lead.phone, email: lead.email, city: lead.city, activeLoan: lead.loanCategory, totalBorrowed: lead.loanAmount, cibilScore: lead.cibilScore, kycStatus: "Pending", cbsAccountNo: "", since: lead.createdAt }, lead });
  } catch { return res.status(500).json({ success: false, message: "Unable to create customer record." }); }
}

