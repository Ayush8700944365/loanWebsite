import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("realcred_user") || "null"); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const persistUser = useCallback((next) => {
    setUser(next);
    if (next) { localStorage.setItem("realcred_user", JSON.stringify(next)); localStorage.setItem("realcred_role", next.role); }
    else { localStorage.removeItem("realcred_user"); localStorage.removeItem("realcred_role"); }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await authApi.getCsrf();
        const response = await authApi.getCurrentUser();
        if (alive && response?.success && response.user) persistUser(response.user);
      } catch (error) {
        if (alive && [401, 403].includes(error.status)) persistUser(null);
      } finally { if (alive) setIsLoading(false); }
    })();
    return () => { alive = false; };
  }, [persistUser]);

  const login = useCallback(async ({ email, username, password, role }) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, username, password, role });
      if (!response?.success || !response.user) throw new Error(response?.message || "Authentication failed");
      if (response.csrfToken) sessionStorage.setItem("realcred_csrf", response.csrfToken);
      persistUser(response.user);
      return { success: true, role: response.user.role, user: response.user };
    } finally { setIsLoading(false); }
  }, [persistUser]);

  const updateUser = useCallback((next) => { if (next) persistUser(next); }, [persistUser]);
  const changePassword = useCallback(async (passwordData) => {
    const response = await authApi.changePassword(passwordData);
    if (!response?.success || !response.user) throw new Error(response?.message || "Password change failed.");
    if (response.csrfToken) sessionStorage.setItem("realcred_csrf", response.csrfToken);
    persistUser(response.user);
    return response.user;
  }, [persistUser]);
  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { sessionStorage.removeItem("realcred_csrf"); persistUser(null); }
  }, [persistUser]);

  const value = { user, isAuthenticated: Boolean(user), role: user?.role || null, isLoading, login, logout, updateUser, changePassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
