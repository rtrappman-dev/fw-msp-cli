const test = require('node:test');
const assert = require('node:assert/strict');

const { buildFlowQuery } = require('../cli/src/commands/flows');

test('scopes flow queries to the selected box', () => {
  assert.equal(buildFlowQuery('box-a'), 'box.id:box-a');
});

test('preserves additional flow filters while enforcing box scope', () => {
  assert.equal(
    buildFlowQuery('box-a', 'direction:outbound ts:>123'),
    'box.id:box-a direction:outbound ts:>123'
  );
});

test('does not allow a caller query to replace the selected box', () => {
  assert.equal(
    buildFlowQuery('box-a', 'box.id:box-b'),
    'box.id:box-a box.id:box-b'
  );
});
