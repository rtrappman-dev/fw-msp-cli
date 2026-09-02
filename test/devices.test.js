const test = require('node:test');
const assert = require('node:assert/strict');

test('devices fetch uses the API box selector', async () => {
  const originalLoad = require.cache[require.resolve('../cli/src/commands/devices')];
  delete require.cache[require.resolve('../cli/src/commands/devices')];

  const clientPath = require.resolve('../cli/src/api/client');
  const originalClient = require.cache[clientPath];
  delete require.cache[clientPath];

  try {
    const apiClient = require('../cli/src/api/client');
    const calls = [];
    const fakeClient = {
      get: async (path, config) => {
        calls.push({ path, config });
        return { data: [] };
      }
    };
    const originalGetClient = apiClient.getClient;
    const originalResolveBoxGid = apiClient.resolveBoxGid;
    apiClient.getClient = () => fakeClient;
    apiClient.resolveBoxGid = async () => 'box-a';

    delete require.cache[require.resolve('../cli/src/commands/devices')];
    const Devices = require('../cli/src/commands/devices');
    const originalLog = console.log;
    console.log = () => {};

    try {
      await Devices.list({ box: 'box-a' });
    } finally {
      console.log = originalLog;
      apiClient.getClient = originalGetClient;
      apiClient.resolveBoxGid = originalResolveBoxGid;
    }

    assert.deepEqual(calls, [
      { path: '/devices', config: { params: { box: 'box-a' } } },
    ]);
  } finally {
    if (originalClient) require.cache[clientPath] = originalClient;
    else delete require.cache[clientPath];
    if (originalLoad) require.cache[require.resolve('../cli/src/commands/devices')] = originalLoad;
    else delete require.cache[require.resolve('../cli/src/commands/devices')];
  }
});
