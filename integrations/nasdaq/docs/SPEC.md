# Nasdaq

## API families and authentication

- **Nasdaq Data Link** uses `https://data.nasdaq.com/api/v3` and the `api_key` query parameter. It covers tables, time-series datasets, catalog search, database metadata and ZIP exports.
- **Nasdaq Cloud REST** uses the API base URL supplied by Nasdaq. Authenticate by posting a JSON object containing `client_id` and `client_secret` to the supplied token endpoint, normally `/v1/auth/token`. Persist the returned bearer token and `expires_in` expiry; renew with the same client credentials. No refresh token or user OAuth redirect is involved.

The API families have separate tool categories and authentication methods. Global configuration is empty. Credentials and API URLs belong to the connection. Neither documented API provides a current-user/profile endpoint suitable for an identity tool.

## Data Link tools

| Tool | Provider operation |
| --- | --- |
| `query_table` | `GET /datatables/{PUBLISHER}/{TABLE}.json`, column filters, `qopts.columns`, `qopts.per_page`, `qopts.cursor_id` |
| `get_table_metadata` | `GET /datatables/{PUBLISHER}/{TABLE}/metadata.json` |
| `get_time_series` | `GET /datasets/{database}/{dataset}/data.json`, date, order, collapse, transform, limit and column selection |
| `get_dataset_info` | `GET /datasets/{database}/{dataset}.json`, limited to the ten latest rows |
| `search_datasets` | `GET /datasets.json`, query, database filter and page pagination |
| `list_databases` | `GET /databases.json`, page pagination |
| `get_database_info` | `GET /databases/{database}.json` |
| `export_table` | `GET /datatables/{PUBLISHER}/{TABLE}.json?qopts.export=true`; optional row filters; provider ZIP URL when status is `fresh` |
| `export_database` | Authenticated `GET /databases/{database}/data?download_type=complete|partial` for supported time-series databases |

Column filters cannot override credentials or dedicated query options. Numeric pagination and row/column inputs are validated as whole numbers at invocation time while preserving the public numeric schemas. Dates use `YYYY-MM-DD`; start must not follow end. Missing or malformed required response fields are errors. Table export timestamps and links may be omitted by the provider; they are omitted from summaries and retained in original response metadata.

## Cloud REST tools

| Tool | Provider operation |
| --- | --- |
| `get_last_sale` | `GET /v1/{source}/{offset}/equities/{lastsale|lasttrade|lastquote}/{symbols}` |
| `get_snapshot` | `GET /v1/{source}/{offset}/equities/snapshot/{symbols}` and optional `/equities/trends` |
| `get_bars` | `GET /v2/{source}/{offset}/equities/bars/{symbols}/{precision}/false/{date-range}` |
| `get_options_chain` | `GET /v1/nasdaq/{offset}/options/chain/{symbol}`; optional per-contract Greeks calls |
| `list_symbols` | `GET /v1/reference/symbols` |
| `get_symbol` | `GET /v1/reference/symbol/{symbol}` |
| `list_indexes` | `GET /v1/reference/indexes` |
| `get_index_data` | `GET /v1/nasdaq/{offset}/indexes/{value|snapshot}/{instruments}` |
| `get_option_greeks` | `GET /v1/nasdaq/realtime/greeksandvolsus/{identifier}` |

Source defaults to Nasdaq and offset defaults to realtime. Bars default to daily bars over one month; only unadjusted prices are currently documented. Supported date-range/precision pairs follow the provider's matrix. Existing bar output retains the original symbol-keyed response object inside its record array. Quotes, snapshots, chains and Greeks retain provider fields. Options Greeks use exact contract identifiers, including internal spaces, rather than underlying ticker symbols. `includeGreeks` requests each returned contract in batches of four and can take longer for large chains. Delayed Greeks are currently unavailable.

## Downloads and errors

Table ZIP exports use the provider's ready file URL. Renewal reissues the same documented export with its table and filters; a pending export is an error during renewal. If the URL exposes a signed expiry, renew one minute before it; otherwise renew at download time. This is a renewal policy and does not assume a provider URL lifetime. Database ZIP downloads use a stable authenticated endpoint.

HTTP errors preserve provider status, nested `quandl_error` code/message, and supported response-body details. Timeouts, missing credentials, invalid parameter combinations and malformed required responses produce user-facing service errors.

## Sources

- [Nasdaq Cloud REST API](https://github.com/Nasdaq/NasdaqCloudDataService-REST-API)
- [Cloud authentication](https://github.com/Nasdaq/NasdaqCloudDataService-REST-API/blob/main/restapi/authenticate.md)
- [Nasdaq Data Link Python SDK detailed guide](https://github.com/Nasdaq/data-link-python/blob/main/FOR_DEVELOPERS.md)
- [Data Link table model and export flow](https://github.com/Nasdaq/data-link-python/blob/main/nasdaqdatalink/model/datatable.py)
- [Data Link database model](https://github.com/Nasdaq/data-link-python/blob/main/nasdaqdatalink/model/database.py)

Streaming/Kafka, administrative operations, news, ETPs, and webhook delivery are not implemented. Product subscriptions govern data availability. No live market-data or authenticated endpoint was queried during this refresh.
