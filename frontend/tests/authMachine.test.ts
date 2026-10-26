import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createActor } from 'xstate';
import { authMachine } from '../src/features/login/machine/authMachine';
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null } as Storage;
});
test('malformed persisted profiles cannot enter a verified session', () => {
  store.set('finsight_access_token', 'token'); store.set('finsight_user', '{broken');
  const actor = createActor(authMachine).start(); actor.send({ type: 'INIT_COMPLETE' });
  assert.equal(actor.getSnapshot().value, 'idle'); actor.stop();
});
test('login failure remains visible in the idle state', () => {
  const actor = createActor(authMachine).start(); actor.send({ type: 'INIT_COMPLETE' });
  actor.send({ type: 'SUBMIT_LOGIN', email: 'alice@example.com' });
  actor.send({ type: 'LOGIN_FAILURE', error: 'Incorrect password' });
  assert.equal(actor.getSnapshot().context.error, 'Incorrect password'); actor.stop();
});
test('back from MFA fully clears the pending identity', () => {
  const actor = createActor(authMachine).start(); actor.send({ type: 'INIT_COMPLETE' });
  actor.send({ type: 'SUBMIT_LOGIN', email: 'alice@example.com' });
  actor.send({ type: 'LOGIN_SUCCESS', mfaRequired: true, user: { id: '1', email: 'alice@example.com', fullName: 'Alice', role: 'Member', lastLogin: '' } });
  actor.send({ type: 'LOGOUT' });
  assert.equal(actor.getSnapshot().value, 'idle');
  assert.equal(actor.getSnapshot().context.user, null); actor.stop();
});
