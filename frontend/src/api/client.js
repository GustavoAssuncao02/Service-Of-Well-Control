import axios from 'axios';
import { clearSessionCache } from '../utils/sessionCache.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

function isMutatingRequest(config) {
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '');

  if (method === 'post' && (
    url.endsWith('/ticket') ||
    url === '/auth/register/lookup' ||
    url === '/public/evaluations/validate'
  )) {
    return false;
  }

  return ['post', 'put', 'patch', 'delete'].includes(method);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isMutatingRequest(response.config)) {
      clearSessionCache();
    }

    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('swc_token');
      localStorage.removeItem('swc_user');
      clearSessionCache();

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export function getApiError(error) {
  return error?.response?.data?.message || 'Não foi possível concluir a operação.';
}
