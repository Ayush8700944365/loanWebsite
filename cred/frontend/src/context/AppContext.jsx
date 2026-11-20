import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  leadsApi,
  applicationsApi,
  customersApi,
  interiorReferralsApi,
  banksApi,
  followupsApi,
  invoicesApi,
  employeesApi,
  partnersApi,
  payoutsApi,
  loanCategoriesApi,
  guidesApi,
  ticketsApi,
} from "../services/api";

const AppContext = createContext();

const buildLeadActivityFeed = (leads = []) =>
  leads
    .flatMap((lead) =>
      (lead.statusHistory || []).map((event, index) => ({
        id: `${lead.leadCode || lead.id}-${event._id || event.at || index}`,
        title: `${lead.leadCode || lead.id || "Lead"}: ${event.fromStatus || "Created"} → ${event.toStatus}`,
        actor: event.actorName || event.actorRole || "System",
        timestamp: event.at || event.createdAt || lead.createdAt,
        time: event.at || event.createdAt || lead.createdAt
          ? new Date(event.at || event.createdAt || lead.createdAt).toLocaleString("en-IN")
          : "",
        type: event.actorRole === "admin" ? "approval" : "status",
      })),
    )
    .filter((event) => event.timestamp)
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .slice(0, 10);

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role;
  const [leads, setLeads] = useState([]);

  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [banks, setBanks] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [partners, setPartners] = useState([]);
  const [payouts, setPayouts] = useState([]);

  const [tickets, setTickets] = useState([]);

  const [interiorReferrals, setInteriorReferrals] = useState([]);

  const [followUps, setFollowUps] = useState(() => {
    return [];
  });

  const [activities, setActivities] = useState(() => {
    return [];
  });

  const [guides, setGuides] = useState([]);
  const [loanCategories, setLoanCategories] = useState([]);

  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [activeLeadModal, setActiveLeadModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [ticketError, setTicketError] = useState("");
  const [isApiConnected, setIsApiConnected] = useState(false);

  // Synchronize state with real backend API
  const refreshFromApi = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    setTicketError("");
    try {
      const [
        leadsRes,
        appsRes,
        custRes,
        banksRes,
        followRes,
        invRes,
        empRes,
        partRes,
        payoutsRes,
        categoriesRes,
        guidesRes,
        ticketsRes,
      ] = await Promise.allSettled([
        leadsApi.getAll(),
        role === "admin" ? applicationsApi.getAll() : Promise.resolve(null),
        role === "admin" ? customersApi.getAll() : Promise.resolve(null),
        ["admin", "partner"].includes(role) ? banksApi.getAll() : Promise.resolve(null),
        ["admin", "employee"].includes(role) ? followupsApi.getAll() : Promise.resolve(null),
        role === "admin" ? invoicesApi.getAll() : role === "partner" ? invoicesApi.getMy() : Promise.resolve(null),
        role === "admin" ? employeesApi.getAll() : Promise.resolve(null),
        role === "admin" ? partnersApi.getAll() : Promise.resolve(null),
        role === "admin" ? payoutsApi.getAll() : role === "partner" ? payoutsApi.getMy() : Promise.resolve(null),
        ["admin", "partner"].includes(role) ? loanCategoriesApi.getAll() : Promise.resolve(null),
        guidesApi.getAll(),
        ticketsApi.getAll(),
      ]);

      if (ticketsRes.status === "rejected") setTicketError(ticketsRes.reason?.message || "Unable to load support tickets.");
      else if (!ticketsRes.value?.success) setTicketError(ticketsRes.value?.message || "Unable to load support tickets.");

      let connected = false;
      if (
        leadsRes.status === "fulfilled" &&
        leadsRes.value?.success &&
        Array.isArray(leadsRes.value.leads)
      ) {
        const leadList = leadsRes.value.leads.map((lead) => ({
          ...lead,
          id: lead.leadCode,
          createdDate: lead.createdAt
            ? new Date(lead.createdAt).toLocaleDateString("en-IN")
            : "",
          addedOn: lead.createdAt
            ? new Date(lead.createdAt).toLocaleString("en-IN")
            : "",
        }));

        setLeads(leadList);
        setActivities(buildLeadActivityFeed(leadList));
        connected = true;
      } else if (leadsRes.status === "fulfilled") {
        setLeads([]);
      }
      if (appsRes.status === "fulfilled" && appsRes.value?.data) {
        setApplications(appsRes.value.data);
        connected = true;
      }
      if (["admin", "partner"].includes(role)) {
        try { const referralRes = await interiorReferralsApi.getAll(); setInteriorReferrals(referralRes.referrals || []); connected = true; }
        catch { setInteriorReferrals([]); }
      }
      if (custRes.status === "fulfilled" && custRes.value?.data) {
        setCustomers(custRes.value.data);
        connected = true;
      }
      if (
        banksRes.status === "fulfilled" &&
        banksRes.value?.success &&
        Array.isArray(banksRes.value.banks)
      ) {
        const bankList = banksRes.value.banks.map((bank) => ({
          ...bank,
          id: bank._id,
          status: bank.status === "active" ? "Active" : "Inactive",
        }));

        setBanks(bankList);
        connected = true;
      } else if (banksRes.status === "fulfilled") {
        setBanks([]);
      }
      if (followRes.status === "fulfilled" && followRes.value?.data) {
        setFollowUps(followRes.value.data);
        connected = true;
      }
      if (
        invRes.status === "fulfilled" &&
        invRes.value?.success &&
        Array.isArray(invRes.value.invoices)
      ) {
        setInvoices(invRes.value.invoices);
        connected = true;
      } else if (invRes.status === "fulfilled") {
        setInvoices([]);
      }
      if (
        empRes.status === "fulfilled" &&
        Array.isArray(empRes.value?.employees)
      ) {
        const employeeList = empRes.value.employees.map((employee) => ({
          ...employee,
          id: employee.employeeCode || employee._id,
          role: employee.designation || "Employee",
          designation: employee.designation || "",
          department: employee.department || "",
          status: employee.status === "active" ? "Active" : employee.status,
        }));

        setEmployees(employeeList);
        connected = true;
      }
      if (
        partRes.status === "fulfilled" &&
        Array.isArray(partRes.value?.partners)
      ) {
        const partnerList = partRes.value.partners.map((partner) => ({
          ...partner,
          id: partner.partnerCode || partner._id,
          status: partner.partnerApprovalStatus === "pending"
            ? "Pending"
            : partner.partnerApprovalStatus === "rejected"
              ? "Rejected"
              : partner.status === "suspended" || partner.partnerApprovalStatus === "suspended"
                ? "Suspended"
              : partner.status === "active" ? "Active" : "Inactive",
          joinedDate: partner.createdAt
            ? new Date(partner.createdAt).toLocaleDateString("en-GB")
            : "",
        }));

        setPartners(partnerList);
        connected = true;
      }
      if (
        payoutsRes.status === "fulfilled" &&
        payoutsRes.value?.success &&
        Array.isArray(payoutsRes.value.payments)
      ) {
        setPayouts(payoutsRes.value.payments);
        connected = true;
      } else if (payoutsRes.status === "fulfilled") {
        setPayouts([]);
      }

      if (
        categoriesRes.status === "fulfilled" &&
        categoriesRes.value?.success &&
        Array.isArray(categoriesRes.value.categories)
      ) {
        const categoryList = categoriesRes.value.categories.map((category) => ({
          ...category,
          id: category._id,
        }));

        setLoanCategories(categoryList);
        connected = true;
      } else if (categoriesRes.status === "fulfilled") {
        setLoanCategories([]);
      }
      if (
        guidesRes.status === "fulfilled" &&
        guidesRes.value?.success &&
        Array.isArray(guidesRes.value.guides)
      ) {
        setGuides(
          guidesRes.value.guides.map((guide) => ({
            ...guide,
            id: guide._id,
          })),
        );
        connected = true;
      } else if (guidesRes.status === "fulfilled") {
        setGuides([]);
      }
      // Support Tickets - MongoDB
      if (
        ticketsRes.status === "fulfilled" &&
        ticketsRes.value?.success &&
        Array.isArray(ticketsRes.value.tickets)
      ) {
        const ticketList = ticketsRes.value.tickets.map((ticket) => ({
          ...ticket,
          id: ticket._id,
          messages: (ticket.messages || []).map((message) => ({
            ...message,
            id: message._id,
            timestamp: message.createdAt
              ? new Date(message.createdAt).toLocaleString("en-IN")
              : "",
          })),
        }));

        setTickets(ticketList);
        connected = true;
      } else if (ticketsRes.status === "fulfilled") {
        setTickets([]);
      }
      setIsApiConnected(connected);
    } catch (err) {
      setApiError(err.message || "API Server connection error");
      setIsApiConnected(false);
    } finally {
      setApiLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refreshFromApi();
  }, [refreshFromApi]);

  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString();
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Guides & Documents - MongoDB CRUD
  const uploadGuide = async (formData) => {
    try {
      const response = await guidesApi.upload(formData);

      if (!response?.success || !response?.guide?._id) {
        throw new Error(response?.message || "Guide upload failed.");
      }

      const newGuide = {
        ...response.guide,
        id: response.guide._id,
      };

      setGuides((prev) => [newGuide, ...prev]);
      showToast("Document uploaded successfully.", "success");
      return newGuide;
    } catch (error) {
      showToast(error.message || "Unable to upload document.", "error");
      throw error;
    }
  };

  const deleteGuide = async (guideId) => {
    try {
      const response = await guidesApi.delete(guideId);

      if (!response?.success) {
        throw new Error(response?.message || "Document deletion failed.");
      }

      setGuides((prev) =>
        prev.filter((guide) => guide.id !== guideId && guide._id !== guideId),
      );
      showToast("Document deleted successfully.", "success");
    } catch (error) {
      showToast(error.message || "Unable to delete document.", "error");
      throw error;
    }
  };

  const downloadGuide = async (guide) => {
    try {
      const response = await guidesApi.download(guide._id || guide.id);
      const fileUrl =
        response?.fileUrl || response?.guide?.fileUrl || guide.fileUrl;

      if (!fileUrl) {
        throw new Error("Document download URL not found.");
      }

      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast(error.message || "Unable to download document.", "error");
      throw error;
    }
  };

  // Loan Categories - MongoDB CRUD

  const addLoanCategory = async (categoryData) => {
    try {
      const response = await loanCategoriesApi.create(categoryData);

      if (!response?.success || !response?.category?._id) {
        throw new Error(response?.message || "Unable to create loan category.");
      }

      const newCategory = {
        ...response.category,
        id: response.category._id,
      };

      setLoanCategories((prev) => [newCategory, ...prev]);
      showToast("Loan category created successfully.", "success");

      return newCategory;
    } catch (error) {
      showToast(error.message || "Category creation failed.", "error");
      throw error;
    }
  };

  const updateLoanCategory = async (id, categoryData) => {
    try {
      const response = await loanCategoriesApi.update(id, categoryData);

      if (!response?.success || !response?.category?._id) {
        throw new Error(response?.message || "Unable to update loan category.");
      }

      const updatedCategory = {
        ...response.category,
        id: response.category._id,
      };

      setLoanCategories((prev) =>
        prev.map((category) =>
          category.id === id || category._id === id
            ? updatedCategory
            : category,
        ),
      );

      showToast("Loan category updated successfully.", "success");

      return updatedCategory;
    } catch (error) {
      showToast(error.message || "Category update failed.", "error");
      throw error;
    }
  };

  const deleteLoanCategory = async (id) => {
    try {
      const response = await loanCategoriesApi.delete(id);

      if (!response?.success) {
        throw new Error(response?.message || "Unable to delete loan category.");
      }

      setLoanCategories((prev) =>
        prev.filter((category) => category.id !== id && category._id !== id),
      );

      showToast("Loan category deleted successfully.", "success");
    } catch (error) {
      showToast(error.message || "Category deletion failed.", "error");
      throw error;
    }
  };

  // Lead Actions
  const addLead = async (newLead) => {
    try {
      const response = role === "admin" ? await leadsApi.create(newLead) : await leadsApi.createWebsite(newLead);
      if (!response?.success || !response?.lead) throw new Error(response?.message || "Lead creation failed.");
      const created = { ...response.lead, id: response.lead.leadCode };
      setLeads((prev) => [created, ...prev]);
      showToast("Lead created successfully.", "success");
      return created;
    } catch (error) { showToast(error.message || "Lead creation failed.", "error"); throw error; }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const response = await leadsApi.update(leadId, {
        currentStatus: newStatus,
      });

      if (!response?.success || !response?.lead) {
        throw new Error(response?.message || "Unable to update lead status.");
      }

      const updatedLead = {
        ...response.lead,
        id: response.lead.leadCode,
      };

      const nextLeads = leads.map((lead) => (lead.id === leadId ? updatedLead : lead));
      setLeads(nextLeads);
      setActivities(buildLeadActivityFeed(nextLeads));
      showToast("Lead status updated successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to update lead status.", "error");
      await refreshFromApi();
    }
  };

  const assignLead = async (leadId, employeeName, employeeCode) => {
    try {
      if (!employeeCode) {
        throw new Error("Valid employee code is required.");
      }

      const response = await leadsApi.assign(leadId, employeeCode);

      if (!response?.success || !response?.lead) {
        throw new Error(response?.message || "Unable to assign lead.");
      }

      const updatedLead = {
        ...response.lead,
        id: response.lead.leadCode,
      };

      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? updatedLead : lead)),
      );

      showToast(
        `Lead successfully assigned to ${updatedLead.assignedEmployee || employeeName}.`,
        "success",
      );
    } catch (error) {
      showToast(error.message || "Lead assignment failed.", "error");
      await refreshFromApi();
    }
  };

  const addLeadNote = async (leadId, text, author = "CRM Manager") => {
    try {
      if (!text?.trim()) {
        throw new Error("Note cannot be empty.");
      }

      const response = await leadsApi.update(leadId, {
        note: text.trim(),
      });

      if (!response?.success || !response?.lead) {
        throw new Error(response?.message || "Unable to save note.");
      }

      const updatedLead = {
        ...response.lead,
        id: response.lead.leadCode,
      };

      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? updatedLead : lead)),
      );

      showToast("Note saved successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to save note.", "error");
      await refreshFromApi();
    }
  };

  // Applications Actions
  const addApplication = async (appData) => {
    try {
      const response = await applicationsApi.create(appData);
      if (!response?.success || !response.data) throw new Error(response?.message || "Application creation failed.");
      setApplications((prev) => [response.data, ...prev]);
      setLeads((prev) => [{ ...response.lead, id: response.lead.leadCode }, ...prev]);
      showToast("Application created.", "success");
      return response.data;
    } catch (error) { showToast(error.message || "Application creation failed.", "error"); throw error; }
  };

  const updateApplicationStatus = async (appId, status) => {
    try {
      const response = await applicationsApi.update(appId, { status });
      if (!response?.success || !response.data) throw new Error(response?.message || "Application update failed.");
      setApplications((prev) => prev.map((app) => app.id === appId ? response.data : app));
      showToast(`Application marked ${status}.`, "success");
    } catch (error) { showToast(error.message || "Application update failed.", "error"); throw error; }
  };

  const deleteApplication = async () => {
    showToast("Applications are linked to permanent lead records; use the retention-approved lead workflow.", "error");
  };

  // Customer Actions
  const addCustomer = async (custData) => {
    try {
      const response = await customersApi.create(custData);
      if (!response?.success || !response.data) throw new Error(response?.message || "Customer lead could not be created.");
      setCustomers((prev) => [response.data, ...prev]);
      setLeads((prev) => [{ ...response.lead, id: response.lead.leadCode }, ...prev]);
      showToast("Customer lead created with pending verification status.", "success");
      return response.data;
    } catch (error) { showToast(error.message || "Customer creation failed.", "error"); throw error; }
  };

  // Bank Actions

  // Bank Actions - MongoDB CRUD

  const addBank = async (bankData) => {
    try {
      const payload = {
        ...bankData,
        name: bankData.name.trim(),
        category: bankData.category.trim(),
        status:
          bankData.status?.toLowerCase() === "inactive" ? "inactive" : "active",
        activeFiles: Number(bankData.activeFiles) || 0,
      };

      const response = await banksApi.create(payload);

      if (!response?.success || !response?.bank?._id) {
        throw new Error(response?.message || "Bank creation failed.");
      }

      const newBank = {
        ...response.bank,
        id: response.bank._id,
        status: response.bank.status === "active" ? "Active" : "Inactive",
      };

      setBanks((prev) => [newBank, ...prev]);
      showToast("Bank added successfully.", "success");

      return newBank;
    } catch (error) {
      showToast(error.message || "Unable to add bank.", "error");
      throw error;
    }
  };

  const updateBank = async (bankId, bankData) => {
    try {
      const payload = { ...bankData };

      if (payload.status) {
        payload.status = payload.status.toLowerCase();
      }

      const response = await banksApi.update(bankId, payload);

      if (!response?.success || !response?.bank?._id) {
        throw new Error(response?.message || "Bank update failed.");
      }

      const updatedBank = {
        ...response.bank,
        id: response.bank._id,
        status: response.bank.status === "active" ? "Active" : "Inactive",
      };

      setBanks((prev) =>
        prev.map((bank) =>
          bank.id === bankId || bank._id === bankId ? updatedBank : bank,
        ),
      );

      showToast("Bank updated successfully.", "success");
      return updatedBank;
    } catch (error) {
      showToast(error.message || "Unable to update bank.", "error");
      throw error;
    }
  };

  const deleteBank = async (bankId) => {
    try {
      const response = await banksApi.delete(bankId);

      if (!response?.success) {
        throw new Error(response?.message || "Bank deletion failed.");
      }

      setBanks((prev) =>
        prev.filter((bank) => bank.id !== bankId && bank._id !== bankId),
      );

      showToast("Bank deleted successfully.", "success");
    } catch (error) {
      showToast(error.message || "Unable to delete bank.", "error");
      throw error;
    }
  };

  const toggleBankStatus = async (bankId) => {
    const bank = banks.find(
      (item) => item.id === bankId || item._id === bankId,
    );

    if (!bank) {
      showToast("Bank not found.", "error");
      return;
    }

    const newStatus = bank.status === "Active" ? "inactive" : "active";

    await updateBank(bank._id || bank.id, {
      status: newStatus,
    });
  };

  // Follow-up Actions
  const addFollowUp = async (data) => {
    try {
      const response = await followupsApi.create(data);
      if (!response?.success || !response.followUp) throw new Error(response?.message || "Follow-up creation failed.");
      setFollowUps((prev) => [response.followUp, ...prev]);
      showToast("Follow-up scheduled successfully", "success");
      return response.followUp;
    } catch (error) { showToast(error.message || "Follow-up creation failed.", "error"); throw error; }
  };

  const toggleFollowUpStatus = async (id) => {
    const current = followUps.find((item) => item.id === id || item._id === id);
    const reminderStatus = current?.reminderStatus === "Completed" ? "Scheduled" : "Completed";
    try {
      const response = await followupsApi.update(id, { reminderStatus });
      if (!response?.success || !response.followUp) throw new Error(response?.message || "Follow-up update failed.");
      setFollowUps((prev) => prev.map((item) => item.id === id || item._id === id ? response.followUp : item));
      showToast("Follow-up status updated.", "success");
    } catch (error) { showToast(error.message || "Follow-up update failed.", "error"); throw error; }
  };

  // Invoices & Payouts
  const addInvoice = async (invoiceData) => {
    try {
      const response = await invoicesApi.create(invoiceData);
      if (!response?.success || !response.invoice) throw new Error(response?.message || "Invoice creation failed.");
      setInvoices((prev) => [response.invoice, ...prev]);
      showToast(`Invoice ${response.invoice.invoiceNumber} created.`, "success");
      return response.invoice;
    } catch (error) { showToast(error.message || "Invoice creation failed.", "error"); throw error; }
  };

  const updateInvoiceStatus = async (invoiceNumber, newStatus) => {
    const invoice = invoices.find((item) => item.invoiceNumber === invoiceNumber || item._id === invoiceNumber);
    if (!invoice?._id) throw new Error("Invoice record could not be found.");
    try {
      const response = await invoicesApi.updateStatus(invoice._id, newStatus);
      if (!response?.success || !response.invoice) throw new Error(response?.message || "Invoice update failed.");
      setInvoices((prev) => prev.map((item) => item._id === invoice._id ? response.invoice : item));
      showToast(`Invoice marked ${newStatus}.`, "success");
    } catch (error) { showToast(error.message || "Invoice status update failed.", "error"); throw error; }
  };

  // Employees & Partners

  const addEmployee = async (empData) => {
    try {
      const response = await employeesApi.create({
        name: empData.name.trim(),
        email: empData.email.trim().toLowerCase(),
        username: empData.username.trim().toLowerCase(),
        phone: empData.phone?.trim() || "",
        designation: empData.role || "",
        department: empData.department || "",
      });

      // Support the API response shape returned by the backend.
      const employeeRecord =
        response?.employee || response?.data?.employee || response?.data;

      if (!response?.success || !employeeRecord?._id) {
        throw new Error(response?.message || "Employee creation failed.");
      }

      const newEmployee = {
        ...employeeRecord,
        id: employeeRecord.employeeCode || employeeRecord._id,
        status:
          employeeRecord.status === "active" ? "Active" : employeeRecord.status,
        role: empData.role || "Employee",
        department: empData.department || "",
      };

      setEmployees((prev) => [newEmployee, ...prev]);

      showToast(
        `Employee ${newEmployee.name} onboarded successfully`,
        "success",
      );

      return { ...newEmployee, temporaryPassword: response.temporaryPassword };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to create employee.";

      showToast(message, "error");
      throw error;
    }
  };

  const resetEmployeePassword = async (employeeCode) => {
    const response = await employeesApi.resetPassword(employeeCode);
    if (!response?.success || !response.temporaryPassword) throw new Error(response?.message || "Unable to reset employee password.");
    showToast("Temporary password generated. Share it through a trusted channel.", "success");
    return response.temporaryPassword;
  };

  const toggleEmployeeStatus = async (empId) => {
    try {
      const employee = employees.find((emp) => emp.id === empId);

      if (!employee) {
        throw new Error("Employee not found.");
      }

      const newStatus = employee.status === "Active" ? "inactive" : "active";

      const response = await employeesApi.update(
        employee.employeeCode || employee.id,
        { status: newStatus },
      );

      if (!response?.success) {
        throw new Error(response?.message || "Status update failed.");
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === empId
            ? {
                ...emp,
                status: newStatus === "active" ? "Active" : "Inactive",
              }
            : emp,
        ),
      );

      showToast(`Employee status updated to ${newStatus}.`, "success");
    } catch (error) {
      showToast(
        error.data?.message ||
          error.message ||
          "Unable to update employee status.",
        "error",
      );
    }
  };

  // UPDATE EMPLOYEE DETAILS - MongoDB
  const updateEmployee = async (employeeCode, employeeData) => {
    try {
      const response = await employeesApi.updateDetails(employeeCode, {
        name: employeeData.name.trim(),
        email: employeeData.email.trim().toLowerCase(),
        username: employeeData.username.trim().toLowerCase(),
        phone: employeeData.phone?.trim() || "",
        designation: employeeData.designation || "",
        department: employeeData.department || "",
      });

      if (!response?.success || !response?.employee) {
        throw new Error(response?.message || "Employee update failed.");
      }

      const updatedRecord = response.employee;

      const updatedEmployee = {
        ...updatedRecord,
        id: updatedRecord.employeeCode || updatedRecord._id,
        role: updatedRecord.designation || "Employee",
        designation: updatedRecord.designation || "",
        department: updatedRecord.department || "",
        status:
          updatedRecord.status === "active" ? "Active" : updatedRecord.status,
      };

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeCode || emp.employeeCode === employeeCode
            ? updatedEmployee
            : emp,
        ),
      );

      showToast("Employee details updated successfully.", "success");

      return updatedEmployee;
    } catch (error) {
      showToast(
        error.data?.message ||
          error.message ||
          "Unable to update employee details.",
        "error",
      );
      throw error;
    }
  };

  const addPartner = async (partnerData) => {
    try {
      const response = await partnersApi.create({
        companyName: partnerData.companyName.trim(),
        contactPerson: partnerData.contactPerson.trim(),
        email: partnerData.email.trim().toLowerCase(),
        username: partnerData.username.trim().toLowerCase(),
        password: partnerData.password,
        phone: partnerData.phone?.trim() || "",
        city: partnerData.city?.trim() || "",
        businessType: partnerData.businessType?.trim() || "",
        gstNo: partnerData.gstNo?.trim() || "",
        panNo: partnerData.panNo?.trim() || "",
      });

      if (!response?.success || !response?.partner) {
        throw new Error(response?.message || "Partner creation failed.");
      }

      const record = response.partner;

      const newPartner = {
        ...record,
        id: record.partnerCode || record._id,
        status: record.status === "active" ? "Active" : record.status,
        joinedDate: record.createdAt
          ? new Date(record.createdAt).toLocaleDateString("en-GB")
          : "",
      };

      setPartners((prev) => [newPartner, ...prev]);

      showToast("Partner created successfully.", "success");

      return newPartner;
    } catch (error) {
      showToast(error.message || "Unable to create partner.", "error");
      throw error;
    }
  };

  const togglePartnerStatus = async (partnerId, requestedStatus = null, reason = "") => {
    try {
      const partner = partners.find((p) => p.id === partnerId);

      if (!partner) {
        throw new Error("Partner not found.");
      }

      const newStatus = requestedStatus || (partner.status === "Active" || partner.status === "active" ? "inactive" : "active");

      const response = await partnersApi.updateStatus(
        partner.partnerCode || partner.id,
        newStatus,
        reason,
      );

      if (!response?.success || !response?.partner) {
        throw new Error(response?.message || "Partner status update failed.");
      }

      const updatedRecord = response.partner;

      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId
            ? {
                ...updatedRecord,
                id: updatedRecord.partnerCode || updatedRecord._id,
                status: updatedRecord.status === "active" ? "Active" : updatedRecord.status === "pending" ? "Pending" : updatedRecord.status === "suspended" ? "Suspended" : updatedRecord.status === "inactive" ? "Inactive" : updatedRecord.status,
              }
            : p,
        ),
      );

      showToast(`Partner status updated to ${newStatus}.`, "success");
      return true;
    } catch (error) {
      showToast(error.message || "Unable to update partner status.", "error");
      return false;
    }
  };

  // Support Tickets

  // Support Tickets - MongoDB CRUD

  const addTicket = async (ticketData) => {
    try {
      const response = await ticketsApi.create(ticketData);

      if (!response?.success || !response?.ticket?._id) {
        throw new Error(response?.message || "Ticket creation failed.");
      }

      const newTicket = {
        ...response.ticket,
        id: response.ticket._id,
        messages: (response.ticket.messages || []).map((message) => ({
          ...message,
          id: message._id,
          timestamp: message.createdAt
            ? new Date(message.createdAt).toLocaleString("en-IN")
            : "",
        })),
      };

      setTickets((prev) => [newTicket, ...prev]);
      showToast("Support ticket created successfully.", "success");

      return newTicket;
    } catch (error) {
      showToast(error.message || "Unable to create support ticket.", "error");
      throw error;
    }
  };

  const addTicketMessage = async (ticketId, messageText) => {
    try {
      const existingTicket = tickets.find(
        (ticket) =>
          ticket.ticketId === ticketId ||
          ticket._id === ticketId ||
          ticket.id === ticketId,
      );

      const databaseId = existingTicket?._id || ticketId;

      const response = await ticketsApi.addMessage(databaseId, messageText);

      if (!response?.success || !response?.ticket?._id) {
        throw new Error(response?.message || "Unable to send reply.");
      }

      const updatedTicket = {
        ...response.ticket,
        id: response.ticket._id,
        messages: (response.ticket.messages || []).map((message) => ({
          ...message,
          id: message._id,
          timestamp: message.createdAt
            ? new Date(message.createdAt).toLocaleString("en-IN")
            : "",
        })),
      };

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket._id === databaseId ? updatedTicket : ticket,
        ),
      );

      showToast("Reply sent successfully.", "success");
      return updatedTicket;
    } catch (error) {
      showToast(error.message || "Unable to send reply.", "error");
      throw error;
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const existingTicket = tickets.find(
        (ticket) =>
          ticket.ticketId === ticketId ||
          ticket._id === ticketId ||
          ticket.id === ticketId,
      );

      const databaseId = existingTicket?._id || ticketId;

      const response = await ticketsApi.updateStatus(databaseId, status);

      if (!response?.success || !response?.ticket?._id) {
        throw new Error(response?.message || "Unable to update ticket status.");
      }

      const updatedTicket = {
        ...response.ticket,
        id: response.ticket._id,
      };

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket._id === databaseId ? updatedTicket : ticket,
        ),
      );

      showToast("Ticket status updated successfully.", "success");
      return updatedTicket;
    } catch (error) {
      showToast(error.message || "Unable to update ticket status.", "error");
      throw error;
    }
  };

  // Interior Referrals
  const addInteriorReferral = async (data) => {
    try {
      const response = await interiorReferralsApi.create(data);
      if (!response?.success || !response.referral) throw new Error(response?.message || "Referral could not be saved.");
      setInteriorReferrals((prev) => [response.referral, ...prev]);
      showToast(`Interior referral ${response.referral.id} saved.`, "success");
      return response.referral;
    } catch (error) { showToast(error.message || "Referral could not be saved.", "error"); throw error; }
  };

  const updateInteriorStatus = async (id, newStatus) => {
    try {
      const response = await interiorReferralsApi.updateStatus(id, newStatus);
      if (!response?.success || !response.referral) throw new Error(response?.message || "Referral status could not be updated.");
      setInteriorReferrals((prev) => prev.map((ref) => ref.id === id ? response.referral : ref));
      showToast("Interior referral status updated.", "success");
    } catch (error) { showToast(error.message || "Referral status update failed.", "error"); throw error; }
  };

  return (
    <AppContext.Provider
      value={{
        leads,
        applications,
        customers,
        banks,
        invoices,
        employees,
        partners,
        payouts,
        tickets,
        interiorReferrals,
        followUps,
        activities,
        guides,
        uploadGuide,
        deleteGuide,
        downloadGuide,
        loanCategories,
        addLoanCategory,
        updateLoanCategory,
        deleteLoanCategory,
        currentUserRole,
        setCurrentUserRole,
        activeLeadModal,
        setActiveLeadModal,
        toasts,
        showToast,
        removeToast,
        // API status & Sync
        apiLoading,
        apiError,
        ticketError,
        isApiConnected,
        refreshFromApi,
        // Methods
        addLead,
        updateLeadStatus,
        assignLead,
        addLeadNote,
        addApplication,
        updateApplicationStatus,
        deleteApplication,
        addCustomer,
        addBank,
        updateBank,
        deleteBank,
        toggleBankStatus,
        addInvoice,
        updateInvoiceStatus,
        addEmployee,
        resetEmployeePassword,
        updateEmployee,
        toggleEmployeeStatus,
        addPartner,
        togglePartnerStatus,
        addTicket,
        addTicketMessage,
        updateTicketStatus,
        addFollowUp,
        toggleFollowUpStatus,
        addInteriorReferral,
        updateInteriorStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
