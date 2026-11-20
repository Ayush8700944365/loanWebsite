import User from "../models/User.js";
import { randomBytes, randomUUID } from "crypto";

const temporaryPassword = () => randomBytes(24).toString("base64url");

// CREATE EMPLOYEE - Admin only
export const createEmployee = async (req, res) => {
  try {
    const { name, email, username, phone, designation, department } =
      req.body;

    // Required field validation
    if (!name || !email || !username) {
      return res.status(400).json({
        success: false,
        message: "Name, email and username are required.",
      });
    }

    // Email validation
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters.",
      });
    }

    // Check duplicate email or username
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists.",
      });
    }

    // Generate employee code
    const employeeCode = `EMP-${randomUUID().slice(0, 12).toUpperCase()}`;
    const initialPassword = temporaryPassword();

    // Create employee
    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password: initialPassword,
      phone: phone || "",
      designation: designation || "",
      department: department || "",
      employeeCode,
      role: "employee",
      status: "active",
      mustChangePassword: true,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        username: employee.username,
        employeeCode: employee.employeeCode,
        role: employee.role,
        designation: employee.designation,
        department: employee.department,
        status: employee.status,
        mustChangePassword: employee.mustChangePassword,
      },
      temporaryPassword: initialPassword,
    });
  } catch (error) {
    console.error("Create Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create employee.",
    });
  }
};

// Admin-only one-time password reset. The plaintext is returned only in this response.
export const resetEmployeePassword = async (req, res) => {
  try {
    const employee = await User.findOne({ employeeCode: req.params.employeeCode, role: "employee" }).select("+password");
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found." });
    const initialPassword = temporaryPassword();
    employee.password = initialPassword;
    employee.mustChangePassword = true;
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;
    await employee.save();
    return res.json({ success: true, message: "Temporary password created. The employee must change it at next sign-in.", employeeCode: employee.employeeCode, temporaryPassword: initialPassword });
  } catch (error) {
    console.error("Employee password reset failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to reset employee password." });
  }
};

// GET ALL EMPLOYEES - Admin only
export const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch employees.",
    });
  }
};

// UPDATE EMPLOYEE STATUS - Admin only
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { employeeCode } = req.params;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive.",
      });
    }

    const employee = await User.findOneAndUpdate(
      {
        employeeCode,
        role: "employee",
      },
      { status, $inc: { tokenVersion: 1 } },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee status updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update Employee Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee status.",
    });
  }
};

// UPDATE EMPLOYEE DETAILS - Admin only
export const updateEmployee = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const { name, email, username, phone, designation, department } = req.body;

    const employee = await User.findOne({
      employeeCode,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (!name?.trim() || !email?.trim() || !username?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email and username are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters.",
      });
    }

    const duplicateUser = await User.findOne({
      _id: { $ne: employee._id },
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (duplicateUser) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists.",
      });
    }

    employee.name = name.trim();
    employee.email = normalizedEmail;
    employee.username = normalizedUsername;
    employee.phone = phone || "";
    employee.designation = designation || "";
    employee.department = department || "";

    await employee.save();

    const updatedEmployee = employee.toObject();
    delete updatedEmployee.password;

    return res.status(200).json({
      success: true,
      message: "Employee details updated successfully.",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee details.",
    });
  }
};
