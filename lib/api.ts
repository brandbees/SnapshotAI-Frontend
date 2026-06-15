import axios from "axios";
import { API_BASE_URL } from "./constants";
import { getToken, clearToken } from "./auth";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    if (error.response?.status === 403 && getToken()) {
      // Only redirect when mid-session (had a valid token). If no token, the
      // 403 came from the login endpoint itself — let the catch block handle it.
      clearToken();
      if (typeof window !== "undefined") {
        const msg = error.response?.data?.error ?? "Access denied.";
        window.location.href = `/login?error=${encodeURIComponent(msg)}`;
      }
    }
    if (error.response?.status === 503 && error.response?.data?.maintenance === true) {
      if (typeof window !== "undefined") {
        window.location.href = "/maintenance";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
