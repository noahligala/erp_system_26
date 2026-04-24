import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "./apiClient";
import { secureStore } from "../utils/storage";
import { toast } from "react-toastify";

const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // ------------------ REFRESH TOKEN ------------------
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = secureStore.get("refreshToken");
      if (!refreshToken) return false;

      const res = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });

      const payload = res.data.data;
      if (!payload?.token?.access_token || !payload?.user) {
        throw new Error("Incomplete refresh data");
      }
      
      const rememberMe = !!localStorage.getItem("refreshToken");

      secureStore.set("accessToken", payload.token.access_token, rememberMe);
      secureStore.set("refreshToken", payload.token.refresh_token, true); 
      secureStore.set("user_data", payload.user, rememberMe);
      secureStore.set("secret_key", payload.user.secret_key, rememberMe);
      secureStore.set("roles", payload.user.roles || [], rememberMe);
      secureStore.set("permissions", payload.user.permissions || [], rememberMe);

      apiClient.defaults.headers.common["Authorization"] = `Bearer ${payload.token.access_token}`;

      setUser(payload.user);
      setRoles(payload.user.roles || []);
      setPermissions(payload.user.permissions || []);

      return true;
    } catch (err) {
      console.warn("Refresh token failed:", err);
      // Interceptor will catch failure and dispatch 'auth-logout'
      return false;
    }
  }, []); 

  // ------------------ INITIALIZE AUTH STATE ------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = secureStore.get("user_data");
        const accessToken = secureStore.get("accessToken");
        const refreshToken = secureStore.get("refreshToken");
        const storedRoles = secureStore.get("roles") || [];
        const storedPermissions = secureStore.get("permissions") || [];

        if (storedUser && accessToken) {
          setUser(storedUser);
          setRoles(storedRoles);
          setPermissions(storedPermissions);
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        } else if (refreshToken) {
          await refreshAccessToken();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [refreshAccessToken]); 

  // ------------------ LOGIN ------------------
  const login = async (credentials, rememberMe = true) => {
    try {
      const res = await apiClient.post("/login", credentials);
      const payload = res.data.data;
      if (!payload?.token?.access_token || !payload?.user) throw new Error("Incomplete login data");

      secureStore.set("accessToken", payload.token.access_token, rememberMe);
      secureStore.set("refreshToken", payload.token.refresh_token, true); 
      secureStore.set("user_data", payload.user, rememberMe);
      secureStore.set("secret_key", payload.user.secret_key, rememberMe);
      secureStore.set("roles", payload.user.roles || [], rememberMe);
      secureStore.set("permissions", payload.user.permissions || [], rememberMe);

      apiClient.defaults.headers.common["Authorization"] = `Bearer ${payload.token.access_token}`;

      setUser(payload.user);
      setRoles(payload.user.roles || []);
      setPermissions(payload.user.permissions || []);

      toast.success("Login successful");
      return { success: true };
    } catch (err) {
      console.error("Login failed:", err);
      return { success: false, error: err.response?.data?.error || err.message || "Login failed" };
    }
  };

  // ------------------ LOGOUT (FIXED REDIRECT LOGIC) ------------------
  const logout = useCallback(
    (message = "You have been logged out.") => {
      ["accessToken", "refreshToken", "user_data", "roles", "permissions", "secret_key"].forEach((k) =>
        secureStore.remove(k)
      );

      setUser(null);
      setRoles([]);
      setPermissions([]);

      // Only show toast if a message is explicitly provided
      if (message) {
         toast.info(message);
      }

      const currentPath = location.pathname;
      
      // Define which paths are Public. We do not want to redirect if the user is on these.
      const isPublicRoute = currentPath.startsWith("/careers") || currentPath === "/login" || currentPath === "/register";

      // If they are on a protected route, save their path and redirect to login
      if (!isPublicRoute) {
        if (currentPath && currentPath !== "/login") {
          secureStore.set("lastVisitedPath", currentPath);
        }
        navigate("/login", { replace: true });
      }
      // If they ARE on a public route, we do nothing else. They stay on the page!
    },
    [navigate, location.pathname]
  );

  useEffect(() => {
    const handleAuthLogout = () => {
      // If the interceptor triggers this, silently clear state without a pop-up 
      // if they are on a public page, otherwise alert them.
      const currentPath = window.location.pathname;
      const isPublic = currentPath.startsWith("/careers");
      
      logout(isPublic ? null : "Session expired. Please sign in again.");
    };

    window.addEventListener("auth-logout", handleAuthLogout);
    return () => window.removeEventListener("auth-logout", handleAuthLogout);
  }, [logout]); 

  // ------------------ PERMISSION CHECK ------------------
  const hasPermission = (perm) => {
    if (permissions.includes(perm)) return true;
    toast.error("Permission denied.");
    return false;
  };

  const value = {
    user,
    roles,
    permissions,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    apiClient,
    hasRole: (role) => roles.includes(role),
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};