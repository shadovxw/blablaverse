import { create } from "zustand";
import { axiosInstanstnce } from "../lib/axios.js";

export const useAuthStore = create((set) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,

    checkAuth: async () => {
        try {
            const res = await axiosInstanstnce.get("/auth/check");
            set({authUser: res.data});
        } catch (error) {
            console.log("Error in authCheck:", error);
            set({authUser: res.data});
        } finally {
            set({isCheckingAuth: false});
        }
    },

    signup: async(data)=> {
        set({isSigningUp:true})
        try {
            const res = await axiosInstanstnce.post("/auth/signup", data);
            set({authUser: res.data});

            toast.success("Account created succesfully!")

        } catch (error) {
            toast.error(error.response.data.message)
        } finally {
            set({isSigningUp:false})
        }
    }
}))