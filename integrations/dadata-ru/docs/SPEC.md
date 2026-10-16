# DaData.ru operation reference

## Authentication and API products

The API key is sent as `Authorization: Token <API_KEY>`. Standardization, Company by Email, and account requests also send `X-Secret: <SECRET_KEY>`. Obtain both keys from the [DaData profile](https://dadata.ru/profile/). The original API Key & Secret Key connection remains available; the API Key (Suggestions Only) connection supports Suggestions operations. Missing credentials produce an actionable error before the request.

The integration uses these official API families:

- **Suggestions**: `https://suggestions.dadata.ru/suggestions/api/4_1/rs`; autocomplete, identifier lookups, reference directories, and geolocation.
- **Standardization**: `https://cleaner.dadata.ru/api/v1`; contact-data cleaning and address geocoding.
- **Company by Email**: the Suggestions host, but a separately billed enrichment service requiring a secret key.
- **Profile utilities**: `https://dadata.ru/api/v2`; cross-product account balance, daily usage, and reference-data versions.

The [API catalog](https://dadata.ru/api/) and [daily statistics documentation](https://dadata.ru/api/stat/) distinguish the service families. Profile endpoints return operational account data; the published [Profile OpenAPI](https://dadata.ru/files/openapi/profile.yml) has no current-user identity endpoint.

## Operations

| Tool | Provider operation | Reference |
| --- | --- | --- |
| `suggest_address` | POST `/suggest/address` | [Address suggestions](https://dadata.ru/api/suggest/address/) |
| `clean_address`, `geocode_address` | POST Cleaner `/clean/address` with one raw string in an array | [Address standardization](https://dadata.ru/api/clean/address/) |
| `suggest_company` | POST `/suggest/party` | [Company suggestions](https://dadata.ru/api/suggest/party/) |
| `lookup_company` | POST `/findById/party` | [Company by INN/OGRN](https://dadata.ru/api/find-party/) |
| `find_affiliated_companies` | POST `/findAffiliated/party` | [Affiliations](https://dadata.ru/api/find-affiliated/) |
| `lookup_company_by_email` | POST `/findByEmail/company` | [Company by email](https://dadata.ru/api/find-company/by-email/) |
| `suggest_bank`, `lookup_bank` | POST `/suggest/bank`, `/findById/bank` | [Bank lookup](https://dadata.ru/api/find-bank/) |
| `clean_contact_data` | POST Cleaner `/clean/name`, `/clean/phone`, `/clean/email`, `/clean/passport`, `/clean/birthdate`, or `/clean/vehicle` | [Standardization](https://dadata.ru/api/clean/) |
| `reverse_geocode` | POST `/geolocate/address` | [Reverse geocoding](https://dadata.ru/api/geolocate/) |
| `ip_geolocate` | POST `/iplocate/address` | [IP geolocation](https://dadata.ru/api/iplocate/) |
| `lookup_address` | POST `/findById/address` | [Address lookup](https://dadata.ru/api/find-address/) |
| `search_reference_directory` | POST `/suggest/{directory}` or `/findById/{directory}` | [Reference directories](https://dadata.ru/api/) |
| `get_account_info` | GET Profile `/profile/balance`, `/stat/daily`, `/version` | [Balance](https://dadata.ru/api/balance/), [statistics](https://dadata.ru/api/stat/), [versions](https://dadata.ru/api/version/) |
| `suggest_name` | POST `/suggest/fio` | [Personal-name suggestions](https://dadata.ru/api/suggest/name/) |
| `suggest_email` | POST `/suggest/email` | [Email suggestions](https://dadata.ru/api/suggest/email/) |
| `find_nearby_postal_offices` | POST `/geolocate/postal_unit` | [Postal offices](https://dadata.ru/api/suggest/postal_unit/) |

Directory types are `fns_unit`, `fms_unit`, `postal_unit`, `metro`, `country`, `currency`, `okved2`, `okpd2`, `oktmo`, `fts_unit`, `court`, and `mktu`. Individual FMS and metro pages document autocomplete, while OKTMO documents direct-ID lookup. The generic API schema exposes both mode routes without directory-name restrictions, so existing mode selections remain available; provider acceptance of undocumented combinations has not been verified. Filters apply to autocomplete mode; direct-ID mode rejects filters rather than silently ignoring them.

## Request and response behavior

Existing tool keys and input schema types remain available. Optional address `division` selects administrative or municipal division. Company suggestions can filter main offices and branches; company lookup adds status filtering; bank lookup adds a result count.

Counts are checked at runtime as integers from 1 to 20, except company identifier lookup and affiliations, which support up to 300 results. Queries cannot exceed 300 characters. Coordinate ranges and positive radii are validated, and reverse-address geocoding enforces the documented 1000-meter radius limit. Old numeric inputs retain their original number schemas.

Every tool exposes optional `rawData` containing the complete provider response. Selected account responses are keyed by `balance`, `stats`, and `versions`. Cleaning returns exactly the provider's single-item array in `rawData`; normalized fields use that item's values. Nullable provider display strings, original sources, and metro details are omitted from their convenience fields when unavailable while preserving their original types. Actual empty strings and zeroes are preserved, and the raw response retains nulls.

Company by Email uses the documented `suggestions` wrapper. Employee count and income are represented as strings in the existing public fields, including numeric provider values, and a suggestion without a company does not report a company match.

Provider errors retain HTTP status, code, and message details, including responses normalized by the HTTP SDK. No files or webhooks are produced by these operations. Provider subscriptions, daily quotas, and per-operation billing still apply.

## Official schemas

- [Suggestions OpenAPI](https://dadata.ru/files/openapi/suggestions.yml)
- [Cleaner OpenAPI](https://dadata.ru/files/openapi/cleaner.yml)
- [Profile OpenAPI](https://dadata.ru/files/openapi/profile.yml)
