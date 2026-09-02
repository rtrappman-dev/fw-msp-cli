const axios = require('axios');

const getCleanDomain = (domain) => {
  const targetDomain = domain || process.env.FIREWALLA_MSP_ID || 'api.firewalla.net';
  const invalidDomain = () => {
    console.error(JSON.stringify({
      error: "Invalid domain",
      hint: "For security, only *.firewalla.net domains are allowed"
    }));
    process.exit(1);
  };

  // Accept only a hostname, optionally prefixed by http(s) and/or followed
  // by a single trailing slash. Everything else is rejected before URL
  // parsing so an explicit default port such as :443 cannot be normalized away.
  if (!/^(?:https?:\/\/)?[A-Za-z0-9.-]+\/?$/i.test(targetDomain)) {
    invalidDomain();
  }

  const targetUrl = /^https?:\/\//i.test(targetDomain)
    ? targetDomain
    : `https://${targetDomain}`;

  let url;
  try {
    url = new URL(targetUrl);
  } catch (_) {
    invalidDomain();
  }

  const hostname = url.hostname.toLowerCase();

  // Security: validate the parsed hostname, not the raw input, to prevent
  // URL parser confusion from redirecting the MSP token to an attacker host.
  if (
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (hostname !== 'api.firewalla.net' && !hostname.endsWith('.firewalla.net'))
  ) {
    invalidDomain();
  }

  return hostname;
};

const getBaseUrl = (domain) => `https://${getCleanDomain(domain)}/v2`;

const getClient = (options = {}) => {
  const token = process.env.FIREWALLA_MSP_TOKEN;
  if (!token) {
    console.error(JSON.stringify({
      error: "Auth missing.",
      hint: "Run: export FIREWALLA_MSP_TOKEN='your_msp_api_token_here' or add to .env"
    }));
    process.exit(1);
  }

  const instance = axios.create({
    baseURL: getBaseUrl(options.domain),
    headers: { 'Authorization': `Token ${token}` }
  });

  if (options.debug) {
    instance.interceptors.request.use(config => {
      console.error(`[DEBUG] Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    });
  }

  return instance;
};

const resolveBoxGid = async (input, options) => {
  const client = getClient(options);
  const { data: boxes } = await client.get('/boxes');

  if (!input) {
    const envGid = process.env.FIREWALLA_BOX_GID;
    if (envGid) return envGid;
    if (boxes.length === 1) return boxes[0].gid;

    console.error(JSON.stringify({ error: "Ambiguous request. Specify --box <name|gid>." }));
    process.exit(1);
  }

  const matchByGid = boxes.find(b => b.gid === input);
  if (matchByGid) return matchByGid.gid;

  const matchByName = boxes.find(b => b.name.toLowerCase() === input.toLowerCase());
  if (matchByName) return matchByName.gid;

  console.error(JSON.stringify({ error: `Box "${input}" not found.` }));
  process.exit(1);
};

const getClientV1 = (options = {}) => {
  const token = process.env.FIREWALLA_MSP_TOKEN;
  if (!token) {
    console.error(JSON.stringify({
      error: "Auth missing.",
      hint: "Run: export FIREWALLA_MSP_TOKEN='your_msp_api_token_here' or add to .env"
    }));
    process.exit(1);
  }

  return axios.create({
    baseURL: `https://${getCleanDomain(options.domain)}`,
    headers: { 'Authorization': `Token ${token}` }
  });
};

module.exports = { getClient, getClientV1, resolveBoxGid };
