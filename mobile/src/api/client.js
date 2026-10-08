import axios from 'axios';
import { API_KEY, API_URL, REQUEST_TIMEOUT_MS, USE_MOCK } from '../config';
import { mockApi } from './mockApi';
import { emitDataChanged } from './events';

const http = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) },
});

/** Turn any axios failure into an Error with a friendly message and flags the UI can branch on. */
export function toApiError(err) {
  if (err?.isApiError) return err;
  const e = new Error();
  e.isApiError = true;
  if (err?.response) {
    const data = err.response.data || {};
    e.status = err.response.status;
    e.fieldErrors = data.fieldErrors;
    e.message = data.fieldErrors
      ? Object.values(data.fieldErrors).join(', ')
      : err.response.status === 401
        ? 'The server rejected the app\'s API key. Check EXPO_PUBLIC_API_KEY in mobile/.env matches the API_KEY on the server.'
        : data.message || `Something went wrong (${err.response.status}).`;
  } else {
    // No response at all: server down, wrong IP, different Wi-Fi, firewall, timeout...
    e.isNetwork = true;
    e.message =
      `Can't reach the Tech Wizard server at ${API_URL}.\n\n` +
      '• Is the backend running? (A free Render server sleeps when idle and needs up to a minute to wake: try again.)\n' +
      '• Is your phone on the same Wi-Fi as your computer?\n' +
      '• On a real phone, EXPO_PUBLIC_API_URL must be your computer\'s LAN IP, not localhost.';
  }
  return e;
}

async function call(promise) {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

const realApi = {
  health: () => call(axios.get(`${API_URL}/api/health`, { timeout: 4000 })),

  dashboard: () => call(http.get('/dashboard')),

  projects: () => call(http.get('/projects')),
  project: (id) => call(http.get(`/projects/${id}`)),
  createProject: (body) => call(http.post('/projects', body)),
  updateProject: (id, body) => call(http.put(`/projects/${id}`, body)),
  deleteProject: (id) => call(http.delete(`/projects/${id}`)),
  projectClaims: (id) => call(http.get(`/projects/${id}/claims`)),
  createClaim: (projectId) => call(http.post(`/projects/${projectId}/claims`)),

  claims: (statuses) => call(http.get('/claims', { params: statuses ? { status: statuses.join(',') } : undefined })),
  claim: (id) => call(http.get(`/claims/${id}`)),
  updateClaim: (id, body) => call(http.put(`/claims/${id}`, body)),
  deleteClaim: (id) => call(http.delete(`/claims/${id}`)),
  saveItems: (id, items) => call(http.put(`/claims/${id}/items`, items)),
  duplicateClaim: (id) => call(http.post(`/claims/${id}/duplicate`)),
  setStatus: (id, body) => call(http.patch(`/claims/${id}/status`, body)),
  addPayment: (id, body) => call(http.post(`/claims/${id}/payments`, body)),
  removePayment: (id, paymentId) => call(http.delete(`/claims/${id}/payments/${paymentId}`)),

  settings: () => call(http.get('/settings')),
  saveSettings: (body) => call(http.put('/settings', body)),
};

// Demo mode can be switched on while the app runs (the error screen offers "Use demo data").
let mockMode = USE_MOCK;
export const isMockMode = () => mockMode;
export function setMockMode(on) {
  mockMode = !!on;
  emitDataChanged();
}

// Wrap every write so that, once it succeeds, mounted screens refetch (see events.js).
const WRITE = new Set([
  'createProject', 'updateProject', 'deleteProject', 'createClaim', 'updateClaim', 'deleteClaim', 'saveItems',
  'duplicateClaim', 'setStatus', 'addPayment', 'removePayment', 'saveSettings',
]);

export const api = {};
Object.keys(realApi).forEach((name) => {
  api[name] = async (...args) => {
    const impl = mockMode ? mockApi : realApi;
    const result = await impl[name](...args);
    if (WRITE.has(name)) emitDataChanged();
    return result;
  };
});
