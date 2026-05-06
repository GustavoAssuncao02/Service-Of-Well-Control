import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiError(error) {
  return error?.response?.data?.message || 'Não foi possível concluir a operação.';
}
