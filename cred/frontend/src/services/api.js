/**
 * RealCred Technology Private Limited – API Client & Service Layer
 * Centralized HTTP integration with the RealCred Node/Express REST API.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

async function csrfToken() {
  // A login/session change rotates the CSRF cookie. Refresh the matching token
  // for each write instead of reusing a stale sessionStorage value.
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include" });
  const data = await response.json();
  if (data.csrfToken) sessionStorage.setItem("realcred_csrf", data.csrfToken);
  return data.csrfToken || "";
}

/** Cookie-authenticated API wrapper with CSRF protection for state changes. */
export async function apiRequest(endpoint, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const csrf = !["GET", "HEAD", "OPTIONS"].includes(method) ? await csrfToken() : "";
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: "include",
  };

  try {
    let res = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Try to parse JSON response
    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = { message: await res.text() };
    }

    // Recover once from a rotated/mismatched CSRF cookie. Middleware rejects
    // this before running the endpoint, so retrying this specific response is safe.
    if (res.status === 403 && data?.code === "CSRF_INVALID" && csrf) {
      headers["X-CSRF-Token"] = await csrfToken();
      res = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
      const retryType = res.headers.get("content-type");
      data = retryType?.includes("application/json") ? await res.json() : { message: await res.text() };
    }

    if (!res.ok) {
      const error = new Error(data?.message || `HTTP error ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Network down or connection refused
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      const netError = new Error(
        "Backend API service is currently unavailable. Please check your network or ensure backend server is running on port 5000.",
      );
      netError.isNetworkError = true;
      throw netError;
    }
    throw err;
  }
}

export function uploadWithProgress(endpoint, formData, onProgress = () => {}) {
  return csrfToken().then((csrf) => new Promise((resolve, reject) => {
    const send = (token, retried = false) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}${endpoint}`);
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader("X-CSRF-Token", token);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () => reject(new Error("Backend API service is currently unavailable."));
      xhr.onload = () => {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch { data = { message: xhr.responseText }; }
        if (xhr.status === 403 && data?.code === "CSRF_INVALID" && !retried) {
          csrfToken().then((freshToken) => send(freshToken, true)).catch(reject);
          return;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          const error = new Error(data?.message || `HTTP error ${xhr.status}`);
          error.status = xhr.status;
          reject(error);
        } else resolve(data);
      };
      xhr.send(formData);
    };
    send(csrf);
  }));
}

export async function apiBlob(endpoint) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: "include" });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Document server could not be reached. Check the backend connection and allowed client URL, then retry.");
    }
    throw error;
  }
  if (!response.ok) {
    let message = `HTTP error ${response.status}`;
    try { message = (await response.json()).message || message; } catch { /* no JSON body */ }
    throw new Error(message);
  }
  return response.blob();
}

/**
 * 1. Authentication API Service
 */
export const authApi = {
  getCsrf: async () => {
    const response = await apiRequest("/auth/csrf");
    if (response.csrfToken) sessionStorage.setItem("realcred_csrf", response.csrfToken);
    return response;
  },
  login: async ({ email, username, password, role }) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, username, password, role }),
    });
  },

  getCurrentUser: async () => {
    const response = await apiRequest("/auth/me", {
      method: "GET",
    });

    return {
      ...response,
      user: response.user || response.data,
    };
  },

  // UPDATE CURRENT LOGGED-IN USER PROFILE
  // UPDATE CURRENT LOGGED-IN USER PROFILE
  updateCurrentUser: async (profileData) => {
    const response = await apiRequest("/auth/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });

    return {
      ...response,
      user: response.user || response.data,
    };
  },

  changePassword: ({ currentPassword, newPassword }) => apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  }),

  logout: async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Local clean up even if API is offline
    } finally {
      localStorage.removeItem("realcred_token");
      localStorage.removeItem("realcred_user");
      localStorage.removeItem("realcred_role");

      sessionStorage.removeItem("realcred_token");
      sessionStorage.removeItem("realcred_user");
      sessionStorage.removeItem("realcred_role");
      sessionStorage.removeItem("realcred_csrf");
    }
  },
};

/**
 * 2. Leads Management API
 */

export const leadsApi = {
  // Fetch leads visible to the logged-in user
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/leads${query ? `?${query}` : ""}`);
  },

  // Fetch one lead using its database leadCode
  getById: async (leadCode) => {
    return apiRequest(`/leads/${encodeURIComponent(leadCode)}`);
  },

  // Public website loan application
  createWebsite: async (leadData) => {
    return apiRequest("/leads/website", {
      method: "POST",
      body: leadData instanceof FormData ? leadData : JSON.stringify(leadData),
    });
  },

  // Partner referral submission
  createPartner: async (leadData) => {
    return apiRequest("/leads/partner", {
      method: "POST",
      body: JSON.stringify(leadData),
    });
  },

  // Admin assigns lead to an employee
  assign: async (leadCode, employeeCode) => {
    return apiRequest(`/leads/${encodeURIComponent(leadCode)}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ employeeCode }),
    });
  },
  assignPartner: async (leadCode, partnerCode, note = "") => apiRequest(`/leads/${encodeURIComponent(leadCode)}/partner-assignment`, { method: "PATCH", body: JSON.stringify({ partnerCode, note }) }),

  // Backward compatibility for existing addLead() calls
  create: async (leadData) => {
    return apiRequest("/leads/admin", {
      method: "POST",
      body: JSON.stringify(leadData),
    });
  },

  // Update lead details or status
  update: async (leadCode, patchData) => {
    return apiRequest(`/leads/${encodeURIComponent(leadCode)}`, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
  },

  updatePartnerStatus: async (leadCode, status, reason = "") => apiRequest(`/leads/${encodeURIComponent(leadCode)}/partner-status`, {
    method: "PATCH", body: JSON.stringify({ status, reason }),
  }),

  submitDisbursement: (leadCode, formData, onProgress) => uploadWithProgress(`/leads/${encodeURIComponent(leadCode)}/disbursement`, formData, onProgress),
  getDisbursements: (params = {}) => apiRequest(`/leads/disbursements?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null))}`),
  reviewDisbursement: async (leadCode, decision, reason = "") => apiRequest(`/leads/${encodeURIComponent(leadCode)}/disbursement/review`, {
    method: "POST", body: JSON.stringify({ decision, reason }),
  }),
  getDisbursementEvidence: (leadCode, index) => apiBlob(`/leads/${encodeURIComponent(leadCode)}/disbursement/evidence/${index}`),

  // Delete lead
  delete: async (leadCode) => {
    return apiRequest(`/leads/${encodeURIComponent(leadCode)}`, {
      method: "DELETE",
    });
  },
};

/**
 * 3. Loan Applications API
 */
export const applicationsApi = {
  getAll: async () => {
    return apiRequest("/applications");
  },

  create: async (appData) => {
    return apiRequest("/applications", {
      method: "POST",
      body: JSON.stringify(appData),
    });
  },

  update: async (id, patchData) => {
    return apiRequest(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
  },
};

/**
 * 4. Customers Portfolio API
 */
export const customersApi = {
  getAll: async () => {
    return apiRequest("/customers");
  },

  create: async (customerData) => {
    return apiRequest("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  },
};

export const interiorReferralsApi = {
  getAll: () => apiRequest("/interior-referrals"),
  create: (data) => apiRequest("/interior-referrals", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (referralCode, status) => apiRequest(`/interior-referrals/${encodeURIComponent(referralCode)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

/**
 * 5. Follow-ups & Reminders API
 */
export const followupsApi = {
  getAll: async () => {
    return apiRequest("/followups");
  },

  create: async (taskData) => {
    return apiRequest("/followups", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  },

  update: async (id, patchData) => {
    return apiRequest(`/followups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patchData),
    });
  },
};

/**
 * 6. Banks & NBFC Desks API
 */

export const banksApi = {
  // Fetch all banks from MongoDB
  getAll: async () => {
    return apiRequest("/banks");
  },
  getPublic: () => apiRequest("/banks/public", { cache: "no-store" }),
  publicLogoUrl: (key, bankId) => bankId
    ? `${API_BASE_URL}/banks/public/${encodeURIComponent(bankId)}/logo${key ? `?v=${encodeURIComponent(key)}` : ""}`
    : `${API_BASE_URL}/website-content/assets/${encodeURIComponent(key)}`,
  adminLogoUrl: (key) => `${API_BASE_URL}/website-content/admin-assets/${encodeURIComponent(key)}`,
  loadAdminLogo: (key) => apiBlob(`/website-content/admin-assets/${encodeURIComponent(key)}`),
  uploadLogo: (id, formData, onProgress) => uploadWithProgress(`/banks/${encodeURIComponent(id)}/logo`, formData, onProgress),
  deleteLogo: (id) => apiRequest(`/banks/${encodeURIComponent(id)}/logo`, { method: "DELETE" }),
  uploadDocuments: (id, formData, onProgress) => uploadWithProgress(`/banks/${encodeURIComponent(id)}/documents`, formData, onProgress),
  previewDocument: (id, documentId) => apiBlob(`/banks/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/preview`),
  downloadDocument: (id, documentId) => apiBlob(`/banks/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/download`),
  deleteDocument: (id, documentId) => apiRequest(`/banks/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" }),

  // Add new bank
  create: async (bankData) => {
    return apiRequest("/banks", {
      method: "POST",
      body: JSON.stringify(bankData),
    });
  },

  // Update existing bank
  update: async (id, bankData) => {
    return apiRequest(`/banks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(bankData),
    });
  },

  // Delete bank
  delete: async (id) => {
    return apiRequest(`/banks/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * Loan Categories Management API
 */
export const loanCategoriesApi = {
  // Fetch categories from MongoDB
  getAll: async () => {
    return apiRequest("/loan-categories");
  },

  getPublic: () => apiRequest("/loan-categories/public"),

  // Create a new loan category
  create: async (categoryData) => {
    return apiRequest("/loan-categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  },

  // Update an existing loan category
  update: async (id, categoryData) => {
    return apiRequest(`/loan-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(categoryData),
    });
  },

  // Delete a loan category
  delete: async (id) => {
    return apiRequest(`/loan-categories/${id}`, {
      method: "DELETE",
    });
  },
  uploadImage: (id, formData, onProgress) => uploadWithProgress(`/loan-categories/${encodeURIComponent(id)}/image`, formData, onProgress),
  deleteImage: (id) => apiRequest(`/loan-categories/${encodeURIComponent(id)}/image`, { method: "DELETE" }),
  imageUrl: (key) => `${API_BASE_URL}/website-content/assets/${encodeURIComponent(key)}`,
};

export const publicLoanCategoriesApi = {
  getAll: () => apiRequest("/loan-categories/public", { cache: "no-store" }),
};

export const leadDocumentsApi = {
  getAll: (leadCode) => apiRequest(`/leads/${encodeURIComponent(leadCode)}/documents`),
  upload: (leadCode, formData, onProgress) => uploadWithProgress(`/leads/${encodeURIComponent(leadCode)}/documents`, formData, onProgress),
  review: (leadCode, documentId, review) => apiRequest(`/leads/${encodeURIComponent(leadCode)}/documents/${encodeURIComponent(documentId)}/review`, { method: "PATCH", body: JSON.stringify(review) }),
  verifyLead: (leadCode) => apiRequest(`/leads/${encodeURIComponent(leadCode)}/verify`, { method: "POST" }),
  preview: (leadCode, documentId) => apiBlob(`/leads/${encodeURIComponent(leadCode)}/documents/${encodeURIComponent(documentId)}/preview`),
  download: (leadCode, documentId) => apiBlob(`/leads/${encodeURIComponent(leadCode)}/documents/${encodeURIComponent(documentId)}/download`),
};

/**
 * 7. Invoices, Employees & Partners API
 */

export const invoicesApi = {
  getMy: async () => apiRequest("/invoices/my"),
  // Fetch all invoices
  getAll: async () => {
    return apiRequest("/invoices");
  },

  // Fetch single invoice
  getById: async (id) => {
    return apiRequest(`/invoices/${id}`);
  },

  // Create invoice
  create: async (data) => {
    return apiRequest("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update invoice status
  updateStatus: async (id, invoiceStatus) => {
    return apiRequest(`/invoices/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ invoiceStatus }),
    });
  },
  reconcile: (id, payoutId, reason, reconciled = false) => apiRequest(`/invoices/${encodeURIComponent(id)}/reconcile`, { method: "POST", body: JSON.stringify({ payoutId, reason, reconciled }) }),

  // Delete invoice
  delete: async (id) => {
    return apiRequest(`/invoices/${id}`, {
      method: "DELETE",
    });
  },
};

export const employeesApi = {
  getAll: async () => {
    return apiRequest("/employees");
  },

  getMyProfile: async () => {
    return apiRequest("/employees/me");
  },

  create: async (employeeData) => {
    return apiRequest("/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });
  },

  resetPassword: (employeeCode) => apiRequest(`/employees/${encodeURIComponent(employeeCode)}/password-reset`, { method: "POST" }),

  update: async (employeeCode, employeeData) => {
    return apiRequest(`/employees/${employeeCode}/status`, {
      method: "PATCH",
      body: JSON.stringify(employeeData),
    });
  },

  updateDetails: async (employeeCode, employeeData) => {
    return apiRequest(`/employees/${employeeCode}`, {
      method: "PATCH",
      body: JSON.stringify(employeeData),
    });
  },

  getById: async (id) => {
    return apiRequest(`/employees/${id}`);
  },
};

export const partnersApi = {
  getAll: () => apiRequest("/partners"),
  apply: (application, onProgress) => application instanceof FormData ? uploadWithProgress("/partners/apply", application, onProgress) : apiRequest("/partners/apply", { method: "POST", body: JSON.stringify(application) }),
  getEligible: () => apiRequest("/partners/eligible"),
  getMine: () => apiRequest("/partners/me"),
  getCorrection: (token) => apiRequest(`/partners/corrections/${encodeURIComponent(token)}`),
  submitCorrection: (token, formData, onProgress) => uploadWithProgress(`/partners/corrections/${encodeURIComponent(token)}`, formData, onProgress),
  requestCorrection: (partnerCode, correction) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/correction-requests`, { method: "POST", body: JSON.stringify(correction) }),
  getCorrectionRequests: () => apiRequest("/partners/correction-requests"),
  getChangeRequests: () => apiRequest("/partners/change-requests"),
  reviewChangeRequest: (id, payload) => apiRequest(`/partners/change-requests/${encodeURIComponent(id)}/review`, { method: "PATCH", body: JSON.stringify(payload) }),
  requestChanges: (changes) => apiRequest("/partners/me/change-requests", { method: "POST", body: JSON.stringify(changes) }),
  uploadDocuments: (formData, onProgress) => uploadWithProgress("/partners/me/documents", formData, onProgress),
  getPayoutDetails: (partnerCode) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/payout-details`),
  reviewBankDetails: (partnerCode, payload) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/bank-review`, { method: "PATCH", body: JSON.stringify(payload) }),
  reviewDocument: (partnerCode, documentId, payload) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/documents/${encodeURIComponent(documentId)}/review`, { method: "PATCH", body: JSON.stringify(payload) }),
  previewDocument: (partnerCode, documentId, version) => apiBlob(`/partners/${encodeURIComponent(partnerCode)}/documents/${encodeURIComponent(documentId)}/${version ? `versions/${encodeURIComponent(version)}/` : ""}preview`),
  downloadDocument: (partnerCode, documentId, version) => apiBlob(`/partners/${encodeURIComponent(partnerCode)}/documents/${encodeURIComponent(documentId)}/${version ? `versions/${encodeURIComponent(version)}/` : ""}download`),
  updateAdminProfile: (partnerCode, data) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/profile`, { method: "PATCH", body: JSON.stringify(data) }),
  resetPassword: (partnerCode) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/password-reset`, { method: "POST" }),
  uploadAdminDocuments: (partnerCode, formData, onProgress) => uploadWithProgress(`/partners/${encodeURIComponent(partnerCode)}/documents`, formData, onProgress),
  getInternalNotes: (partnerCode) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/internal-notes`),
  addInternalNote: (partnerCode, text) => apiRequest(`/partners/${encodeURIComponent(partnerCode)}/internal-notes`, { method: "POST", body: JSON.stringify({ text }) }),

  create: (partnerData) =>
    apiRequest("/partners", {
      method: "POST",
      body: JSON.stringify(partnerData),
    }),

  updateStatus: (partnerCode, status, reason = "") =>
    apiRequest(`/partners/${partnerCode}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
};

/**
 * Payout Management API
 */

export const payoutsApi = {
  // Admin: fetch all payout records
  getAll: async () => {
    return apiRequest("/payouts");
  },

  // Partner: fetch only authenticated partner's payout records
  getMy: async () => {
    return apiRequest("/payouts/my");
  },

  // Admin: fetch one payout
  getById: async (id) => {
    return apiRequest(`/payouts/${id}`);
  },

  // Admin: calculate a server-authoritative quote using the active commission rule
  quote: (partnerId, leadId) => apiRequest(`/payouts/quote?${new URLSearchParams({ partnerId, leadId })}`),

  // Admin: create payout
  create: async (payoutData) => {
    return apiRequest("/payouts", {
      method: "POST",
      body: JSON.stringify(payoutData),
    });
  },

  // Admin: update payout status
  updateStatus: async (id, status, utr = "", reason = "") => {
    return apiRequest(`/payouts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, utr, reason }),
    });
  },
  uploadEvidence: (id, formData, onProgress) => uploadWithProgress(`/payouts/${encodeURIComponent(id)}/evidence`, formData, onProgress),
  getEvidence: (id, index) => apiBlob(`/payouts/${encodeURIComponent(id)}/evidence/${index}`),
  edit: (id, changes) => apiRequest(`/payouts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(changes) }),
};

export const commissionRulesApi = {
  getAll: () => apiRequest("/commission-rules"),
  save: (rule) => apiRequest("/commission-rules", { method: "POST", body: JSON.stringify(rule) }),
  setStatus: (id, status) => apiRequest(`/commission-rules/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

export const documentsApi = {
  getTemplates: () => apiRequest("/documents/templates"),
  uploadTemplate: (formData, onProgress) => uploadWithProgress("/documents/templates", formData, onProgress),
  setTemplateStatus: (id, status) => apiRequest(`/documents/templates/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  downloadTemplate: (id) => apiBlob(`/documents/templates/${encodeURIComponent(id)}/download`),
  generate: (payload) => apiRequest("/documents/generate", { method: "POST", body: JSON.stringify(payload) }),
  getGenerated: (params = {}) => apiRequest(`/documents/generated${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`),
  downloadGenerated: (documentCode) => apiBlob(`/documents/generated/${encodeURIComponent(documentCode)}/download`),
};

/**
 * Website Content Management API
 */
export const websiteContentApi = {
  // Public website and Admin CMS - fetch saved content
  get: async () => {
    return apiRequest("/website-content", { cache: "no-store" });
  },
  getPublicStats: () => apiRequest("/website-content/public-stats", { cache: "no-store" }),

  // Admin - publish website content
  update: async (contentData) => {
    return apiRequest("/website-content", {
      method: "PUT",
      body: JSON.stringify(contentData),
    });
  },
  uploadTeamPhoto: (formData, onProgress) => uploadWithProgress("/website-content/team-assets", formData, onProgress),
  loadAdminAsset: (assetKey) => apiBlob(`/website-content/admin-assets/${encodeURIComponent(assetKey)}`),
  loadPublicAsset: (assetKey) => apiBlob(`/website-content/assets/${encodeURIComponent(assetKey)}`),
  deleteAsset: (assetKey) => apiRequest(`/website-content/assets/${encodeURIComponent(assetKey)}`, { method: "DELETE" }),
  assetUrl: (assetKey) => `${API_BASE_URL}/website-content/assets/${encodeURIComponent(assetKey)}`,
  adminAssetUrl: (assetKey) => `${API_BASE_URL}/website-content/admin-assets/${encodeURIComponent(assetKey)}`,
};

/**
 * Guides & Documents API
 */
export const guidesApi = {
  getAll: async () => {
    return apiRequest("/guides");
  },

  upload: async (formData) => {
    return apiRequest("/guides", {
      method: "POST",
      body: formData,
    });
  },

  download: async (id) => {
    return apiRequest(`/guides/${id}/download`);
  },

  delete: async (id) => {
    return apiRequest(`/guides/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * Support Tickets API
 */
export const ticketsApi = {
  createCallback: (data) => apiRequest("/tickets/callback", { method: "POST", body: JSON.stringify(data) }),
  // Fetch all support tickets
  getAll: async () => {
    return apiRequest("/tickets", {
      method: "GET",
    });
  },

  // Create a new support ticket
  create: async (ticketData) => {
    return apiRequest("/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  },

  // Add a reply to an existing ticket
  addMessage: async (id, message) => {
    return apiRequest(`/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  // Update ticket status
  updateStatus: async (id, status) => {
    return apiRequest(`/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  assignCallback: (id, employeeCode) => apiRequest(`/tickets/${encodeURIComponent(id)}/assign`, { method: "PATCH", body: JSON.stringify({ employeeCode }) }),
  addInternalNote: (id, note) => apiRequest(`/tickets/${encodeURIComponent(id)}/notes`, { method: "POST", body: JSON.stringify({ note }) }),
};
