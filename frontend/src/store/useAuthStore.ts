import { create } from 'zustand';

interface Profile {
  first_name: string;
  last_name: string;
  phone_number: string;
  currency: string;
  monthly_income: number;
  savings_target: number;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  profile: Profile | null;
  accounts: Account[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorageItem = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getLocalStorageItem('finsense_token'),
  refreshToken: getLocalStorageItem('finsense_refresh_token'),
  user: null,
  isAuthenticated: !!getLocalStorageItem('finsense_token'),
  isLoading: false,

  setTokens: (token, refreshToken) => {
    setLocalStorageItem('finsense_token', token);
    setLocalStorageItem('finsense_refresh_token', refreshToken);
    set({ token, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  login: (token, refreshToken, user) => {
    setLocalStorageItem('finsense_token', token);
    setLocalStorageItem('finsense_refresh_token', refreshToken);
    set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    removeLocalStorageItem('finsense_token');
    removeLocalStorageItem('finsense_refresh_token');
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
