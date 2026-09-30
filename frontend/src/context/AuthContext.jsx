import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vaani_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vaani_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('vaani_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Token validation failed, clearing session');
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data?.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('vaani_token', newToken);
      localStorage.setItem('vaani_user', JSON.stringify(newUser));
      return { success: true };
    }
    return { success: false, error: res.data?.error || 'Login failed' };
  };

  const register = async (name, email, password, preferred_language = 'hi-IN', role = 'STUDENT') => {
    const res = await authApi.register({ name, email, password, preferred_language, role });
    if (res.data?.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('vaani_token', newToken);
      localStorage.setItem('vaani_user', JSON.stringify(newUser));
      return { success: true };
    }
    return { success: false, error: res.data?.error || 'Registration failed' };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vaani_token');
    localStorage.removeItem('vaani_user');
  };

  const updateProfile = async (updates) => {
    const res = await userApi.updateProfile(updates);
    if (res.data?.success && res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('vaani_user', JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: false, error: res.data?.error || 'Update failed' };
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
