import test from 'node:test';
import assert from 'node:assert/strict';
import { readWorkspaceRoute } from '../src/utils/workspaceRoute';

test('workspace links restore supported destinations', () => {
  for (const view of ['overview', 'expenses', 'cards', 'market', 'advisor']) assert.equal(readWorkspaceRoute(`#/${view}`), view);
  assert.equal(readWorkspaceRoute('#/unknown'), 'overview');
  assert.equal(readWorkspaceRoute(''), 'overview');
});
test('demo links cannot select authenticated modules', () => {
  assert.equal(readWorkspaceRoute('#/advisor', true), 'overview');
  assert.equal(readWorkspaceRoute('#/market', true), 'overview');
  assert.equal(readWorkspaceRoute('#/cards', true), 'cards');
});
