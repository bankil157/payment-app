import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { authenticateUser } from '@/lib/storage';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
  });

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setAuthState({
        isAuthenticated: true,
        currentUser: user,
      });
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const user = authenticateUser(username, password);
    if (user) {
      setAuthState({
        isAuthenticated: true,
        currentUser: user,
      });
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
    });
    localStorage.removeItem('currentUser');
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!authState.currentUser) return false;
    
    const permissions = authState.currentUser.permissions;
    const modulePermissions = permissions[module as keyof typeof permissions];
    
    if (!modulePermissions) return false;
    
    return modulePermissions[action as keyof typeof modulePermissions] || false;
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};