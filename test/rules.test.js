const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRuleQuery, findRuleById } = require('../cli/src/commands/rules');

test('scopes rule collection queries to the selected box', () => {
  assert.equal(buildRuleQuery('box-a'), 'box.id:box-a');
  assert.equal(
    buildRuleQuery('box-a', 'status:active'),
    'box.id:box-a status:active'
  );
});

test('does not allow a caller query to replace the selected box scope', () => {
  assert.equal(
    buildRuleQuery('box-a', 'box.id:box-b'),
    'box.id:box-a box.id:box-b'
  );
});

test('resolves only the exact API rule ID within the selected box', () => {
  const rules = [
    { id: 'rule-a', gid: 'box-a' },
    { id: 'rule-b', gid: 'box-b' },
  ];

  assert.deepEqual(findRuleById(rules, 'rule-a', 'box-a'), rules[0]);
  assert.equal(findRuleById(rules, 'rule-b', 'box-a'), undefined);
});

test('does not treat numeric ID suffixes or composite IDs as API rule IDs', () => {
  const rules = [
    { id: 'rule-a', gid: 'box-a' },
    { id: 'box-b:42', gid: 'box-b' },
  ];

  assert.equal(findRuleById(rules, '42', 'box-a'), undefined);
  assert.equal(findRuleById(rules, 'box-b:42', 'box-a'), undefined);
});
