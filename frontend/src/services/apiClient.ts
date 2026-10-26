/** Shared transport: bounded requests, one refresh per session, no global fetch patch. */
export const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}

let sessionVersion = 0;
let refreshFlight: { token: string | null; version: number; promise: Promise<boolean> } | null = null;
export const getSessionVersion = () => sessionVersion;

export function clearSession() {
  sessionVersion += 1;
  for (const key of ['finsight_access_token', 'finsight_refresh_token', 'finsight_user']) {
    localStorage.removeItem(key);
  }
}

export async function publicFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, options.body instanceof FormData ? 90_000 : 30_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) throw new ApiError('The request timed out or was cancelled. Please try again.', 0);
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function rotateSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem('finsight_refresh_token');
  if (!refreshToken) return false;
  const response = await publicFetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new ApiError('Session renewal is temporarily unavailable. Please try again.', response.status);
  const { data } = await response.json();
  // A delayed refresh must never restore a session after logout or overwrite a new login.
  if (localStorage.getItem('finsight_refresh_token') !== refreshToken) return false;
  if (!data?.access_token || !data?.refresh_token) throw new ApiError('Invalid session response. Please sign in again.', 502);
  localStorage.setItem('finsight_access_token', data.access_token);
  localStorage.setItem('finsight_refresh_token', data.refresh_token);
  return true;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Never attach credentials to arbitrary external URLs.
  const target = new URL(url, API_BASE);
  if (target.origin !== new URL(API_BASE).origin || !target.pathname.startsWith('/api/')) {
    throw new ApiError('Invalid API destination.', 0);
  }
  const version = sessionVersion;
  const originalToken = localStorage.getItem('finsight_access_token');
  const originalRefresh = localStorage.getItem('finsight_refresh_token');
  const request = () => {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem('finsight_access_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else headers.delete('Authorization');
    return publicFetch(target.href, { ...options, headers });
  };
  let response = await request();
  if (response.status === 401 && originalToken && version === sessionVersion) {
    // A concurrent request may already have renewed the same session.
    const currentToken = localStorage.getItem('finsight_access_token');
    if (currentToken && currentToken !== originalToken) {
      response = await request();
    } else if (localStorage.getItem('finsight_refresh_token') === originalRefresh) {
      if (!refreshFlight || refreshFlight.token !== originalRefresh || refreshFlight.version !== version) {
        const flight = { token: originalRefresh, version, promise: rotateSession() };
        refreshFlight = flight;
        void flight.promise.finally(() => { if (refreshFlight === flight) refreshFlight = null; }).catch(() => {});
      }
      if (await refreshFlight.promise && version === sessionVersion) response = await request();
    }
    if (response.status === 401 && version === sessionVersion) {
      clearSession();
      window.dispatchEvent(new CustomEvent('unauthorized-api-call'));
    }
  }
  if (version !== sessionVersion && response.status !== 401) throw new ApiError('Your session changed. Please try again.', 401);
  if (!response.ok) {
    const body = await response.clone().json().catch(() => null);
    const message = body?.message || body?.detail;
    throw new ApiError(typeof message === 'string' ? message : `Request failed (${response.status}). Please try again.`, response.status);
  }
  return response;
}
