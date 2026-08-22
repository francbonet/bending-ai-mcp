# BendingAI MCP Server

Local stdio MCP server for the public API used by [bending.ai](https://bending.ai/).

The frontend bundle exposes `VITE_API_URL=https://api.bending.ai` and a `/v1` API map. There is no public OpenAPI document at `/v1/openapi.json` or `/v1/docs`, so this server is based on the endpoints observed in the production frontend.

## Run

```bash
node server.js
```

Example MCP config:

```json
{
  "mcpServers": {
    "bending-ai": {
      "command": "node",
      "args": ["/absolute/path/to/bending-ai-mcp/server.js"],
      "env": {
        "BENDING_API_BASE": "https://api.bending.ai"
      }
    }
  }
}
```

Mutation endpoints such as follow/unfollow and bundle edits are exposed but disabled by default. Enable them explicitly:

```json
{
  "env": {
    "BENDING_ENABLE_MUTATIONS": "true"
  }
}
```

## Useful Tools

- `bending_tokens_market`: token market table.
- `bending_token`: token detail.
- `bending_token_charts`: OHLC candles via the frontend's read-only POST endpoint.
- `bending_loans`, `bending_loans_charts_stats`, `bending_loans_charts_ltv`: lending data.
- `bending_lending_treemap`, `bending_lending_top_borrowers`: lending visual/dashboard data.
- `bending_defi_leaderboard`: DeFi leaderboard.
- `bending_staking`: protocol staking/farming tables.
- `bending_portfolio`, `bending_portfolio_overview`, `bending_portfolio_positions`, `bending_portfolio_transactions`: wallet/portfolio endpoints.
- `bending_search`: global search.
- `bending_prices_currency_rate`, `bending_ada_price_chart`: ADA prices.
- `bending_follows_*`: following/follower/hot wallet endpoints.
- `bending_bundles_*`: wallet bundle endpoints.
- `bending_api_request`: generic `/v1` fallback for newly discovered endpoints.

## Endpoints Observed

| Tool | Method | API path |
| --- | --- | --- |
| `bending_prices_currency_rate` | GET | `/v1/prices/currency-rate` |
| `bending_ada_price_chart` | GET | `/v1/prices/ada/chart` |
| `bending_tokens_market` | GET | `/v1/tokens/market` |
| `bending_token` | GET | `/v1/tokens/{tokenKey}` |
| `bending_token_recent_trades` | GET | `/v1/tokens/{tokenKey}/recent_trades` |
| `bending_token_holders` | GET | `/v1/tokens/{tokenKey}/holders` |
| `bending_token_liquidity_providers` | GET | `/v1/tokens/{tokenKey}/liquidity-providers` |
| `bending_token_charts` | POST | `/v1/tokens/charts` |
| `bending_search` | GET | `/v1/search` |
| `bending_portfolio` | GET | `/v1/portfolio/{address}` |
| `bending_portfolio_overview` | GET | `/v1/portfolio/{address}/overview` |
| `bending_portfolio_positions` | GET | `/v1/portfolio/{address}/positions` |
| `bending_portfolio_transactions` | GET | `/v1/portfolio/{address}/transactions` |
| `bending_transaction` | GET | `/v1/transactions/{txHash}` |
| `bending_loans` | GET | `/v1/loans` |
| `bending_loans_charts_stats` | GET | `/v1/loans/charts/stats` |
| `bending_loans_charts_ltv` | GET | `/v1/loans/charts/ltv` |
| `bending_lending_treemap` | GET | `/v1/lending/treemap` |
| `bending_lending_top_borrowers` | GET | `/v1/lending/top-borrowers` |
| `bending_defi_leaderboard` | GET | `/v1/defi/leaderboard` |
| `bending_defi_perpetuals_strikefinance` | GET | `/v1/defi/perpetuals/strikefinance` |
| `bending_staking` | GET | `/v1/staking/{protocol}` |
| `bending_follows_following` | GET | `/v1/follows/{wallet}/following` |
| `bending_follows_followers` | GET | `/v1/follows/{wallet}/followers` |
| `bending_follows_tvf` | GET | `/v1/follows/{wallet}/tvf` |
| `bending_follows_top_followers` | GET | `/v1/follows/top-followers` |
| `bending_follows_top_followees` | GET | `/v1/follows/top-followees` |
| `bending_follows_hot_wallets` | GET | `/v1/follows/hot-wallets` |
| `bending_follow_wallet` | POST | `/v1/follows` |
| `bending_unfollow_wallet` | POST | `/v1/follows/unfollow` |
| `bending_bundles_list` | GET | `/v1/bundles/{user}` |
| `bending_bundles_create` | POST | `/v1/bundles` |
| `bending_bundles_update` | PUT | `/v1/bundles` |
| `bending_bundles_delete` | DELETE | `/v1/bundles` |
| `bending_bundles_add_wallet` | POST | `/v1/bundles/wallets` |
| `bending_bundles_remove_wallet` | DELETE | `/v1/bundles/wallets` |

## Notes

The swap UI also contains DexHunter endpoints such as `/swap/estimate`, `/swap/build`, `/swap/sign`, and `/swap/ordersByPair`, but those point at DexHunter infrastructure rather than `https://api.bending.ai/v1`. They are not included in this BendingAI `/v1` MCP server.
