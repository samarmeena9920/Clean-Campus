import axios from 'axios';

/**
 * Axios instance with JWT Bearer token injection.
 *
 * On every request, reads the token from localStorage and attaches it.
 * On 401 responses, clears the stored token and redirects to login.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Falls back to relative path if not set
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly cookies too
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle auth errors ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
