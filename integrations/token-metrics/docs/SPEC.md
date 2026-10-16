# Token Metrics Specification

Token Metrics supplies cryptocurrency market data, proprietary analytics, model grades,
research, and AI-assisted answers through its versioned HTTP API.

## Connection

Create an API key in the Token Metrics account dashboard. The integration sends the saved
key as the `x-api-key` header. All original tools retain `https://api.tokenmetrics.com/v2`;
`get_tm_grades`, `get_grade_history`, and `get_moonshot_tokens` use their documented
`https://api.tokenmetrics.com/v3` endpoints. Existing API-key
connections require no migration. No account, workspace, or project identifier is required.
Endpoint availability and historical coverage depend on the provider and the connected key.

## Tools

| Tool | Capability |
| --- | --- |
| `search_tokens` | Discover token IDs by name, symbol, categories, exchange, or contract |
| `get_top_tokens` | Read tokens ranked by market capitalization |
| `get_price_data` | Current price or daily/hourly OHLCV records |
| `get_grades` | Retained trader, investor, technology, and fundamental grade routes |
| `get_tm_grades` | Current TM Grade records, component grades, momentum, and signals |
| `get_grade_history` | Historical TM, technology, or fundamental grades |
| `get_trading_signals` | Daily or hourly signal records |
| `get_market_metrics` | Market-wide indicator and metric records |
| `get_sentiment` | Retained social sentiment route |
| `get_technical_analysis` | Resistance/support or correlation records |
| `get_quant_metrics` | Quantitative risk and performance records |
| `get_price_prediction` | Retained price prediction and scenario-analysis routes |
| `get_ai_reports` | Provider-generated token research records |
| `get_indices` | Discover indices, then retrieve holdings or historical performance using an index ID |
| `get_crypto_investors` | Crypto investor records and scores |
| `ask_ai_agent` | Crypto questions with prior user-message context |
| `get_moonshot_tokens` | Active or past Moonshot selections with documented sorting |

All tools are read-only. Call `search_tokens` to discover token identifiers and slugs.
Call `get_indices` with `queryType: "list"` to discover index IDs. The integration returns
one provider response per invocation; use the provider's pagination in `raw` to request
subsequent pages. An actual empty provider array remains empty. Missing or malformed data
raises an error instead of manufacturing a result. Original nullable record fields and the
complete response are preserved in `raw`.

Existing tools retain their original v2 endpoint paths and request parameter spelling.
The current official SDK targets v3 and cannot establish v2 date/filter acceptance.
Historical availability is not guaranteed back to a fixed inception date. Older
trader/investor, sentiment, and scenario routes remain for existing workflows; their current
availability was not verified. Use `get_tm_grades` and `get_grade_history` for the currently
documented v3 TM Grade families.

## API Scope

This package uses one Token Metrics product, preserving v2 compatibility and adding selected
current v3 endpoints. API versions do not represent distinct product categories. It has no webhook registrations, file downloads,
or token-refresh flow. The official HTTP endpoint inventory has no suitable current-user
or account-profile discovery endpoint. WebSocket streaming is outside this request/response
tool surface.

## Official References

- [API reference](https://developers.tokenmetrics.com/reference/tokens)
- [Official TypeScript SDK](https://github.com/token-metrics/tmai-api-sdk-typescript)
- [TM Grade routes](https://github.com/token-metrics/tmai-api-sdk-typescript/blob/master/src/endpoints/tm_grades.ts)
- [Technology Grade routes](https://github.com/token-metrics/tmai-api-sdk-typescript/blob/master/src/endpoints/technology_grades.ts)
- [Fundamental Grade routes](https://github.com/token-metrics/tmai-api-sdk-typescript/blob/master/src/endpoints/fundamental_grades.ts)
- [Moonshot selections](https://developers.tokenmetrics.com/v3/reference/moonshot-tokens)
- [Current TM Grade](https://developers.tokenmetrics.com/v3/reference/tm-grade)
- [TM Grade history](https://developers.tokenmetrics.com/v3/reference/tm-grade-history)
- [Technology Grade history](https://developers.tokenmetrics.com/v3/reference/technology-grade-history)
- [Fundamental Grade history](https://developers.tokenmetrics.com/v3/reference/fundamental-grade-history)
