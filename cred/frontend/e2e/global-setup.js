import User from '../../backend/src/models/User.js';
import LoanCategory from '../../backend/src/models/LoanCategory.js';
import Lead from '../../backend/src/models/Lead.js';

export default async function globalSetup() {
  const uri = process.env.PLAYWRIGHT_MONGO_URI;
  if (!uri || !process.env.PLAYWRIGHT_E2E_DB_NAME?.startsWith('realcred_pw_e2e_')) {
    throw new Error('Missing isolated Playwright database configuration.');
  }
  const mongoose = User.db.base;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await mongoose.connection.dropDatabase();
    const admin = await User.create({
      name: 'Playwright Admin',
      email: 'pw-admin@realcred.invalid',
      username: 'pw_admin',
      password: 'PW-Isolated-Test-2026!',
      role: 'admin',
      status: 'active',
    });
    await LoanCategory.create({
      name: 'Playwright Home Finance',
      slug: 'playwright-home-finance',
      status: 'active',
      description: 'Disposable category for isolated browser verification.',
      benefits: [],
      documentRequirements: [{ documentType: 'Playwright ID', employmentTypes: [] }],
      icon: 'Home',
    });
    await LoanCategory.create({ name: 'Playwright Missing Policy', slug: 'playwright-missing-policy', status: 'active', documentRequirements: [] });
    const employee = await User.create({ name: 'Playwright Employee', email: 'pw-employee@realcred.invalid', username: 'pw_employee', password: 'PW-Employee-Test-2026!', role: 'employee', status: 'active', employeeCode: 'EMP-PW-E2E' });
    await User.create({ name: 'Playwright Other Employee', email: 'pw-other-employee@realcred.invalid', username: 'pw_other_employee', password: 'PW-Employee-Test-2026!', role: 'employee', status: 'active', employeeCode: 'EMP-PW-OTHER' });
    await User.create({ name: 'Playwright Partner', email: 'pw-partner@realcred.invalid', username: 'pw_partner', password: 'PW-Partner-Test-2026!', role: 'partner', status: 'active', partnerApprovalStatus: 'approved', bankDetailsReviewStatus: 'approved', partnerCode: 'PTR-PW-E2E', companyName: 'Playwright Partner Firm', contactPerson: 'Playwright Partner', accountHolderName: 'Playwright Partner', bankName: 'Test Bank', bankBranch: 'Test Branch', accountNumber: '123456789012', ifsc: 'TEST0000001', accountType: 'Savings' });
    await User.create({ name: 'Playwright Workflow Partner', email: 'pw-workflow-partner@realcred.invalid', username: 'pw_workflow_partner', password: 'PW-Workflow-Test-2026!', role: 'partner', status: 'active', partnerApprovalStatus: 'approved', bankDetailsReviewStatus: 'approved', partnerCode: 'PTR-PW-WORKFLOW', companyName: 'Playwright Workflow Firm', contactPerson: 'Workflow Partner', accountHolderName: 'Workflow Partner', bankName: 'Test Bank', bankBranch: 'Test Branch', accountNumber: '222233334444', ifsc: 'TEST0000002', accountType: 'Savings' });
    await Lead.create({ leadCode: 'RC-LD-PW-E2E', customerName: 'Playwright Document Lead', phone: '9876500001', loanCategory: 'Playwright Home Finance', loanAmount: 100000, employmentType: 'Salaried', currentStatus: 'New', requiredDocuments: ['Playwright ID'], assignedEmployeeId: employee.employeeCode, assignedEmployee: employee.name });
    await Lead.create({ leadCode: 'RC-LD-PW-PARTNER', customerName: 'Playwright Partner Processing Lead', phone: '9876500003', loanCategory: 'Playwright Home Finance', loanAmount: 200000, currentStatus: 'New', partnerId: 'PTR-PW-WORKFLOW', partnerName: 'Playwright Workflow Firm' });
    await Lead.create({ leadCode: 'RC-LD-PW-POLICY-MISSING', customerName: 'Playwright Missing Policy Lead', phone: '9876500002', loanCategory: 'Playwright Missing Policy', loanAmount: 100000, employmentType: 'Salaried', currentStatus: 'New', requiredDocuments: [], assignedEmployeeId: employee.employeeCode, assignedEmployee: employee.name });
    if (!(await admin.comparePassword('PW-Isolated-Test-2026!'))) throw new Error('Disposable Admin credential seed failed validation.');
  } finally {
    await mongoose.disconnect();
  }
}
