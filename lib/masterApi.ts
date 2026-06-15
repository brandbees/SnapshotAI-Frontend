import axios from "axios";
import { API_BASE_URL } from "./constants";
import { getMasterToken, clearMasterToken } from "./masterAuth";

const masterApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

masterApi.interceptors.request.use((config) => {
  const token = getMasterToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

masterApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearMasterToken();
      if (typeof window !== "undefined") {
        window.location.href = "/master/login";
      }
    }
    return Promise.reject(error);
  }
);

export default masterApi;
