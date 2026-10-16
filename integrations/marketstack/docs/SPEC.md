# Marketstack specification

Marketstack provides a single market-data API. This integration uses HTTPS and API-key authentication through the `access_key` query parameter. Obtain a key from the Marketstack dashboard. There is no OAuth refresh flow, resource-scoping configuration, or documented current-account identity endpoint.

## Current capabilities

- End-of-day data: `/v2/eod` and `/v2/eod/latest`, preserving raw and adjusted OHLCV values.
- Intraday data: `/v2/intraday` and `/v2/intraday/latest`, including interval, sort, and optional after-hours filtering. Some IEX quote fields can be null without entitlement; the provider's complete payload remains in `raw`.
- Tickers and exchanges: `/v2/tickerslist`, `/v2/tickers/{symbol}`, `/v2/tickerinfo`, and `/v2/exchanges`.
- Corporate actions: `/v2/splits` and `/v2/dividends`.
- Commodity prices: explicit `commodityName` selects `/v2/commodities`; dates or `frequency` select `/v2/commoditieshistory`. Results use provider commodity names, not invented ticker identifiers. Sorting and pagination are local for the named-commodity branch.
- Indices: `/v2/indexlist` plus `/v2/indexinfo`. The existing list tool retrieves one page and enriches every benchmark on it before applying its name/country filter. `get_market_index` queries a known benchmark directly. List pagination describes the original provider list page, not the enriched or filtered results.
- Government bonds: `/v2/bondlist` plus `/v2/bond`, retrieving each matching country on one list page. List pagination describes the original provider country-list page.
- ETFs: `/v2/etflist` and `/v2/etfholdings`. Each request counts as 20 provider API calls. Holdings preserve the nested investment-security data in `raw`; individual ticker/date aliases are omitted when absent.
- Ratings: `get_company_ratings` makes exactly one `/v2/companyratings` request for one ticker, with optional date and buy/sell/hold filters. The provider limits this endpoint to one API call per minute; callers must space separate invocations accordingly. Company metadata, consensus, and individual rating records retain their provider shape, with the complete response in `raw`. The original multi-symbol `get_analyst_ratings` tool is formally deprecated in favor of this genuine single-ticker replacement; its original handler, schemas, `/v2/analysts` request, parameter omission, and request defaults are preserved. This integration-level deprecation does not assert provider retirement of `/v2/analysts`.
- SEC: `/v2/cik_code`, `/v2/submissions`, `/v2/company_facts`, and `/v2/frames/accounts_payable/{unit}`. Numeric CIK inputs are zero-padded to the provider's ten-digit representation. Company-name lookup retains the first-match behavior; use an exact CIK for ambiguous names. Filing-date/report-date/accession filters use provider parameters; form/limit/offset filters apply locally to the returned recent-filing arrays. Full submission metadata and references to older filing files remain in `raw`. Company facts are flattened by actual taxonomy/concept/unit; taxonomy/tag filters apply locally to the returned facts.
- Reference data: `/v2/currencies` and `/v2/timezones`.
- `download_catalog` delivers the provider-published supported-ticker CSV, end-of-day ticker workbook, or commodity workbook as a downloadable file using the exact documented public URL.

## Compatibility and missing provider fields

All 13 original tool keys and original input types, requiredness, enums, defaults, and constraints remain present. Output scalar types are preserved. Fields absent or explicitly null in current provider payloads are omitted through narrow optional aliases, with complete payloads retained in `raw`. Pagination objects remain present; absent provider pagination values are omitted rather than synthesized.

Three legacy requests remain unverified because the current reference does not establish their supported behavior or retirement:

- `get_commodities` without `commodityName` retains the original `/v2/commodities` request with `symbols`, `date_from`, `date_to`, `sort`, `limit`, and `offset`. Empty optional string parameters remain omitted. Date and local-pagination validation apply only when `commodityName` explicitly selects the current documented API; do not combine it with `symbols`.
- Deprecated `get_analyst_ratings` retains the original multi-symbol `/v2/analysts` request and unchanged response mapping. Use `get_company_ratings` for the current documented single-ticker operation.
- The `frames` mode in `get_sec_financial_data` retains `/v2/sec/frames` with its original generalized taxonomy/tag/unit/period request. `get_accounts_payable_frames` provides the separate documented accounts-payable capability. No claim is made that generalized frames are supported or retired.

The current documentation provides a v2 OpenAPI specification. The official v1 reference explicitly states that v1 endpoints are deprecated for use after June 30, 2025; this integration uses v2. That notice does not establish the status of the three uncertain v2 requests described above. The integration has no webhook/event subscription API.

## Sources

- [Current official reference](https://docs.apilayer.com/marketstack/docs/api-documentation)
- [Official v2 OpenAPI specification](https://api.swaggerhub.com/apis/apilayer-863/MarketstackAPIv2/2.0.0/swagger.json)
- [Official v1 deprecation notice](https://docs.apilayer.com/marketstack/docs/api-endpoints-v1)
- [Getting started](https://docs.apilayer.com/marketstack/docs/getting-started)
- [Plans and entitlement](https://marketstack.com/pricing/)
- [EDGAR overview](https://marketstack.com/edgar)

The official OpenAPI specification is the source for exact paths, query parameters, response nesting, rate limits, and catalog URLs. No authenticated provider requests were made during this refresh.
