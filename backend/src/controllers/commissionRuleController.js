import CommissionRule from "../models/CommissionRule.js";

const normalize = (body) => {
  const name = String(body.name || "").trim();
  const loanCategory = String(body.loanCategory || "").trim() || "*";
  const partnerCode = String(body.partnerCode || "").trim() || "*";
  const bankName = String(body.bankName || "").trim() || "*";
  const calculationType = body.calculationType;
  const value = Number(body.value);
  const gstPercentage = Number(body.gstPercentage);
  const deductionFixed = Number(body.deductionFixed || 0);
  const deductionPercentage = Number(body.deductionPercentage || 0);
  const minimumLoanAmount = Number(body.minimumLoanAmount || 0);
  const maximumLoanAmount = body.maximumLoanAmount === "" || body.maximumLoanAmount == null ? null : Number(body.maximumLoanAmount);
  const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : null;
  const effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
  if (!name || name.length > 120) throw Object.assign(new Error("Rule name is required (max 120 characters)."), { statusCode: 400 });
  if (!["percentage", "fixed"].includes(calculationType)) throw Object.assign(new Error("Calculation type must be percentage or fixed."), { statusCode: 400 });
  if (!Number.isFinite(value) || value <= 0 || (calculationType === "percentage" && value > 100)) throw Object.assign(new Error("Rule value must be positive; percentage values cannot exceed 100."), { statusCode: 400 });
  if (!Number.isFinite(gstPercentage) || gstPercentage < 0 || gstPercentage > 100) throw Object.assign(new Error("GST percentage must be configured between 0 and 100."), { statusCode: 400 });
  if (!Number.isFinite(deductionFixed) || deductionFixed < 0 || !Number.isFinite(deductionPercentage) || deductionPercentage < 0 || deductionPercentage > 100) throw Object.assign(new Error("Deductions must be non-negative and deduction percentage cannot exceed 100."), { statusCode: 400 });
  if (!Number.isFinite(minimumLoanAmount) || minimumLoanAmount < 0 || (maximumLoanAmount !== null && (!Number.isFinite(maximumLoanAmount) || maximumLoanAmount < minimumLoanAmount))) throw Object.assign(new Error("Enter a valid minimum and maximum eligible loan amount."), { statusCode: 400 });
  if ((effectiveFrom && Number.isNaN(effectiveFrom.getTime())) || (effectiveTo && Number.isNaN(effectiveTo.getTime())) || (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom)) throw Object.assign(new Error("Enter a valid effective date range."), { statusCode: 400 });
  const status = body.status || "inactive";
  if (!["active", "inactive"].includes(status)) throw Object.assign(new Error("Rule status must be active or inactive."), { statusCode: 400 });
  return { name, loanCategory, partnerCode, bankName, calculationBasis: "disbursed_amount", calculationType, value, gstPercentage, deductionFixed, deductionPercentage, minimumLoanAmount, maximumLoanAmount, effectiveFrom, effectiveTo, status, ruleKey: `${partnerCode.toLowerCase()}::${loanCategory.toLowerCase()}::${bankName.toLowerCase()}` };
};

export async function listCommissionRules(_req, res) {
  const rules = await CommissionRule.find().sort({ updatedAt: -1 });
  return res.json({ success: true, rules });
}

export async function saveCommissionRule(req, res) {
  try {
    const data = normalize(req.body || {});
    const legacyLoanCategory = data.loanCategory === "*" ? "" : data.loanCategory;
    const legacyPartnerCode = data.partnerCode === "*" ? "" : data.partnerCode;
    let rule = await CommissionRule.findOne({ ruleKey: data.ruleKey });
    if (!rule) {
      rule = await CommissionRule.findOne({ loanCategory: legacyLoanCategory, partnerCode: legacyPartnerCode, bankName: data.bankName === "*" ? { $in: ["*", ""] } : data.bankName });
    } else {
      // If a legacy blank-wildcard duplicate exists, deactivate it so payout matching is deterministic.
      await CommissionRule.updateMany(
        { loanCategory: legacyLoanCategory, partnerCode: legacyPartnerCode, bankName: data.bankName === "*" ? { $in: ["*", ""] } : data.bankName, ruleKey: { $ne: data.ruleKey } },
        { $set: { status: "inactive" } },
      );
    }
    if (!rule) {
      const created = await CommissionRule.create({ ...data, createdBy: req.user._id, updatedBy: req.user._id, history: [{ actorId: req.user._id, snapshot: data }] });
      return res.status(201).json({ success: true, rule: created });
    }
    rule.history.push({ actorId: req.user._id, snapshot: rule.toObject() });
    Object.assign(rule, data, { updatedBy: req.user._id });
    await rule.save();
    return res.json({ success: true, rule });
  } catch (error) {
    return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({ success: false, message: error.message || "Unable to save commission rule." });
  }
}

export async function setCommissionRuleStatus(req, res) {
  if (!["active", "inactive"].includes(req.body?.status)) return res.status(400).json({ success: false, message: "Status must be active or inactive." });
  const rule = await CommissionRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ success: false, message: "Commission rule not found." });
  rule.history.push({ actorId: req.user._id, snapshot: { status: rule.status } });
  rule.status = req.body.status;
  rule.updatedBy = req.user._id;
  await rule.save();
  return res.json({ success: true, rule });
}
