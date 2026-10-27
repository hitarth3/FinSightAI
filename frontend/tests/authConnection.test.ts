import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/features/login/services/authService';
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => {} } });
const credentials = { email: 'connection-test@example.invalid', password: 'not-a-real-password' };

test('login preserves server-unreachable transport error', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const result = await authService.login(credentials);
  assert.equal(result.success, false);
  assert.match(result.error || '', /Unable to reach the server/);
});
test('login distinguishes a malformed server response from connection failure', async () => {
  globalThis.fetch = async () => new Response('<html>Service unavailable</html>', { status: 502 });
  const result = await authService.login(credentials);
  assert.match(result.error || '', /invalid response/);
});
test('login preserves rejected-credential message', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Incorrect email or password.' }, { status: 401 });
  const result = await authService.login(credentials);
  assert.equal(result.error, 'Incorrect email or password.');
});
