import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../../components/common/StatusBadge";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Search,
  Building,
  KeyRound,
} from "lucide-react";

export const AdminEmployeesPage = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    resetEmployeePassword,
    leads,
  } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [credentialNotice, setCredentialNotice] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    designation: "",
    department: "",
  });
  const [newEmpForm, setNewEmpForm] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    role: "Senior Loan Officer",
    department: "",
  });

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAdd = async (e) => {
    e.preventDefault();

    if (
      !newEmpForm.name.trim() ||
      !newEmpForm.email.trim() ||
      !newEmpForm.username.trim()
    )
      return;

    try {
      const created = await addEmployee(newEmpForm);
      setCredentialNotice({ name: created.name, employeeCode: created.employeeCode, username: created.username, password: created.temporaryPassword });

      setShowAddModal(false);
      setNewEmpForm({
        name: "",
        email: "",
        username: "",
        phone: "",
        role: "Senior Loan Officer",
        department: "",
      });
    } catch (error) {
      // Error toast is already handled by AppContext.
    }
  };

  const handlePasswordReset = async (employee) => {
    const employeeCode = employee.employeeCode || employee.id;
    if (!window.confirm(`Generate a new temporary password for ${employee.name}? Existing sessions will be signed out.`)) return;
    try {
      const password = await resetEmployeePassword(employeeCode);
      setCredentialNotice({ name: employee.name, employeeCode, username: employee.username, password });
      setSelectedEmployee(null);
    } catch {
      // The context displays the API error.
    }
  };

  const handleEditClick = (employee) => {
    setEditForm({
      name: employee.name || "",
      email: employee.email || "",
      username: employee.username || "",
      phone: employee.phone || "",
      designation: employee.designation || employee.role || "",
      department: employee.department || "",
    });

    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) return;

    try {
      const employeeCode = selectedEmployee.employeeCode || selectedEmployee.id;

      const updatedEmployee = await updateEmployee(employeeCode, editForm);

      setSelectedEmployee(updatedEmployee);
      setShowEditModal(false);
    } catch (error) {
      // Error toast is already handled by AppContext.
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Employee & Loan Officer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage underwriting team members, track conversion ratios, and lead
            allocations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee by name, role or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total Staff:{" "}
          <strong className="text-slate-800">{employees.length}</strong>
        </span>
      </div>

      {/* Employees Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">
              No employees available
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add your underwriting staff and branch relationship managers.
            </p>
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const empActiveLeads = leads.filter(
              (l) =>
                l.assignedEmployeeId === emp.id ||
                l.assignedEmployee === emp.name,
            ).length;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-premium card-3d transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-royal to-brand-navy text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-brand-navy">
                          {emp.name}
                        </h3>
                        <p className="text-[11px] text-brand-royal font-semibold">
                          {emp.role}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {emp.id}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEmployeeStatus(emp.id)}
                      title="Click to toggle status"
                      className="focus:outline-hidden"
                    >
                      <StatusBadge status={emp.status} size="sm" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs py-3 border-y border-slate-100">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{emp.phone || "—"}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.department || "—"}</span>
                    </div>
                  </div>

                  {/* Performance stats */}
                  <div className="grid grid-cols-3 gap-2 text-center py-3">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">
                        Active Leads
                      </span>
                      <span className="font-bold text-brand-navy text-xs">
                        {empActiveLeads}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">
                        Conversion
                      </span>
                      <span className="font-bold text-emerald-600 text-xs">
                        {emp.conversionRate ?? "—"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">
                        Volume
                      </span>
                      <span className="font-bold text-slate-700 text-xs">
                        {emp.payoutVolume ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Joined:{" "}
                    {emp.createdAt
                      ? new Date(emp.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="text-xs font-bold text-brand-royal hover:underline"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => toggleEmployeeStatus(emp.id)}
                      className="text-xs font-semibold text-slate-600 hover:underline"
                    >
                      {emp.status === "Active"
                        ? "Mark Inactive"
                        : "Activate Staff"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">
                Onboard New Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Roy"
                  value={newEmpForm.name}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, name: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@realcred.in"
                  value={newEmpForm.email}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, email: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter employee username"
                  value={newEmpForm.username}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, username: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">A secure temporary password will be generated and shown once after onboarding. The employee must change it before accessing the portal.</p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98200 XXXXX"
                  value={newEmpForm.phone}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, phone: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Role Title
                </label>
                <select
                  value={newEmpForm.role}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, role: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                >
                  <option value="Senior Loan Officer">
                    Senior Loan Officer
                  </option>
                  <option value="Credit & Mortgage Specialist">
                    Credit & Mortgage Specialist
                  </option>
                  <option value="Branch Relationship Manager">
                    Branch Relationship Manager
                  </option>
                  <option value="Document & Compliance Auditor">
                    Document & Compliance Auditor
                  </option>
                  <option value="Associate Field Executive">
                    Associate Field Executive
                  </option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Assigned Department
                </label>
                <input
                  type="text"
                  placeholder="Enter department or team"
                  value={newEmpForm.department}
                  onChange={(e) =>
                    setNewEmpForm({ ...newEmpForm, department: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-royal hover:bg-brand-navy text-white font-bold rounded-xl shadow-xs"
                >
                  Onboard Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-navy text-lg">
                  Employee Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Complete employee information
                </p>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 py-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-royal to-brand-navy text-white font-extrabold flex items-center justify-center">
                {selectedEmployee.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>

              <div>
                <h4 className="font-bold text-brand-navy">
                  {selectedEmployee.name || "—"}
                </h4>
                <p className="text-xs text-brand-royal">
                  {selectedEmployee.designation || selectedEmployee.role || "—"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedEmployee.employeeCode || selectedEmployee.id || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Email Address</p>
                <p className="font-semibold text-slate-700 break-all">
                  {selectedEmployee.email || "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Username</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.username || "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Phone Number</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.phone || "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Department</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.department || "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Account Status</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.status || "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 mb-1">Joining Date</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.createdAt
                    ? new Date(selectedEmployee.createdAt).toLocaleDateString(
                        "en-IN",
                      )
                    : "—"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2">
                <p className="text-slate-400 mb-1">Last Login</p>
                <p className="font-semibold text-slate-700">
                  {selectedEmployee.lastLogin
                    ? new Date(selectedEmployee.lastLogin).toLocaleString(
                        "en-IN",
                      )
                    : "Never logged in"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5">
              <button
                onClick={() => handlePasswordReset(selectedEmployee)}
                className="mr-auto inline-flex items-center gap-1 rounded-xl border border-amber-300 px-4 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
              >
                <KeyRound className="h-3.5 w-3.5" /> Reset Password
              </button>
              <button
                onClick={() => handleEditClick(selectedEmployee)}
                className="px-5 py-2.5 border border-brand-royal text-brand-royal hover:bg-slate-50 text-xs font-bold rounded-xl"
              >
                Edit Employee
              </button>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-5 py-2.5 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-navy text-lg">
                  Edit Employee
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Update employee information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-5">
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Role / Designation
                </label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) =>
                    setEditForm({ ...editForm, designation: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Assigned Department
                </label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) =>
                    setEditForm({ ...editForm, department: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {credentialNotice && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div><h2 className="text-lg font-extrabold text-brand-navy">Temporary credentials</h2><p className="mt-1 text-xs text-slate-500">Shown once for {credentialNotice.name} ({credentialNotice.employeeCode}). Send through a trusted channel. They must change this password after sign-in.</p></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><p><strong>Username:</strong> {credentialNotice.username}</p><p className="mt-1 break-all"><strong>Temporary password:</strong> <code className="select-all">{credentialNotice.password}</code></p></div>
            <div className="flex justify-end gap-2"><button onClick={async () => { try { await navigator.clipboard.writeText(credentialNotice.password); } catch { /* Keep the password visible for manual copy. */ } }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Copy password</button><button onClick={() => setCredentialNotice(null)} className="rounded-lg bg-brand-royal px-3 py-2 text-xs font-bold text-white">Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
