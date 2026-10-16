# <img src="logo.png" height="20"> Finage

Access financial market data through 19 read-only tools: US stock quotes, trades and snapshots; stock, forex and cryptocurrency historical bars; currency conversion; company profiles and financial statements; symbol discovery; market news, status and movers; sector performance; calendars; and technical indicators and trading signals.

Connect with a Finage API key. Data availability and market entitlements depend on the connected account's plan.

Use `list_symbols` to discover supported symbols and `get_stock_details` for company information. Historical requests accept a date range and explicit result limit. `search_market` currently supports the US market, matching the provider's documented scope. Economic calendar requests require both dates; earnings date filters apply to the returned calendar locally. Symbol news requires a stock or cryptocurrency symbol and supports up to 30 articles; the legacy page input supports page 1 only.

Existing summary fields retain their types. Additional `raw` responses preserve provider values, including nulls, nested objects, and numeric strings. Stock last-trade prices come from the trade endpoint. Stock signal confidence is presented as a percentage from 0 to 100, with the original fractional value preserved in `raw`.

See the [tool specification](docs/SPEC.md) and [official API documentation](https://finage.co.uk/docs/api).
