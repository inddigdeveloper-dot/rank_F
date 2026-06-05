import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: API_URL });

// Attach JWT from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 clear the token and redirect to /login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getProjects = async () => {
  const { data } = await api.get('/projects');
  return data;
};

export const createProject = async (projectData: any) => {
  const { data } = await api.post('/projects', projectData);
  return data;
};

export const updateProject = async (
  projectId: number,
  fields: { name?: string; business_name?: string; location?: string; radius?: number }
) => {
  const { data } = await api.put(`/projects/${projectId}`, fields);
  return data;
};

export const updateKeyword = async (projectId: number, keywordId: number, text: string) => {
  const { data } = await api.put(`/projects/${projectId}/keywords/${keywordId}`, { text });
  return data;
};

export const triggerScan = async (projectId: number) => {
  const { data } = await api.post(`/projects/${projectId}/scan`);
  return data;
};

export const getProjectHistory = async (projectId: number) => {
  const { data } = await api.get(`/projects/${projectId}/history`);
  return data;
};

export const downloadReport = (projectId: number, scanId?: number) =>
  api.get(`/projects/${projectId}/report/pdf${scanId ? `?scan_id=${scanId}` : ''}`, {
    responseType: 'blob'
  });

export const getUserSettings = async () => {
  const { data } = await api.get('/users/me/settings');
  return data;
};

export const updateUserSettings = async (settings: { serpapi_key?: string }) => {
  const { data } = await api.put('/users/me/settings', settings);
  return data;
};
