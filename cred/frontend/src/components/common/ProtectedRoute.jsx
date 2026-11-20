import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * ProtectedRoute:
 * 1. Checks if user is authenticated; if not, redirects to /login.
 * 2. Checks if user has an authorized role for this route.
 *    If an employee tries to access /admin, redirects them to /employee.
 *    If a partner tries to access /admin, redirects them to /partner.
 *    If an admin tries to access /employee, redirects them to /admin.
 */
export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, role, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Verifying security session...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to centralized login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (!user?.mustChangePassword && location.pathname === "/change-password") {
    const home = role === "admin" ? "/admin" : role === "employee" ? "/employee" : "/partner";
    return <Navigate to={home} replace />;
  }

  // Role not authorized for this specific portal
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to the user's appropriate portal
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'employee') return <Navigate to="/employee" replace />;
    if (role === 'partner') return <Navigate to="/partner" replace />;
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

