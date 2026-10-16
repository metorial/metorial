# HigherGov integration

HigherGov provides federal, state, and local government market intelligence. This integration exposes read-only search and retrieval tools using HigherGov's data API.

## Authentication

Use an API key created by an account administrator at [API management](https://www.highergov.com/api-management/). HigherGov authenticates data API requests with the `api_key` query parameter. There is no duplicate connection configuration, OAuth flow, or token refresh. Blank keys are rejected locally; provider requests validate permissions and subscription access.

All HigherGov subscriptions include 10,000 API records per month. Pagination starts at page 1, defaults to 10 records per page, and supports up to 100 records per page. Numeric IDs and pagination values must be whole numbers. Date filters use valid calendar dates in `YYYY-MM-DD` format.

## Supported tools

| Tool | Supported behavior |
| --- | --- |
| `search_opportunities` | Filter opportunities by HigherGov/source IDs, source type, agency, captured or posted date, and saved search. The existing source and ordering choices are retained. |
| `search_contract_awards` | Search prime contracts, IDV awards, or subcontracts with the filters supported by each endpoint. Prime contracts additionally support the amendment capture date. |
| `search_grant_awards` | Search prime grants or subgrants. Prime grants additionally support award ID, assistance listing number, and saved search. |
| `search_awardees` | Research awardees, mentor-protege relationships, and prime/subaward partnerships, including separate relationship parent filters. The legacy `awardeeKeyParent` filters mentor or prime parents for relationship lookups. |
| `search_people` | Find government and contractor contacts by email. |
| `get_documents` | Retrieve opportunity document metadata using a related key or the `document_path` URL returned by an opportunity, and prepare downloadable files. |
| `search_agencies` | Browse agencies and their hierarchies, or filter by agency key. |
| `search_contract_vehicles` | Browse contract vehicles or filter by vehicle key. |
| `lookup_codes` | Browse or look up NAICS, PSC, and assistance listing programs. Ordering applies only to NAICS; agency filtering applies only to grant programs. |
| `search_state_local_contracts` | Filter state and local awards by capture date, earliest start date, latest end date, or saved search. |
| `search_nsn` | Research National Stock Numbers by NSN, CAGE code, or manufacturer part number. |
| `search_pursuits` | Read the connected account's internal pursuits by reference ID, unique key, or saved search. These records are distinct from public opportunities. |

Each search returns provider records without dropping fields, plus the matching count, current page, and total pages. Required pagination output values are read from the provider; a malformed response produces a clear error. Unsupported branch-specific filters produce a validation error instead of being silently ignored.

## Document downloads

HigherGov documents the sequence: search opportunities, read `document_path`, and request the related documents. Download URLs expire after 60 minutes. The integration prepares the returned URLs for download and renews them five minutes before that limit. The original document records and download URLs remain in the structured result for compatibility.

Renewal requires a nonblank filename plus a known size or nonblank posted date, with exactly one matching record on the original page. It then reissues the original result-page query and requires exactly one record with the same filename, size, and posted date. If the document has moved to another page or those metadata do not identify one document uniquely, run `get_documents` again. Renewal does not guess a replacement file.

## Scope

The 12 tools cover all 19 GET endpoints in the published HigherGov data API. HigherGov does not document a suitable current-user or account-profile endpoint for this API. This integration has no triggers or write operations. HigherGov's separate Zapier pipeline integration uses a pipeline secret, requires a Standard or Leader subscription, and is not exposed by these tools.

## Official references

- [OpenAPI endpoint documentation](https://www.highergov.com/api-external/docs/)
- [OpenAPI schema](https://www.highergov.com/api-external/schema/)
- [API guide](https://docs.highergov.com/import-and-export/highergov-api)
- [Zapier integration](https://docs.highergov.com/import-and-export/zapier-integration)
