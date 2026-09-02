const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAlarmQuery } = require('../cli/src/commands/alarms');

test('scopes an alarm list query to the selected box', () => {
  assert.equal(
    buildAlarmQuery('box-a', undefined),
    'box.id:box-a'
  );
});

test('preserves additional alarm filters while enforcing the selected box', () => {
  assert.equal(
    buildAlarmQuery('box-a', 'status:active type:1'),
    'box.id:box-a status:active type:1'
  );
});

test('does not allow a caller-supplied box qualifier to replace the selected box', () => {
  assert.equal(
    buildAlarmQuery('box-a', 'box.id:box-b'),
    'box.id:box-a box.id:box-b'
  );
});
