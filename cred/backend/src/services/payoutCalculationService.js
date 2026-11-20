import CommissionRule from "../models/CommissionRule.js";

const normalizeMatchValue = (value) => String(value || "").trim().toLocaleLowerCase("en-IN");
const matchesScope = (configured, actual) => {
  const expected = normalizeMatchValue(configured);
  return !expected || expected === "*" || expected === normalizeMatchValue(actual);
};

export async function calculatePartnerPayout(partner, lead, now = new Date()) {
  // The confirmed partner evidence is the source of truth for commission.
  // Do not fall back to the legacy loanPayoutAmount field, which may be edited
  // independently by an Admin for other CRM purposes.
  if (lead.disbursementUpdate?.status !== "confirmed") {
    return { error: "Admin-confirmed disbursement evidence is required before calculating commission." };
  }
  const loanAmount = Number(lead.disbursementUpdate?.amount);
  const effectiveAt = lead.disbursementUpdate?.disbursementDate
    ? new Date(lead.disbursementUpdate.disbursementDate)
    : lead.disbursementUpdate?.reviewedAt
      ? new Date(lead.disbursementUpdate.reviewedAt)
      : now;
  if (Number.isNaN(effectiveAt.getTime())) {
    return { error: "A valid confirmed disbursement date is required to calculate commission." };
  }
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return { error: "Valid confirmed disbursed loan amount is required to calculate payout." };
  }

  const bankName = lead.disbursementUpdate?.bankName || "";
  const rules = await CommissionRule.find({ status: "active" });
  const eligibleRules = rules.filter((candidate) => {
    const from = candidate.effectiveFrom ? new Date(candidate.effectiveFrom) : null;
    const to = candidate.effectiveTo ? new Date(candidate.effectiveTo) : null;
    // Date-only form values represent the whole selected calendar day.
    if (to) to.setUTCHours(23, 59, 59, 999);
    const minimum = Number(candidate.minimumLoanAmount || 0);
    const maximum = candidate.maximumLoanAmount == null ? null : Number(candidate.maximumLoanAmount);
    return matchesScope(candidate.partnerCode, partner.partnerCode)
      && matchesScope(candidate.loanCategory, lead.loanCategory)
      && matchesScope(candidate.bankName, bankName)
      && (!from || from <= effectiveAt)
      && (!to || to >= effectiveAt)
      && loanAmount >= minimum
      && (maximum === null || loanAmount <= maximum);
  });

  const specificity = (rule) => {
    const isSpecific = (value) => Boolean(normalizeMatchValue(value)) && normalizeMatchValue(value) !== "*";
    return (isSpecific(rule.partnerCode) ? 4 : 0)
      + (isSpecific(rule.loanCategory) ? 2 : 0)
      + (isSpecific(rule.bankName) ? 1 : 0);
  };
  eligibleRules.sort((a, b) => specificity(b) - specificity(a)
    || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const rule = eligibleRules[0];
  if (!rule) {
    const bankLabel = bankName || "not recorded";
    return {
      error: `No active commission rule matches partner ${partner.partnerCode}, category "${lead.loanCategory}", disbursement bank "${bankLabel}", and amount INR ${loanAmount.toLocaleString("en-IN")}. Match these values in Commission Rules or set Bank / NBFC to All institutions.`,
      loanAmount,
    };
  }

  const amount = Number((rule.calculationType === "percentage" ? loanAmount * (rule.value / 100) : rule.value).toFixed(2));
  const gstAmount = Number((amount * (rule.gstPercentage / 100)).toFixed(2));
  const deductionAmount = Number((Number(rule.deductionFixed || 0) + amount * (Number(rule.deductionPercentage || 0) / 100)).toFixed(2));
  const totalAmount = Number((amount + gstAmount - deductionAmount).toFixed(2));
  if (totalAmount < 0) return { error: "Configured deductions exceed commission and tax. Update the applicable commission rule.", loanAmount };

  return { rule, loanAmount, amount, gstAmount, deductionAmount, totalAmount, bankName };
}
