import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('swc_user');
    return saved ? JSON.parse(saved) : null;
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('swc_token', data.token);
    localStorage.setItem('swc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }

  async function requestAccess(payload) {
    const { data } = await api.post('/auth/request-access', payload);
    return data;
  }

  async function updateProfile(payload) {
    const { data } = await api.put('/auth/me', payload);
    if (data.token) {
      localStorage.setItem('swc_token', data.token);
    }
    localStorage.setItem('swc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem('swc_token');
    localStorage.removeItem('swc_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, requestAccess, updateProfile, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
