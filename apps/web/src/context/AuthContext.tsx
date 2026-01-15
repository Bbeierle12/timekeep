import { createContext, useContext } from 'react';

export type AuthContextValue = {
  user: null | { id: string; name: string };
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  signOut: () => {}
});

export function useAuthContext() {
  return useContext(AuthContext);
}
