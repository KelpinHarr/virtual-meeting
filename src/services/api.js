import axios from 'axios';
import { formatErrorMessage } from '../utils/error';

export { formatErrorMessage };

const API_BASE = 'https://api-meet.gdgsurabaya.web.id/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/join') &&
        !window.location.pathname.startsWith('/room')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────

export async function login(email, password) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const { data } = await api.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function register(userData) {
  const { data } = await api.post('/auth/register', userData);
  return data;
}

export async function guestJoin(displayName, sessionCode) {
  const { data } = await api.post('/auth/guest-join', {
    display_name: displayName,
    session_code: sessionCode,
  });
  localStorage.setItem('token', data.access_token);
  localStorage.setItem(
    'user',
    JSON.stringify({
      display_name: data.display_name,
      role: 'guest',
      session_code: data.session_code,
    })
  );
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function getToken() {
  return localStorage.getItem('token');
}

// ─── Schedules ─────────────────────────────────────────────────────────

export async function getSchedules(upcoming = false) {
  const { data } = await api.get('/schedules', { params: { upcoming } });
  return data;
}

export async function getSchedule(id) {
  const { data } = await api.get(`/schedules/${id}`);
  return data;
}

export async function createSchedule(scheduleData) {
  const { data } = await api.post('/schedules', scheduleData);
  return data;
}

export async function updateSchedule(id, scheduleData) {
  const { data } = await api.put(`/schedules/${id}`, scheduleData);
  return data;
}

export async function deleteSchedule(id) {
  await api.delete(`/schedules/${id}`);
}

// ─── Sessions ──────────────────────────────────────────────────────────

export async function getSessions(status = null) {
  const params = status ? { status } : {};
  const { data } = await api.get('/sessions', { params });
  return data;
}

export async function getSession(id) {
  const { data } = await api.get(`/sessions/${id}`);
  return data;
}

export async function createSession(sessionData) {
  const { data } = await api.post('/sessions', sessionData);
  return data;
}

export async function updateSessionStatus(id, status) {
  const { data } = await api.put(`/sessions/${id}/status`, { status });
  return data;
}

export async function toggleSessionQA(id, qaOpen) {
  const { data } = await api.put(`/sessions/${id}/qa`, { qa_open: qaOpen });
  return data;
}

export async function joinByCode(sessionCode) {
  const { data } = await api.get(`/sessions/join/${sessionCode}`);
  return data;
}

export default api;
