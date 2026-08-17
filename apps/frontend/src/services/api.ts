import axios, { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.data) {
      const data = error.response.data as ApiErrorResponse;

      if (data.error?.message) {
        const message = data.error.message;
        const enhanced = new Error(message);

        if (data.error.details) {
          const fieldMessages = Object.entries(data.error.details as Record<string, string[]>)
            .map(([, msgs]) => msgs.join(' '))
            .join('\n');
          enhanced.message = message + (fieldMessages ? '\n' + fieldMessages : '');
          (enhanced as Error & { details: Record<string, string[]> }).details = data.error.details;
        }

        return Promise.reject(enhanced);
      }

      if (data.message) {
        return Promise.reject(new Error(data.message));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
