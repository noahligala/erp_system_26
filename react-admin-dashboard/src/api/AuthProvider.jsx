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

      // --- FIX #1: Process the full payload from the refresh endpoint ---
      const payload = res.data.data;
      if (!payload?.token?.access_token || !payload?.user) {
        throw new Error("Incomplete refresh data");
      }
      
      // Check if original login was persistent
      const rememberMe = !!localStorage.getItem("refreshToken");

      // Set new tokens
      secureStore.set("accessToken", payload.token.access_token, rememberMe);
      secureStore.set("refreshToken", payload.token.refresh_token, true); // always persistent
      
      // Set new user data
      secureStore.set("user_data", payload.user, rememberMe);
      secureStore.set("secret_key", payload.user.secret_key, rememberMe);
      secureStore.set("roles", payload.user.roles || [], rememberMe);
      secureStore.set("permissions", payload.user.permissions || [], rememberMe);

      // Update API client header
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${payload.token.access_token}`;

      // Update React state
      setUser(payload.user);
      setRoles(payload.user.roles || []);
      setPermissions(payload.user.permissions || []);
      // -----------------------------------------------------------------

      return true;
    } catch (err) {
      console.warn("Refresh token failed:", err);
      // The interceptor will catch this failure and dispatch 'auth-logout'
      return false;
    }
  }, []); // No dependencies needed

  // ------------------ INITIALIZE AUTH STATE ------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        // --- FIX #2: Always use secureStore.get() to decrypt data ---
        const storedUser = secureStore.get("user_data");
        const accessToken = secureStore.get("accessToken");
        const refreshToken = secureStore.get("refreshToken");
        const storedRoles = secureStore.get("roles") || [];
        const storedPermissions = secureStore.get("permissions") || [];
        // ---------------------------------------------------------

        if (storedUser && accessToken) {
          // We have a user and a token, set the state
          setUser(storedUser);
          setRoles(storedRoles);
          setPermissions(storedPermissions);
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        } else if (refreshToken) {
          // We have no token/user, but we have a refresh token.
          // Try to refresh. refreshAccessToken() will now set all user state.
          await refreshAccessToken();
          // If it fails, the interceptor will trigger the 'auth-logout'
          // event, which is caught by the other useEffect.
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [refreshAccessToken]); // Dependency is correct

  // ------------------ LOGIN ------------------
  const login = async (credentials, rememberMe = true) => {
    try {
      const res = await apiClient.post("/login", credentials);
      const payload = res.data.data;
      if (!payload?.token?.access_token || !payload?.user) throw new Error("Incomplete login data");

      secureStore.set("accessToken", payload.token.access_token, rememberMe);
      secureStore.set("refreshToken", payload.token.refresh_token, true); // always persistent
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

  // ------------------ LOGOUT ------------------
  const logout = useCallback(
    (message = "You have been logged out.") => {
      ["accessToken", "refreshToken", "user_data", "roles", "permissions", "secret_key"].forEach((k) =>
        secureStore.remove(k)
      );

      setUser(null);
      setRoles([]);
      setPermissions([]);

      toast.info(message);

      // Preserve last visited path
      const currentPath = location.pathname;
      if (currentPath && currentPath !== "/login") {
        secureStore.set("lastVisitedPath", currentPath);
      }

      navigate("/login", { replace: true });
    },
    [navigate, location.pathname]
  );

  // --- This event listener for the interceptor is correct ---
  useEffect(() => {
    // This function will be called when apiClient dispatches the event
    const handleAuthLogout = () => {
      logout("Session expired. Please sign in again.");
    };

    // Listen for the custom event
    window.addEventListener("auth-logout", handleAuthLogout);

    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener("auth-logout", handleAuthLogout);
    };
  }, [logout]); // Add 'logout' as a dependency

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

