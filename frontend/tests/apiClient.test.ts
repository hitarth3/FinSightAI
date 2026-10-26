import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, publicFetch, clearSession, API_BASE } from '../src/services/apiClient';

const originalFetch = globalThis.fetch;
let store: Map<string, string>;
let unauthorized: number;
beforeEach(() => {
  store = new Map([['finsight_access_token', 'old-access'], ['finsight_refresh_token', 'old-refresh'], ['finsight_user', '{}']]);
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, String(value)); }, removeItem: key => { store.delete(key); } } as Storage;
  unauthorized = 0;
  globalThis.window = { dispatchEvent: () => { unauthorized++; return true; } } as unknown as Window & typeof globalThis;
});
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('concurrent expired requests share one refresh and store both rotated tokens', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/refresh')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return json({ data: { access_token: 'new-access', refresh_token: 'new-refresh' } });
    }
    return new Headers(init?.headers).get('Authorization') === 'Bearer new-access' ? json({ data: 'ok' }) : json({}, 401);
  };
  const responses = await Promise.all([apiFetch(`${API_BASE}/api/expenses`), apiFetch(`${API_BASE}/api/stocks`)]);
  assert.ok(responses.every(response => response.ok));
  assert.equal(refreshes, 1);
  assert.equal(store.get('finsight_refresh_token'), 'new-refresh');
  assert.equal(unauthorized, 0);
});

test('rejected refresh clears the session and signals sign-in', async () => {
  globalThis.fetch = async () => json({ message: 'Expired session' }, 401);
  await assert.rejects(apiFetch(`${API_BASE}/api/expenses`), /Expired session/);
  assert.equal(store.size, 0);
  assert.equal(unauthorized, 1);
});

test('temporary refresh outage retains credentials for a later retry', async () => {
  globalThis.fetch = async url => json({}, String(url).endsWith('/refresh') ? 503 : 401);
  await assert.rejects(apiFetch(`${API_BASE}/api/expenses`), /temporarily unavailable/);
  assert.equal(store.get('finsight_refresh_token'), 'old-refresh');
  assert.equal(unauthorized, 0);
});

test('logout during renewal cannot resurrect tokens', async () => {
  globalThis.fetch = async url => {
    if (String(url).endsWith('/refresh')) {
      clearSession();
      return json({ data: { access_token: 'late-access', refresh_token: 'late-refresh' } });
    }
    return json({}, 401);
  };
  await assert.rejects(apiFetch(`${API_BASE}/api/expenses`));
  assert.equal(store.size, 0);
});

test('a delayed old-account response never retries against a newly signed-in account', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    clearSession();
    store.set('finsight_access_token', 'other-account');
    store.set('finsight_refresh_token', 'other-refresh');
    return json({}, 401);
  };
  await assert.rejects(apiFetch(`${API_BASE}/api/expenses`));
  assert.equal(calls, 1);
  assert.equal(store.get('finsight_access_token'), 'other-account');
  assert.equal(unauthorized, 0);
});

test('does not send credentials to a foreign origin', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return json({}); };
  await assert.rejects(apiFetch('https://example.com/api/expenses'), /Invalid API destination/);
  assert.equal(called, false);
});

test('server validation messages survive the transport layer', async () => {
  globalThis.fetch = async () => json({ detail: 'File is too large.' }, 413);
  await assert.rejects(apiFetch(`${API_BASE}/api/expenses/upload`), /File is too large/);
});

test('aborted requests settle with an actionable error', async () => {
  globalThis.fetch = async (_url, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return json({});
  };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(publicFetch(`${API_BASE}/api/health/live`, { signal: controller.signal }), /cancelled/);
});
