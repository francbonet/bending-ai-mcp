#!/usr/bin/env node

const API_BASE = (process.env.BENDING_API_BASE || "https://api.bending.ai").replace(/\/+$/, "");
const ENABLE_MUTATIONS = /^(1|true|yes)$/i.test(process.env.BENDING_ENABLE_MUTATIONS || "");
const USER_AGENT = process.env.BENDING_USER_AGENT || "bending-ai-mcp/0.1.0";

const endpointSpecs = [
  {
    name: "prices_currency_rate",
    method: "GET",
    path: "/v1/prices/currency-rate",
    description: "Current ADA price and fiat/crypto conversion rates.",
    inputSchema: objectSchema({}),
  },
  {
    name: "ada_price_chart",
    method: "GET",
    path: "/v1/prices/ada/chart",
    description: "ADA OHLC chart data. Typical period values include 1day.",
    inputSchema: objectSchema({
      period: stringProp("Chart period, for example 1day."),
      from: numberProp("Unix timestamp in seconds."),
      to: numberProp("Unix timestamp in seconds."),
    }, ["period", "from", "to"]),
    queryKeys: ["period", "from", "to"],
  },
  {
    name: "tokens_market",
    method: "GET",
    path: "/v1/tokens/market",
    description: "Token market table, including price, volume, liquidity, market cap and holders.",
    inputSchema: objectSchema(commonListProps({
      category: stringProp("Optional token category/filter observed in the UI."),
      query: stringProp("Optional search text/filter."),
    })),
    queryKeys: "*",
  },
  {
    name: "token",
    method: "GET",
    path: ({ tokenKey }) => `/v1/tokens/${encodeURIComponent(tokenKey)}`,
    pathTemplate: "/v1/tokens/{tokenKey}",
    description: "Token detail by BendingAI token key.",
    inputSchema: objectSchema({
      tokenKey: stringProp("BendingAI/Cardano token key."),
    }, ["tokenKey"]),
  },
  {
    name: "token_recent_trades",
    method: "GET",
    path: ({ tokenKey }) => `/v1/tokens/${encodeURIComponent(tokenKey)}/recent_trades`,
    pathTemplate: "/v1/tokens/{tokenKey}/recent_trades",
    description: "Recent trades for a token.",
    inputSchema: objectSchema(commonListProps({
      tokenKey: stringProp("BendingAI/Cardano token key."),
    }), ["tokenKey"]),
    queryKeys: "*",
  },
  {
    name: "token_holders",
    method: "GET",
    path: ({ tokenKey }) => `/v1/tokens/${encodeURIComponent(tokenKey)}/holders`,
    pathTemplate: "/v1/tokens/{tokenKey}/holders",
    description: "Holder distribution/list for a token.",
    inputSchema: objectSchema(commonListProps({
      tokenKey: stringProp("BendingAI/Cardano token key."),
    }), ["tokenKey"]),
    queryKeys: "*",
  },
  {
    name: "token_liquidity_providers",
    method: "GET",
    path: ({ tokenKey }) => `/v1/tokens/${encodeURIComponent(tokenKey)}/liquidity-providers`,
    pathTemplate: "/v1/tokens/{tokenKey}/liquidity-providers",
    description: "Liquidity providers for a token.",
    inputSchema: objectSchema(commonListProps({
      tokenKey: stringProp("BendingAI/Cardano token key."),
    }), ["tokenKey"]),
    queryKeys: "*",
  },
  {
    name: "token_charts",
    method: "POST",
    readOnlyPost: true,
    path: "/v1/tokens/charts",
    description: "Token/pair OHLC chart candles. This is a read-only POST endpoint in the frontend.",
    inputSchema: objectSchema({
      tokenIn: stringProp("Input token key. ADA/lovelace is usually an empty string."),
      tokenOut: stringProp("Output token key."),
      period: stringProp("Chart period, for example 1day."),
      from: numberProp("Unix timestamp in seconds."),
      to: numberProp("Unix timestamp in seconds."),
      currency: stringProp("Currency, for example ADA or USD."),
    }, ["tokenIn", "tokenOut", "period", "from", "to"]),
    bodyFromInput: true,
  },
  {
    name: "search",
    method: "GET",
    path: "/v1/search",
    description: "Global BendingAI search. The frontend calls it with query-like URL parameters.",
    inputSchema: objectSchema({
      query: stringProp("Search text, for example NIGHT or a wallet address."),
      q: stringProp("Alternative search text parameter, if the API expects q."),
    }),
    queryKeys: "*",
  },
  {
    name: "portfolio",
    method: "GET",
    path: ({ address }) => `/v1/portfolio/${encodeURIComponent(address)}`,
    pathTemplate: "/v1/portfolio/{address}",
    description: "Portfolio data for a stake/payment address.",
    inputSchema: addressSchema(),
  },
  {
    name: "portfolio_overview",
    method: "GET",
    path: ({ address }) => `/v1/portfolio/${encodeURIComponent(address)}/overview`,
    pathTemplate: "/v1/portfolio/{address}/overview",
    description: "Portfolio overview for a stake/payment address.",
    inputSchema: addressSchema(),
  },
  {
    name: "portfolio_positions",
    method: "GET",
    path: ({ address }) => `/v1/portfolio/${encodeURIComponent(address)}/positions`,
    pathTemplate: "/v1/portfolio/{address}/positions",
    description: "Portfolio positions, optionally filtered by protocol.",
    inputSchema: objectSchema({
      address: stringProp("Stake or payment address."),
      protocol: stringProp("Optional protocol filter."),
    }, ["address"]),
    queryKeys: ["protocol"],
  },
  {
    name: "portfolio_transactions",
    method: "GET",
    path: ({ address }) => `/v1/portfolio/${encodeURIComponent(address)}/transactions`,
    pathTemplate: "/v1/portfolio/{address}/transactions",
    description: "Portfolio transactions for a stake/payment address.",
    inputSchema: objectSchema(commonListProps({
      address: stringProp("Stake or payment address."),
    }), ["address"]),
    queryKeys: "*",
  },
  {
    name: "transaction",
    method: "GET",
    path: ({ txHash }) => `/v1/transactions/${encodeURIComponent(txHash)}`,
    pathTemplate: "/v1/transactions/{txHash}",
    description: "Transaction details by transaction hash.",
    inputSchema: objectSchema({
      txHash: stringProp("Cardano transaction hash."),
    }, ["txHash"]),
  },
  {
    name: "loans",
    method: "GET",
    path: "/v1/loans",
    description: "Loans table used by the lending UI.",
    inputSchema: objectSchema(commonListProps({
      tokenKey: stringProp("Optional token key."),
      protocols: stringProp("Optional comma-separated protocols, e.g. Indigo,Butane."),
      loan_value: stringProp("Optional loan value bucket from the UI."),
    })),
    queryKeys: "*",
  },
  {
    name: "loans_charts_stats",
    method: "GET",
    path: "/v1/loans/charts/stats",
    description: "Aggregated lending chart stats.",
    inputSchema: objectSchema(commonListProps({})),
    queryKeys: "*",
  },
  {
    name: "loans_charts_ltv",
    method: "GET",
    path: "/v1/loans/charts/ltv",
    description: "Loan-to-value scatter chart data.",
    inputSchema: objectSchema(commonListProps({})),
    queryKeys: "*",
  },
  {
    name: "lending_treemap",
    method: "GET",
    path: "/v1/lending/treemap",
    description: "Lending treemap. Typical treemap_type values: loan or collateral.",
    inputSchema: objectSchema(commonListProps({
      treemap_type: stringProp("Treemap type, for example loan or collateral."),
    })),
    queryKeys: "*",
  },
  {
    name: "lending_top_borrowers",
    method: "GET",
    path: "/v1/lending/top-borrowers",
    description: "Top borrower/hot wallet lending data.",
    inputSchema: objectSchema(commonListProps({})),
    queryKeys: "*",
  },
  {
    name: "defi_leaderboard",
    method: "GET",
    path: "/v1/defi/leaderboard",
    description: "DeFi portfolio leaderboard.",
    inputSchema: objectSchema(commonListProps({
      protocol: stringProp("Optional protocol filter."),
    })),
    queryKeys: "*",
  },
  {
    name: "defi_perpetuals_strikefinance",
    method: "GET",
    path: "/v1/defi/perpetuals/strikefinance",
    description: "Strike Finance perpetuals leaderboard/data.",
    inputSchema: objectSchema(commonListProps({
      type: stringProp("Position type, e.g. LONG or SHORT."),
      position_type: stringProp("UI mode, e.g. leaderboard_view."),
    })),
    queryKeys: "*",
  },
  {
    name: "staking",
    method: "GET",
    path: ({ protocol }) => `/v1/staking/${encodeURIComponent(protocol)}`,
    pathTemplate: "/v1/staking/{protocol}",
    description: "Staking/farming data for a protocol such as liqwid, minswap, strikefinance, vyfi, etc.",
    inputSchema: objectSchema(commonListProps({
      protocol: stringProp("Protocol path segment, e.g. liqwid, minswap, strikefinance."),
      type: stringProp("Optional UI type, e.g. farm."),
      aggregated: stringProp("Optional aggregated flag, usually 0 or 1."),
    }), ["protocol"]),
    queryKeys: "*",
  },
  {
    name: "follows_following",
    method: "GET",
    path: ({ wallet }) => `/v1/follows/${encodeURIComponent(wallet)}/following`,
    pathTemplate: "/v1/follows/{wallet}/following",
    description: "Wallets followed by a wallet.",
    inputSchema: objectSchema({ wallet: stringProp("Wallet/stake address.") }, ["wallet"]),
  },
  {
    name: "follows_followers",
    method: "GET",
    path: ({ wallet }) => `/v1/follows/${encodeURIComponent(wallet)}/followers`,
    pathTemplate: "/v1/follows/{wallet}/followers",
    description: "Followers for a wallet.",
    inputSchema: objectSchema({ wallet: stringProp("Wallet/stake address.") }, ["wallet"]),
  },
  {
    name: "follows_tvf",
    method: "GET",
    path: ({ wallet }) => `/v1/follows/${encodeURIComponent(wallet)}/tvf`,
    pathTemplate: "/v1/follows/{wallet}/tvf",
    description: "Total value followed metric for a wallet.",
    inputSchema: objectSchema({ wallet: stringProp("Wallet/stake address.") }, ["wallet"]),
  },
  {
    name: "follows_top_followers",
    method: "GET",
    path: "/v1/follows/top-followers",
    description: "Top followers table.",
    inputSchema: objectSchema(commonListProps({
      wallet: stringProp("Wallet filter."),
      owner: stringProp("Owner wallet."),
      type: stringProp("Optional type filter."),
    })),
    queryKeys: "*",
  },
  {
    name: "follows_top_followees",
    method: "GET",
    path: "/v1/follows/top-followees",
    description: "Top followees/following table.",
    inputSchema: objectSchema(commonListProps({
      wallet: stringProp("Wallet filter."),
      owner: stringProp("Owner wallet."),
      type: stringProp("Optional type filter."),
    })),
    queryKeys: "*",
  },
  {
    name: "follows_hot_wallets",
    method: "GET",
    path: "/v1/follows/hot-wallets",
    description: "Hot wallets by follower activity/value.",
    inputSchema: objectSchema(commonListProps({})),
    queryKeys: "*",
  },
  {
    name: "follow_wallet",
    method: "POST",
    mutating: true,
    path: "/v1/follows",
    description: "Follow a wallet. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      wallet: stringProp("Wallet performing the follow."),
      target: stringProp("Target wallet to follow."),
    }, ["user", "wallet", "target"]),
    bodyFromInput: true,
  },
  {
    name: "unfollow_wallet",
    method: "POST",
    mutating: true,
    path: "/v1/follows/unfollow",
    description: "Unfollow a wallet. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      wallet: stringProp("Wallet performing the unfollow."),
      target: stringProp("Target wallet to unfollow."),
    }, ["user", "wallet", "target"]),
    bodyFromInput: true,
  },
  {
    name: "bundles_list",
    method: "GET",
    path: ({ user }) => `/v1/bundles/${encodeURIComponent(user)}`,
    pathTemplate: "/v1/bundles/{user}",
    description: "List wallet bundles for a user.",
    inputSchema: objectSchema({ user: stringProp("User/stake address.") }, ["user"]),
  },
  {
    name: "bundles_create",
    method: "POST",
    mutating: true,
    path: "/v1/bundles",
    description: "Create a bundle. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      name: stringProp("Bundle name."),
    }, ["user", "name"]),
    bodyFromInput: true,
  },
  {
    name: "bundles_update",
    method: "PUT",
    mutating: true,
    path: "/v1/bundles",
    description: "Rename a bundle. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      oldName: stringProp("Current bundle name."),
      newName: stringProp("New bundle name."),
    }, ["user", "oldName", "newName"]),
    bodyFromInput: true,
  },
  {
    name: "bundles_delete",
    method: "DELETE",
    mutating: true,
    path: "/v1/bundles",
    description: "Delete a bundle. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      name: stringProp("Bundle name."),
    }, ["user", "name"]),
    bodyFromInput: true,
  },
  {
    name: "bundles_add_wallet",
    method: "POST",
    mutating: true,
    path: "/v1/bundles/wallets",
    description: "Add a wallet to a bundle. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      bundle: stringProp("Bundle name."),
      wallet: stringProp("Wallet/stake address to add."),
    }, ["user", "bundle", "wallet"]),
    bodyFromInput: true,
  },
  {
    name: "bundles_remove_wallet",
    method: "DELETE",
    mutating: true,
    path: "/v1/bundles/wallets",
    description: "Remove a wallet from a bundle. Disabled unless BENDING_ENABLE_MUTATIONS=true.",
    inputSchema: objectSchema({
      user: stringProp("User/stake address."),
      bundle: stringProp("Bundle name."),
      wallet: stringProp("Wallet/stake address to remove."),
    }, ["user", "bundle", "wallet"]),
    bodyFromInput: true,
  },
];

const tools = [
  {
    name: "bending_list_endpoints",
    description: "List the BendingAI API endpoints observed in the bending.ai frontend bundle.",
    inputSchema: objectSchema({}),
  },
  ...endpointSpecs.map((spec) => ({
    name: `bending_${spec.name}`,
    description: `${spec.method} ${displayPath(spec)} - ${spec.description}`,
    inputSchema: spec.inputSchema,
  })),
  {
    name: "bending_api_request",
    description: "Generic request helper for https://api.bending.ai/v1 paths. Useful for newly discovered endpoints.",
    inputSchema: objectSchema({
      method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "DELETE"],
        description: "HTTP method.",
      },
      path: stringProp("Path under /v1, for example /v1/tokens/market."),
      query: {
        type: "object",
        additionalProperties: true,
        description: "Optional query string parameters.",
      },
      body: {
        type: "object",
        additionalProperties: true,
        description: "Optional JSON body.",
      },
    }, ["method", "path"]),
  },
];

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: true,
  };
}

function commonListProps(extra) {
  return {
    sort_by: stringProp("Sort key used by the UI, e.g. MarketCap, Recent, Value, Loan."),
    order: {
      type: "string",
      enum: ["asc", "desc"],
      description: "Sort order.",
    },
    page: numberProp("Page number."),
    per_page: numberProp("Page size if supported."),
    ...extra,
  };
}

function addressSchema() {
  return objectSchema({ address: stringProp("Stake or payment address.") }, ["address"]);
}

function stringProp(description) {
  return { type: "string", description };
}

function numberProp(description) {
  return { type: "number", description };
}

function displayPath(specOrPath) {
  if (typeof specOrPath === "object" && specOrPath?.pathTemplate) return specOrPath.pathTemplate;
  const path = typeof specOrPath === "object" ? specOrPath.path : specOrPath;
  if (typeof path === "string") return path;
  return "{dynamic path}";
}

function buildUrl(path, input = {}, queryKeys) {
  const resolvedPath = typeof path === "function" ? path(input) : path;
  if (!resolvedPath.startsWith("/v1/")) {
    throw new Error(`Refusing to call non-v1 path: ${resolvedPath}`);
  }

  const url = new URL(`${API_BASE}${resolvedPath}`);
  const pathParamKeys = new Set(["address", "txHash", "tokenKey", "protocol", "wallet", "user"]);
  const query = {};

  if (queryKeys === "*") {
    for (const [key, value] of Object.entries(input)) {
      if (!pathParamKeys.has(key) && value !== undefined && value !== null && value !== "") {
        query[key] = value;
      }
    }
  } else if (Array.isArray(queryKeys)) {
    for (const key of queryKeys) {
      const value = input[key];
      if (value !== undefined && value !== null && value !== "") query[key] = value;
    }
  }

  appendQuery(url, query);
  return url;
}

function appendQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

async function callEndpoint(spec, input = {}) {
  if (spec.mutating && !ENABLE_MUTATIONS) {
    throw new Error(`Mutating endpoint ${spec.name} is disabled. Set BENDING_ENABLE_MUTATIONS=true to enable it.`);
  }

  const url = buildUrl(spec.path, input, spec.queryKeys);
  const options = {
    method: spec.method,
    headers: {
      "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
      "User-Agent": USER_AGENT,
    },
  };

  if (spec.bodyFromInput) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(input);
  }

  return httpJson(url, options);
}

async function genericRequest(input = {}) {
  const method = String(input.method || "GET").toUpperCase();
  const path = String(input.path || "");
  if (!path.startsWith("/v1/")) throw new Error("path must start with /v1/");
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) throw new Error(`Unsupported method: ${method}`);

  const readOnlyPost = method === "POST" && path === "/v1/tokens/charts";
  if (method !== "GET" && !readOnlyPost && !ENABLE_MUTATIONS) {
    throw new Error("Non-GET generic requests are disabled. Set BENDING_ENABLE_MUTATIONS=true, except for /v1/tokens/charts.");
  }

  const url = new URL(`${API_BASE}${path}`);
  appendQuery(url, input.query || {});
  const options = {
    method,
    headers: {
      "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
      "User-Agent": USER_AGENT,
    },
  };
  if (input.body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(input.body);
  }

  return httpJson(url, options);
}

async function httpJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: url.toString(),
    data,
  };
}

function toolResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function handleToolCall(name, args = {}) {
  if (name === "bending_list_endpoints") {
    return toolResult({
      apiBase: API_BASE,
      mutationsEnabled: ENABLE_MUTATIONS,
      endpoints: endpointSpecs.map((spec) => ({
        tool: `bending_${spec.name}`,
        method: spec.method,
        path: displayPath(spec),
        mutating: Boolean(spec.mutating),
        readOnlyPost: Boolean(spec.readOnlyPost),
        description: spec.description,
      })),
      genericTool: "bending_api_request",
    });
  }

  if (name === "bending_api_request") {
    return toolResult(await genericRequest(args));
  }

  const spec = endpointSpecs.find((item) => `bending_${item.name}` === name);
  if (!spec) throw new Error(`Unknown tool: ${name}`);
  return toolResult(await callEndpoint(spec, args));
}

const serverInfo = { name: "bending-ai-mcp", version: "0.1.0" };

async function handleMessage(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo,
      },
    };
  }

  if (method === "notifications/initialized") return null;

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }

  if (method === "tools/call") {
    const result = await handleToolCall(params?.name, params?.arguments || {});
    return { jsonrpc: "2.0", id, result };
  }

  if (method === "resources/list") {
    return { jsonrpc: "2.0", id, result: { resources: [] } };
  }

  if (method === "prompts/list") {
    return { jsonrpc: "2.0", id, result: { prompts: [] } };
  }

  throw new Error(`Unsupported method: ${method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    void handleLine(line);
  }
});

async function handleLine(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    sendError(null, `Invalid JSON: ${error.message}`);
    return;
  }

  try {
    const response = await handleMessage(message);
    if (response) send(response);
  } catch (error) {
    sendError(message.id ?? null, error.message || String(error));
  }
}

function sendError(id, message) {
  send({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message,
    },
  });
}

process.on("SIGINT", () => process.exit(0));
