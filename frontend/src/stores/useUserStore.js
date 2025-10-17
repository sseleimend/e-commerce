import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true });

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      set({ loading: false });
      return;
    }

    try {
      const response = await axios.post("/auth/signup", {
        name,
        email,
        password,
      });
      set({ user: response.data.user, loading: false });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Signup failed. Please try again."
      );
      set({ loading: false });
    }
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await axios.post("/auth/login", { email, password });
      set({ user: response.data.user, loading: false });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again."
      );
      set({ loading: false });
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await axios.post("/auth/logout");
      set({ user: null, loading: false });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Logout failed. Please try again."
      );
      set({ loading: false });
    }
  },
  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data.user, checkingAuth: false });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to check authentication."
      );
      set({ checkingAuth: false });
    }
  },

  refreshToken: async () => {
    if (get().checkingAuth) return;

    set({ checkingAuth: true });

    try {
      const response = await axios.post("/auth/refresh-token");
      set({ checkingAuth: false });
      return response.data;
    } catch (error) {
      set({ user: null });
      throw error;
    }
  },
}));

export default useUserStore;

// TODO: implement axios interceptors to handle token refresh
let refreshTokenPromise = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (refreshTokenPromise) {
          await refreshTokenPromise;
          return axios(originalRequest);
        }

        refreshTokenPromise = useUserStore.getState().refreshToken();
        await refreshTokenPromise;
        refreshTokenPromise = null;

        return axios(originalRequest);
      } catch (refreshError) {
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
