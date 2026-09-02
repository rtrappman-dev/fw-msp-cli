const { getClient, resolveBoxGid } = require('../api/client');

/**
 * Build the documented box-scoped rule query.
 */
function buildRuleQuery(gid, query) {
  const boxQuery = `box.id:${gid}`;
  return query ? `${boxQuery} ${query}` : boxQuery;
}

/**
 * Fetch all rules for a box.
 */
async function fetchAll(client, gid, query) {
  const { data } = await client.get('/rules', {
    params: { query: buildRuleQuery(gid, query) }
  });
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Resolve an API rule ID within the selected box.
 *
 * Rule IDs are globally addressed UUIDs in the MSP API. The box GID is
 * verified against the returned rule before the rule is used.
 */
function findRuleById(rules, id, gid) {
  const ruleId = String(id);
  return rules.find(r => r.id === ruleId && r.gid === gid);
}

/**
 * Client-side filtering applied after server fetch.
 */
function applyFilters(rules, options) {
  let results = rules;

  if (options.action) {
    const a = options.action.toLowerCase();
    results = results.filter(r => r.action?.toLowerCase() === a);
  }

  if (options.status) {
    const s = options.status.toLowerCase();
    results = results.filter(r => r.status?.toLowerCase() === s);
  }

  if (options.targetType) {
    const t = options.targetType.toLowerCase();
    results = results.filter(r => r.target?.type?.toLowerCase() === t);
  }

  if (options.scopeType) {
    const s = options.scopeType.toLowerCase();
    results = results.filter(r => r.scope?.type?.toLowerCase() === s);
  }

  if (options.hits) {
    results = results.filter(r => (r.hit?.count || 0) > 0);
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    results = results.filter(r =>
      r.target?.value?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.action?.toLowerCase().includes(q)
    );
  }

  return results;
}

const Rules = {
  list: async (options) => {
    const gid = await resolveBoxGid(options.box, options);
    const client = getClient(options);

    let apiQuery;
    if (options.params) {
      try {
        const parsedParams = JSON.parse(options.params);
        if (parsedParams.query !== undefined) {
          apiQuery = parsedParams.query;
        }
      } catch {
        console.error(JSON.stringify({ error: 'Invalid --params JSON' }));
        process.exit(1);
      }
    }

    try {
      const all = await fetchAll(client, gid, apiQuery);
      const filtered = applyFilters(all, options);
      console.log(JSON.stringify({ results: filtered, count: filtered.length }, null, 2));
    } catch (err) {
      console.error(JSON.stringify({ error: 'Fetch failed', details: err.response?.data || err.message }));
    }
  },

  get: async (id, options) => {
    const gid = await resolveBoxGid(options.box, options);
    const client = getClient(options);

    try {
      const all = await fetchAll(client, gid);
      const rule = findRuleById(all, id, gid);

      if (!rule) {
        console.error(JSON.stringify({
          error: `Rule "${id}" not found in selected box.`,
          hint: 'Use fw rules list to see rule IDs.'
        }));
        process.exit(1);
      }

      console.log(JSON.stringify(rule, null, 2));
    } catch (err) {
      console.error(JSON.stringify({ error: 'Fetch failed', details: err.response?.data || err.message }));
    }
  },

  create: async (options) => {
    const gid = await resolveBoxGid(options.box, options);
    const client = getClient(options);

    const body = { gid, action: options.action, direction: options.direction || 'bidirection' };

    // Target
    body.target = { type: options.targetType, value: options.targetValue };
    if (options.dnsOnly !== false) body.target.dnsOnly = true;

    // Scope (optional — omit for global/all devices)
    if (options.scopeType && options.scopeValue) {
      body.scope = { type: options.scopeType, value: options.scopeValue };
    }

    if (options.notes) body.notes = options.notes;

    try {
      const { data } = await client.post('/rules', body);
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(JSON.stringify({ error: 'Create failed', status: err.response?.status, details: err.response?.data || err.message }));
    }
  },

  pause: async (id, options) => {
    const gid = await resolveBoxGid(options.box, options);
    const client = getClient(options);

    try {
      const all = await fetchAll(client, gid);
      const rule = findRuleById(all, id, gid);

      if (!rule) {
        console.error(JSON.stringify({
          error: `Rule "${id}" not found in selected box.`,
          hint: 'Use fw rules list to see rule IDs.'
        }));
        process.exit(1);
      }

      const { data } = await client.post(`/rules/${encodeURIComponent(rule.id)}/pause`, {});
      console.log(JSON.stringify(data ?? { ok: true }, null, 2));
    } catch (err) {
      console.error(JSON.stringify({ error: 'Pause failed', status: err.response?.status, details: err.response?.data || err.message }));
    }
  },

  resume: async (id, options) => {
    const gid = await resolveBoxGid(options.box, options);
    const client = getClient(options);

    try {
      const all = await fetchAll(client, gid);
      const rule = findRuleById(all, id, gid);

      if (!rule) {
        console.error(JSON.stringify({
          error: `Rule "${id}" not found in selected box.`,
          hint: 'Use fw rules list to see rule IDs.'
        }));
        process.exit(1);
      }

      const { data } = await client.post(`/rules/${encodeURIComponent(rule.id)}/resume`, {});
      console.log(JSON.stringify(data ?? { ok: true }, null, 2));
    } catch (err) {
      console.error(JSON.stringify({ error: 'Resume failed', status: err.response?.status, details: err.response?.data || err.message }));
    }
  },
};

module.exports = Rules;
module.exports.buildRuleQuery = buildRuleQuery;
module.exports.findRuleById = findRuleById;
