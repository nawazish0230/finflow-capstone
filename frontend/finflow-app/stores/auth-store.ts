import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import { create } from "zustand";
import { authApi, type ApiError } from "@/lib/api";

const TOKEN_KEY = "finflow_access_token";

interface AuthState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      set({ token: stored, isLoading: false });
    } catch {
      set({ token: null, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { accessToken } = await authApi.login(email, password);
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      set({ token: accessToken });
      router.replace("/(tabs)");
    } catch (err) {
      const msg = (err as ApiError).message ?? "Login failed";
      set({ error: msg });
      throw err;
    }
  },

  register: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { accessToken } = await authApi.register(email, password);
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      set({ token: accessToken });
      router.replace("/(tabs)");
    } catch (err) {
      const msg = (err as ApiError).message ?? "Registration failed";
      set({ error: msg });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    set({ token: null });
    router.replace("/(auth)/login");
  },

  clearError: () => set({ error: null }),
}));

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      token: state.token,
      isLoading: state.isLoading,
      isAuthenticated: !!state.token,
      error: state.error,
      login: state.login,
      register: state.register,
      logout: state.logout,
      clearError: state.clearError,
    }))
  );
}
