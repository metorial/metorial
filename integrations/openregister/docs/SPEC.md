# OpenRegister integration specification

## Tool and endpoint map

| Tool | Method | Endpoint |
|---|---|---|
| `search_companies` | GET | `/v1/autocomplete/company` |
| `search_companies_advanced` | POST | `/v1/search/company` |
| `lookup_company_by_url` | GET | `/v0/search/lookup` |
| `get_company` | GET | `/v1/company/{company_id}` |
| `get_company_contact` | GET | `/v0/company/{company_id}/contact` |
| `get_company_financials` | GET | `/v1/company/{company_id}/financials` |
| `get_company_owners` | GET | `/v1/company/{company_id}/owners` |
| `get_company_historical_owners` | GET | `/v1/company/{company_id}/owners/historical` |
| `get_company_holdings` | GET | `/v1/company/{company_id}/holdings` |
| `get_company_ubos` | GET | `/v1/company/{company_id}/ubo` |
| `search_people` | POST | `/v1/search/person` |
| `get_person` | GET | `/v1/person/{person_id}` |
| `get_person_holdings` | GET | `/v1/person/{person_id}/holdings` |
| `search_insolvencies` | POST | `/v1/search/insolvency` |
| `get_insolvency` | GET | `/v1/insolvency/{insolvency_id}` |
| `get_stored_document` | GET | `/v1/document/{document_id}` |
| `get_realtime_document` | GET | `/v1/document` |
| `get_credit_balance` | GET | `/v1/credits` |

## Authentication and request contract

One `api_key` authentication method accepts an `api_key` secret and persists a bearer token. Configuration is empty. The API base is `https://api.openregister.de`; website lookup and contact information use their documented v0 endpoints. Other tools use v1. Requests have a 120-second timeout, no automatic retries, and no automatic pagination. All tools are read-only, including credit-consuming document retrieval and realtime lookups.

Search inputs preserve the provider's snake_case fields and nested query, filters, pagination, and location structures. Input schemas are top-level objects. Insolvency searches require a query or at least one filter and reject empty criteria before contacting the provider. Filter forms are mutually exclusive; boolean and confidence filters have runtime validation. Company field enums include the current documentation's VAT ID and estimated financial filters, which were absent from the inspected SDK revision.

Outputs expose typed identifiers, names, relationships, source links, dates, pagination, and financial data. Financial tables retain recursive accounting rows. Provider extension fields are retained on research records to preserve new indicators and estimates without conflating them with reported figures. Financial indicators and monetary filter thresholds retain cents; no unit conversion is performed.

Document tools return direct provider URLs and metadata. Stored URLs expire after 15 minutes. No document bytes are embedded in structured output. The six realtime categories are `current_printout`, `chronological_printout`, `historical_printout`, `structured_information`, `shareholder_list`, and `articles_of_association`.

Errors preserve upstream status and actionable details, redact the API token from displayed messages, and distinguish authentication, plan/credit restrictions, unavailable records, rate limits, and connectivity failures. Invalid filter combinations and incompatible owners flags fail before HTTP requests.

## Sources

- [Official SDK endpoint map](https://github.com/oregister/openregister-typescript/blob/2e422da7774f27c64476745303d66a938080be49/api.md), inspected September 7, 2026.
- [Official MCP implementation](https://github.com/oregister/openregister-typescript/tree/2e422da7774f27c64476745303d66a938080be49/packages/mcp-server): exposes generic `execute` and `search_docs`; this integration provides the approved explicit research tool surface.
- [Filtering](https://docs.openregister.de/filtering), [authentication](https://docs.openregister.de/authentication), [pricing](https://docs.openregister.de/pricing), [stored documents](https://docs.openregister.de/endpoint/document-stored), and [realtime documents](https://docs.openregister.de/endpoint/document-realtime).

## Verification

Schema regression tests cover all 18 tool input contracts. Private live scenarios and tool-use evals cover discovery chains, filter semantics, ownership direction, documents, and credits. Live execution requires an API-key profile with sufficient credits. Optional fixtures can select public records with known financials, ownership history, and stored documents. Missing credentials or unsuitable fixtures are setup failures, not successful verification.
