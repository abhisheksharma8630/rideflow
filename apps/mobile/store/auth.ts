import { create } from 'zustand';
import type { AuthUser, UserRole } from '../types';
import { api } from '../services/api';
import { clearToken, getToken, saveToken } from '../services/storage';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (phone: string, role: UserRole, name?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setUser: (u: AuthUser) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  async login(phone, role, name) {
    set({ loading: true });
    try {
      const res = await api.demoLogin(phone, role, name);
      await saveToken(res.accessToken);
      await connectSocket();
      set({ user: res.user });
      return res.user;
    } finally {
      set({ loading: false });
    }
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore network errors on logout */
    }
    disconnectSocket();
    await clearToken();
    set({ user: null });
  },

  async restore() {
    try {
      const token = await getToken();
      if (!token) {
        set({ initialized: true });
        return;
      }
      const user = await api.me();
      await connectSocket();
      set({ user });
    } catch {
      await clearToken();
    } finally {
      set({ initialized: true });
    }
  },

  setUser(user) {
    set({ user });
  },
}));
