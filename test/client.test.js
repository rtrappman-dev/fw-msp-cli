const test = require('node:test');
const assert = require('node:assert/strict');

const CLIENT_PATH = require.resolve('../cli/src/api/client');

function withClient(fn) {
  delete require.cache[CLIENT_PATH];
  return fn(require(CLIENT_PATH));
}

function assertDomainRejected(input) {
  const previousToken = process.env.FIREWALLA_MSP_TOKEN;
  const previousExit = process.exit;
  const previousError = console.error;

  process.env.FIREWALLA_MSP_TOKEN = 'test-token';

  let exitCode;
  process.exit = (code) => {
    exitCode = code;
    throw new Error('process.exit');
  };
  console.error = () => {};

  try {
    withClient(({ getClient }) => {
      assert.throws(
        () => getClient({ domain: input }),
        /process\.exit/
      );
    });
    assert.equal(exitCode, 1);
  } finally {
    process.exit = previousExit;
    console.error = previousError;

    if (previousToken === undefined) {
      delete process.env.FIREWALLA_MSP_TOKEN;
    } else {
      process.env.FIREWALLA_MSP_TOKEN = previousToken;
    }
  }
}

test('accepts the Firewalla API hostname', () => {
  const previousToken = process.env.FIREWALLA_MSP_TOKEN;
  process.env.FIREWALLA_MSP_TOKEN = 'test-token';

  try {
    withClient(({ getClient }) => {
      const client = getClient({ domain: 'api.firewalla.net' });
      assert.equal(client.defaults.baseURL, 'https://api.firewalla.net/v2');
    });
  } finally {
    if (previousToken === undefined) {
      delete process.env.FIREWALLA_MSP_TOKEN;
    } else {
      process.env.FIREWALLA_MSP_TOKEN = previousToken;
    }
  }
});

test('accepts Firewalla subdomains with an optional scheme', () => {
  const previousToken = process.env.FIREWALLA_MSP_TOKEN;
  process.env.FIREWALLA_MSP_TOKEN = 'test-token';

  try {
    withClient(({ getClient }) => {
      const client = getClient({ domain: 'https://msp.example.firewalla.net' });
      assert.equal(client.defaults.baseURL, 'https://msp.example.firewalla.net/v2');
    });
  } finally {
    if (previousToken === undefined) {
      delete process.env.FIREWALLA_MSP_TOKEN;
    } else {
      process.env.FIREWALLA_MSP_TOKEN = previousToken;
    }
  }
});

test('rejects URL parser confusion that changes the destination hostname', () => {
  const attackerControlledDomains = [
    'attacker.example?.firewalla.net',
    'attacker.example#.firewalla.net',
    'attacker.example/.firewalla.net',
    'firewalla.net.attacker.example',
    'https://attacker.example?.firewalla.net',
  ];

  for (const input of attackerControlledDomains) {
    assertDomainRejected(input);
  }
});

test('rejects credentials, ports, paths, queries, and fragments', () => {
  const invalidDomains = [
    'user:pass@api.firewalla.net',
    'api.firewalla.net:443',
    'api.firewalla.net/v2',
    'api.firewalla.net?redirect=attacker.example',
    'api.firewalla.net#attacker.example',
  ];

  for (const input of invalidDomains) {
    assertDomainRejected(input);
  }
});
