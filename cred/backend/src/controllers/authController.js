import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { maskPartnerAccount } from "../services/partnerSensitiveData.js";
import { createHash, randomBytes } from "crypto";
import { getPasswordResetUrl, isPasswordResetEmailConfigured, sendPasswordResetEmail } from "../services/passwordResetEmail.js";

const sessionCookie = "realcred_session";
const csrfCookie = "realcred_csrf";
const cookieOptions = (httpOnly = false) => ({ httpOnly, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/api", maxAge: 24 * 60 * 60 * 1000 });
const issueSession = (res, token) => {
  const csrf = randomBytes(32).toString("base64url");
  res.cookie(sessionCookie, token, cookieOptions(true));
  res.cookie(csrfCookie, csrf, cookieOptions(false));
  return csrf;
};
export const getCsrfToken = (req, res) => {
  const csrf = req.cookies?.[csrfCookie] || randomBytes(32).toString("base64url");
  if (!req.cookies?.[csrfCookie]) res.cookie(csrfCookie, csrf, cookieOptions(false));
  return res.json({ success: true, csrfToken: csrf });
};

// Generate JWT token
const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const passwordResetMessage = "If an active account matches those details, a password reset link will be sent to its email address.";

export const requestPasswordReset = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = String(req.body?.role || "").trim().toLowerCase();
  if (!["admin", "partner", "employee"].includes(role)) return res.status(400).json({ success: false, message: "Choose Admin, Partner, or Employee." });
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return res.status(400).json({ success: false, message: "Enter a valid account email address." });
  if (process.env.NODE_ENV === "production" && !isPasswordResetEmailConfigured()) {
    return res.status(503).json({ success: false, message: "Password recovery email is not configured. Please contact your administrator." });
  }

  try {
    const user = await User.findOne({ email, role, status: "active" }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.json({ success: true, message: passwordResetMessage });

    const token = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const resetUrl = getPasswordResetUrl(token);

    if (!isPasswordResetEmailConfigured() && process.env.NODE_ENV !== "production") {
      return res.json({ success: true, message: "Email delivery is not configured in this development environment. Use this one-time development link to finish the reset.", developmentResetUrl: resetUrl });
    }

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();
      console.error("Password reset email delivery failed:", error.message);
    }
    return res.json({ success: true, message: passwordResetMessage });
  } catch (error) {
    console.error("Password reset request failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to process the password reset request. Please try again." });
  }
};

export const resetPassword = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = req.body?.newPassword;
  if (!/^[a-f\d]{64}$/i.test(token)) return res.status(400).json({ success: false, message: "This password reset link is invalid or has expired." });
  if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) {
    return res.status(400).json({ success: false, message: "Choose a password between 12 and 128 characters." });
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ success: false, message: "This password reset link is invalid or has expired." });

    user.password = newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return res.json({ success: true, message: "Password reset successfully. Sign in with your new password." });
  } catch (error) {
    console.error("Password reset failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to reset the password. Please try again." });
  }
};

// Safe user response (never expose password)
const getSafeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  phone: user.phone,
  status: user.status,
  profileImage: user.profileImage,

  employeeCode: user.employeeCode,
  partnerCode: user.partnerCode,

  companyName: user.companyName,
  contactPerson: user.contactPerson,
  city: user.city,
  address: user.address,
  businessType: user.businessType,
  gstNo: user.gstNo,
  panNo: user.panNo,

  bankName: user.bankName,
  bankBranch: user.bankBranch,
  accountNumber: user.role === "partner" ? maskPartnerAccount(user.accountNumber) : undefined,
  accountHolderName: user.accountHolderName,
  accountType: user.accountType,
  upiId: user.upiId,
  alternatePhone: user.alternatePhone,
  partnerType: user.partnerType,
  state: user.state,
  pinCode: user.pinCode,
  communicationAddress: user.communicationAddress,
  partnerApprovalStatus: user.partnerApprovalStatus,
  ifsc: user.ifsc,

  lastLogin: user.lastLogin,
  mustChangePassword: Boolean(user.mustChangePassword),
});

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    const identifier = (email || username || "").trim();
    if (!["admin", "partner", "employee"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid login role.",
      });
    }

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const normalizedIdentifier = identifier.toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Selected role does not match this account.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: user.role === "partner" && user.partnerApprovalStatus === "pending"
          ? "Your partner application is awaiting administrator approval."
          : user.role === "partner" && user.partnerApprovalStatus === "rejected"
            ? "Your partner application was not approved. Contact support for details."
            : "Your account is inactive or suspended.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), user.tokenVersion || 0);
    const csrfToken = issueSession(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      csrfToken,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
};

// GET CURRENT LOGGED-IN USER
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: getSafeUser(req.user),
  });
};

// UPDATE CURRENT LOGGED-IN USER PROFILE
export const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "partner" && Object.keys(req.body || {}).length) {
      return res.status(409).json({ success: false, message: "Partner profile and bank changes must be submitted through the Admin review workflow." });
    }

    const { name, phone } = req.body;

    // Common profile validation
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name is required.",
        });
      }

      user.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number.",
        });
      }

      const normalizedPhone = phone.trim();

      if (normalizedPhone && normalizedPhone.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number.",
        });
      }

      user.phone = normalizedPhone;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again.",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: "Current password and a new password of 12-128 characters are required." });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.comparePassword(currentPassword))) return res.status(400).json({ success: false, message: "Current password is incorrect." });
    if (currentPassword === newPassword) return res.status(400).json({ success: false, message: "Choose a different password." });
    user.password = newPassword;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const token = generateToken(user._id.toString(), user.tokenVersion);
    const csrfToken = issueSession(res, token);
    return res.json({ success: true, message: "Password changed successfully.", csrfToken, user: getSafeUser(user) });
  } catch (error) {
    console.error("Change password failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to change password." });
  }
};

// Revoke all tokens issued before this logout for this user.
export const logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    res.clearCookie(sessionCookie, { ...cookieOptions(true), maxAge: undefined });
    res.clearCookie(csrfCookie, { ...cookieOptions(false), maxAge: undefined });
    return res.status(200).json({ success: true, message: "Logout successful." });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to log out. Please try again." });
  }
};
