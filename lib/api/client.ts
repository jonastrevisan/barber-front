import axios from 'axios';
import Cookies from 'js-cookie';
import { getTenantSlug } from '../tenant';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const slug = getTenantSlug();
  if (slug) config.headers['x-tenant-slug'] = slug;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
