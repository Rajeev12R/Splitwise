import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (error) {
          console.error('Auto-login failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Login request failed. Details:', error);
      setLoading(false);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to sign in'
      };
    }
  };

  const register = async (email, password, name) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { email, password, name });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Registration request failed. Details:', error);
      setLoading(false);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
