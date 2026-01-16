import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'timekeep_auth';

type User = {
  id: string;
  type: 'EMPLOYEE';
  name: string;
  initials: string;
};

type PendingCertification = {
  workDate: string;
  entries: Array<{
    id: string;
    work_date: string;
    action_type: string;
    recorded_at: string;
  }>;
  summary: unknown;
} | null;

type AuthState = {
  token: string | null;
  user: User | null;
  pendingCertification: PendingCertification;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (token: string, user: User, pendingCertification?: PendingCertification) => Promise<void>;
  logout: () => Promise<void>;
  setPendingCertification: (pending: PendingCertification) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    pendingCertification: null,
    isLoading: true
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { token, user, pendingCertification } = JSON.parse(stored);
        setState({
          token,
          user,
          pendingCertification,
          isLoading: false
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (token: string, user: User, pendingCertification?: PendingCertification) => {
    const authData = { token, user, pendingCertification: pendingCertification ?? null };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    setState({
      token,
      user,
      pendingCertification: pendingCertification ?? null,
      isLoading: false
    });
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      token: null,
      user: null,
      pendingCertification: null,
      isLoading: false
    });
  };

  const setPendingCertification = (pending: PendingCertification) => {
    setState(prev => ({ ...prev, pendingCertification: pending }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setPendingCertification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
