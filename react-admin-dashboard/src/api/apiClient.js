import axios from "axios";
import { secureStore } from "../utils/storage";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ------------------- REQUEST INTERCEPTOR -------------------
apiClient.interceptors.request.use(
  (config) => {
    const token = secureStore.get("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------- RESPONSE INTERCEPTOR -------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    // --- 1. Handle 403 Forbidden (Permission Denied) ---
    if (error.response?.status === 403) {
      // Show the toast with the error message from the backend
      const errorMessage = error.response.data?.error || "Access denied. You do not have permission.";
      toast.error(errorMessage);
      
      // Reject the promise so the component's .catch() or finally() can run
      return Promise.reject(error);
    }
    // ----------------------------------------

    // --- 2. Handle 401 Unauthorized (Token Expired) ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;
      const refreshToken = secureStore.get("refreshToken");

      if (!refreshToken) {
        isRefreshing = false;
        // Dispatch event for AuthProvider to handle logout
        window.dispatchEvent(new Event("auth-logout")); 
        return Promise.reject(error);
      }

      try {
        // We use axios directly here to avoid interceptor loop
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        // --- This now expects the full user payload ---
        const payload = response.data.data;
        if (!payload?.token?.access_token || !payload?.user) {
          throw new Error("Invalid refresh response");
        }

        const { access_token, refresh_token } = payload.token;
        
        // We need to re-set all user data on refresh
        const rememberMe = !!localStorage.getItem("refreshToken");
        secureStore.set("accessToken", access_token, rememberMe);
        secureStore.set("refreshToken", refresh_token, true);
        
        // Re-set user data (as implemented in AuthProvider fix)
        secureStore.set("user_data", payload.user, rememberMe);
        secureStore.set("secret_key", payload.user.secret_key, rememberMe);
        secureStore.set("roles", payload.user.roles || [], rememberMe);
        secureStore.set("permissions", payload.user.permissions || [], rememberMe);

        apiClient.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        
        // Pass the new token to the waiting queue
        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Dispatch event for AuthProvider to handle logout
        window.dispatchEvent(new Event("auth-logout"));
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
       // For other errors (500, 404, etc.), just let them fall through
    return Promise.reject(error);
  }
);

