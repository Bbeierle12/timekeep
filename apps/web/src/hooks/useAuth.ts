import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useAuthContext();

  return {
    user: context.user,
    token: context.token,
    isLoading: context.isLoading,
    isAuthenticated: context.isAuthenticated,
    login: context.login,
    logout: context.logout
  };
}
