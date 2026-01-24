import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSession, logout as apiLogout, toUser } from '../services/auth';
import { resetCsrfToken } from '../services/api';

export type User = {
  id: string;
  name: string;
  type: 'EMPLOYEE' | 'ADMIN';
  initials?: string;
  role?: string;
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const session = await getSession();
        if (isMounted) {
          setUser(toUser(session.user));
        }
      } catch {
        // No active session; remain unauthenticated
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    resetCsrfToken();

    try {
      await apiLogout();
    } catch {
      // Ignore logout errors - local state already cleared
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
