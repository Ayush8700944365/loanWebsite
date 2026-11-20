import express from "express";

import {
  createEmployee,
  getEmployees,
  updateEmployeeStatus,
  updateEmployee,
  resetEmployeePassword,
} from "../controllers/employeeController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create employee
router.post("/", protect, authorizeRoles("admin"), createEmployee);

// Get all employees
router.get("/", protect, authorizeRoles("admin"), getEmployees);

// Update employee status
router.patch(
  "/:employeeCode/status",
  protect,
  authorizeRoles("admin"),
  updateEmployeeStatus,
);

router.post("/:employeeCode/password-reset", protect, authorizeRoles("admin"), resetEmployeePassword);

router.patch(
  "/:employeeCode",
  protect,
  authorizeRoles("admin"),
  updateEmployee,
);

export default router;
