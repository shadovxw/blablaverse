import { create } from "zustand";
import { axiosInstanstnce } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useAuthStore = create((set) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,
    isLoggingIn: false,
    onlineUsers: [],

    checkAuth: async () => {
        try {
            const res = await axiosInstanstnce.get("/auth/check");
            set({ authUser: res.data });
        } catch (error) {
            console.log("Error in authCheck:", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true })
        try {
            const res = await axiosInstanstnce.post("/auth/signup", data);
            set({ authUser: res.data });

            toast.success("Account created succesfully!")

        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isSigningUp: false })
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstanstnce.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstanstnce.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstanstnce.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isUpdatingProfile: false });
        }
    }

}))