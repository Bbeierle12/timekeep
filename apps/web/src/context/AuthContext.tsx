import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type User = {
  id: string;
  name: string;
  type: 'EMPLOYEE' | 'ADMIN';
  initials?: string;
  role?: string;
};

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User, expiresAt: Date) => void;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = 'timekeep_auth';

type StoredAuth = {
  token: string;
  user: User;
  expiresAt: string;
};

function getStoredAuth(): StoredAuth | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredAuth;

    // Check if expired
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setUser(stored.user);
      setToken(stored.token);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: User, expiresAt: Date) => {
    setUser(newUser);
    setToken(newToken);
    setStoredAuth({
      token: newToken,
      user: newUser,
      expiresAt: expiresAt.toISOString()
    });
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token;

    // Clear state immediately
    setUser(null);
    setToken(null);
    clearStoredAuth();

    // Call logout API if we had a token
    if (currentToken) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch {
        // Ignore logout API errors - we've already cleared local state
      }
    }
  }, [token]);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
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
