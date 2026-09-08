import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id?: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  company?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: {
    full_name: string;
    email: string;
    password: string;
    confirm_password: string;
    phone?: string;
    company?: string;
    role?: string;
  }) => Promise<any>;
  sendVerification: (email: string) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  requestPasswordReset: (email: string) => Promise<any>;
  confirmPasswordReset: (data: {
    email: string;
    verification_code: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking authentication status...');
      const currentUser = await apiClient.getCurrentUser();
      console.log('👤 User data from checkAuth:', currentUser);
      
      if (currentUser) {
        setUser(currentUser);
        console.log('✅ User state set successfully');
      } else {
        setUser(null);
        console.log('❌ No user found, cleared state');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🏁 Auth check completed, loading finished');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting login process...');
      
      // Login and get the response
      const loginResponse = await apiClient.login({ email, password });
      console.log('✅ Login successful, response received:', !!loginResponse.access_token);
      
      // Check authentication state immediately
      console.log('🔍 Checking authentication state...');
      const currentUser = await apiClient.getCurrentUser();
      console.log('👤 Current user data:', currentUser);
      
      // Set the user state
      setUser(currentUser);
      console.log('🚀 User state updated successfully');
      
      return currentUser;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const signup = async (data: {
    full_name: string;
    email: string;
    password: string;
    confirm_password: string;
    phone?: string;
    company?: string;
    role?: string;
  }) => {
    return await apiClient.signup(data);
  };

  const sendVerification = async (email: string) => {
    return await apiClient.sendVerification(email);
  };

  const verifyEmail = async (email: string, code: string) => {
    const result = await apiClient.verifyEmail(email, code);
    await checkAuth(); // Refresh user data after verification
    return result;
  };

  const requestPasswordReset = async (email: string) => {
    return await apiClient.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (data: {
    email: string;
    verification_code: string;
    new_password: string;
    confirm_password: string;
  }) => {
    const result = await apiClient.confirmPasswordReset(data);
    await checkAuth(); // Refresh user data after password reset
    return result;
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isEmailVerified: user?.email_verified || false,
        login,
        logout,
        signup,
        sendVerification,
        verifyEmail,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
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
