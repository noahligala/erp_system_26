// src/api/apiClient.js
import axios from "axios";
import { toast } from "react-toastify";
import { secureStore } from "../utils/storage";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 20000,
});

let isRefreshing = false;
let failedQueue = [];

const PUBLIC_PATHS = ["/public/", "/careers/public", "/jobs/public"];

const isPublicRoute = (url = "") => {
  return PUBLIC_PATHS.some((path) => url.includes(path));
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

const clearAuthAndLogout = () => {
  secureStore.remove("accessToken");
  secureStore.remove("refreshToken");
  secureStore.remove("user_data");
  secureStore.remove("secret_key");
  secureStore.remove("roles");
  secureStore.remove("permissions");

  window.dispatchEvent(new Event("auth-logout"));
};

apiClient.interceptors.request.use(
  (config) => {
    if (isPublicRoute(config.url)) {
      return config;
    }

    const token = secureStore.get("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 403) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Access denied. You do not have permission.";

      toast.error(message);

      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest._retry || isPublicRoute(originalRequest.url)) {
      return Promise.reject(error);
    }

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
      clearAuthAndLogout();
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {
          refresh_token: refreshToken,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const payload = response.data?.data;

      const accessToken = payload?.token?.access_token;
      const newRefreshToken = payload?.token?.refresh_token;
      const user = payload?.user;

      if (!accessToken || !newRefreshToken || !user) {
        throw new Error("Invalid refresh response");
      }

      const rememberMe = Boolean(localStorage.getItem("refreshToken"));

      secureStore.set("accessToken", accessToken, rememberMe);
      secureStore.set("refreshToken", newRefreshToken, true);
      secureStore.set("user_data", user, rememberMe);
      secureStore.set("secret_key", user.secret_key, rememberMe);
      secureStore.set("roles", user.roles || [], rememberMe);
      secureStore.set("permissions", user.permissions || [], rememberMe);

      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthAndLogout();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;