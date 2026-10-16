# Currency Scoop API specification

The integration retains the `currencyscoop` identifier and connects to the existing CurrencyBeacon v1 host. The public CurrencyScoop homepage redirects to CurrencyBeacon. This refresh does not migrate saved credentials or connection settings.

## Connection

- API base: `https://api.currencybeacon.com/v1`.
- Authentication: the saved API key is sent as a Bearer token.
- Configuration: `baseCurrency` remains a string with a USD default.

## Tools

| Tool | Request | Behavior |
| --- | --- | --- |
| `get_exchange_rates` | `GET /latest`; optional base and target currencies | Returns provider date, base, and rate map. |
| `get_historical_rates` | `GET /historical`; date plus optional base and targets | Retrieves one historical date. |
| `convert_currency` | `GET /convert`; source, target, amount, optional date | Returns the provider's amount, converted value, date, and Unix timestamp in seconds. |
| `get_time_series` | `GET /timeseries`; start/end dates plus optional base and targets | Returns daily rate maps and provider-returned range metadata. |
| `list_currencies` | `GET /currencies` | Returns currency identifiers and formatting metadata. |

Every tool includes an optional complete `raw` response envelope. The normalized output fields remain unchanged. Required fields are checked before use; absent or incompatible provider data raises an error without a fabricated value. Rates are quoted-currency units per one base-currency unit. Returned dates are provider data, not timestamps synthesized from the request or current clock.

## Limits

Subscription access and date-range restrictions remain provider controlled. There are no paginated lists, file operations, or webhook registrations in this surface. The provider documents an account-usage tool on its remote MCP service, but does not publish a corresponding REST contract; account usage is not exposed here.

## Official references

- [REST API, authentication, endpoint parameters, response examples, and errors](https://www.currencybeacon.com/api-documentation)
- [Time-series filtering example](https://www.currencybeacon.com/code-samples)
- [Provider MCP tools](https://www.currencybeacon.com/mcp)
- [CurrencyScoop homepage redirect](https://currencyscoop.com/)
