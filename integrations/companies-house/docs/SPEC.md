# Companies House Integration Specification

## Scope

Package version `0.1.0-rc.1` provides 17 read-only tools for searching and retrieving information from the United Kingdom public company register. It covers companies, officers, officer disqualifications, filing history and documents, charges, insolvency, and people with significant control (PSCs).

The implementation follows these Companies House sources:

- [Public Data API reference](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference)
- [Document API reference](https://developer-specs.company-information.service.gov.uk/document-api/reference)
- [API authentication](https://developer.company-information.service.gov.uk/authentication)
- [Developer guidelines and rate limits](https://developer.company-information.service.gov.uk/developer-guidelines/)
- [API testing environments](https://developer.company-information.service.gov.uk/api-testing)

## Authentication and service hosts

The connection accepts one Companies House API key. Requests authenticate with HTTP Basic authentication: the API key is the username and the password is blank.

| Service | Base URL | Use |
| --- | --- | --- |
| Public Data API | `https://api.company-information.service.gov.uk` | Public company, officer, filing, charge, insolvency, and PSC data |
| Document API | `https://document-api.company-information.service.gov.uk` | Filing-document metadata and document-location requests |

The authenticated clients request JSON by default. All path identifiers are percent-encoded before use.

### Identity exemption

The Public Data API does not provide an API-key identity endpoint that identifies the owner of a key. The connection therefore stores the key without claiming an authenticated person or organisation, and the package intentionally has no identity/profile tool. Companies House OAuth identity endpoints are a separate product and are not required by these public-register tools.

## Tool and endpoint matrix

All endpoints below use `GET`.

| Tool | Service and endpoint | Purpose |
| --- | --- | --- |
| `search_companies` | Public Data API `/search/companies` | Search by company name or number, with supported restrictions |
| `search_companies_advanced` | Public Data API `/advanced-search/companies` | Search by company attributes and date ranges |
| `get_company_profile` | Public Data API `/company/{company_number}` | Retrieve the current company profile |
| `search_officers` | Public Data API `/search/officers` | Search officer records by name |
| `list_company_officers` | Public Data API `/company/{company_number}/officers` | List current and resigned company officers |
| `list_officer_appointments` | Public Data API `/officers/{officer_id}/appointments` | List an officer’s company appointments |
| `search_disqualified_officers` | Public Data API `/search/disqualified-officers` | Search natural and corporate disqualified officers |
| `get_officer_disqualifications` | Public Data API `/disqualified-officers/{natural\|corporate}/{officer_id}` | Retrieve disqualifications and permissions to act |
| `list_filing_history` | Public Data API `/company/{company_number}/filing-history` | List and filter filing history |
| `get_filing_history_item` | Public Data API `/company/{company_number}/filing-history/{transaction_id}` | Retrieve one filing-history item |
| `get_document_metadata` | Document API `/document/{document_id}` | Discover metadata and available representations |
| `download_filing_document` | Document API `/document/{document_id}/content` | Locate and download an advertised representation |
| `list_company_charges` | Public Data API `/company/{company_number}/charges` | List registered charges |
| `get_company_charge` | Public Data API `/company/{company_number}/charges/{charge_id}` | Retrieve one registered charge |
| `get_company_insolvency` | Public Data API `/company/{company_number}/insolvency` | Retrieve company insolvency cases |
| `list_company_pscs` | Public Data API `/company/{company_number}/persons-with-significant-control` | List PSC notifications |
| `list_psc_statements` | Public Data API `/company/{company_number}/persons-with-significant-control-statements` | List PSC statements |

## Input normalization and restrictions

All tool inputs serialize as top-level JSON objects.

- Pagination uses `itemsPerPage` and `startIndex`, mapped to the provider’s `items_per_page`/`start_index` fields or to `size` for advanced company search. The default page size is 20, the integration maximum is 100, and `startIndex` must be a non-negative integer. The integration cap applies even though advanced search documents a larger provider maximum.
- Simple company search trims `query`. It accepts only `active-companies` and `legally-equivalent-company-name`; multiple values are unique and sent as a space-separated `restrictions` value. Combining both invokes Companies House company-name availability behavior.
- Advanced company search requires at least one business filter. Text is trimmed; status, type, subtype, and SIC-code arrays are sent as comma-delimited lists. Incorporation and dissolution dates must be real `YYYY-MM-DD` dates, and each `from` value must not be later than its corresponding `to` value.
- Filing categories must be a non-empty, duplicate-free list of non-empty strings and are sent as a comma-delimited `category` value.
- Company-officer `orderBy` accepts `appointed_on`, `resigned_on`, or `surname`. `registerType` accepts `directors`, `secretaries`, or `llp_members` and requires `registerView: true`.
- PSC and PSC-statement requests always send `register_view`; it defaults to `false`.
- Disqualification detail requires the `natural` or `corporate` type returned by disqualified-officer search so the correct resource path is selected.

## Response normalization

Provider JSON is normalized to stable camel-case fields while each result also retains its original `record` for provider fields not yet promoted to the stable surface. Unknown enum strings remain strings so new Companies House values do not cause avoidable failures. Optional provider fields are omitted when they are absent.

Identifiers derived from provider links are accepted only from the expected API origin and path shape; links with credentials, query strings, fragments, or a different origin are not used to derive identifiers.

### Pagination

- Standard search and list envelopes use provider `items_per_page`, `start_index`, and `total_results` or `total_count` when present. If page coordinates are omitted, the requested values are retained; if a total is omitted on a generic result, the returned item count is used.
- Advanced company search validates the provider’s decimal-string `hits` field and exposes it as `totalResults`. It preserves the requested `itemsPerPage` and `startIndex`. A provider `404` for no advanced matches is normalized to an empty page with zero hits.
- Filing history requires the provider’s `total_count` and exposes `filingHistoryStatus` when present.
- Charge list pagination preserves `itemsPerPage` and `startIndex` and exposes the provider’s optional `totalCount`, `satisfiedCount`, and `partSatisfiedCount`. It does not invent a total when Companies House omits one.
- Company-officer results expose the provider’s `active_count` and `resigned_count`. No inactive count is fabricated or inferred.
- PSC and PSC-statement pages expose provider active and ceased counts plus the best available total.

### Record-specific behavior

- Search results and profiles promote company number, name, status, type, dates, address information, and relevant links.
- Officer search promotes the provider appointment count when published. Company-officer and historical appointment records keep `appointedOn` and `resignedOn` optional because Companies House documents historical cases where those dates can be absent.
- Officer disqualification output maps `permissionsToAct` directly from the provider’s `permissions_to_act` array, alongside natural/corporate identity fields and disqualification reasons, dates, variations, and addresses.
- Filing records promote transaction and document identifiers, category, date, type, description, pages, annotations, associated filings, and resolutions. A document identifier is derived only from a valid Document API metadata link.
- Charge records promote charge identifiers, status, classifications, secured details, particulars, persons entitled, transactions, insolvency cases, dates, and links.
- Insolvency output preserves cases, event dates, notes, and practitioners. PSC output preserves published control, address, identity-verification, sanction, and cessation fields when supplied.

## Document metadata and secure download

Document retrieval is a two-step workflow:

1. `get_document_metadata` requests `/document/{document_id}` and returns the MIME types advertised under the provider’s `resources` object, with available size and timestamp metadata.
2. `download_filing_document` requires one advertised MIME type and requests `/document/{document_id}/content` with that value in `Accept`.

The supported allowlist is `application/pdf`, `application/json`, `application/xml`, `application/xhtml+xml`, `application/zip`, and `text/csv`. The download sequence deliberately does not follow redirects automatically:

1. The authenticated Document API request must return exactly `302` with a `Location` header.
2. The location must be an absolute HTTPS URL with no embedded username or password.
3. The destination is fetched without the Companies House API key, with further redirects disabled, and must return a `2xx` response.
4. Both declared content length and received bytes are limited to 50 MiB (52,428,800 bytes); empty or non-binary bodies are rejected.
5. If the response `Content-Type` is missing or is the generic `application/octet-stream` type, the requested allowlisted MIME type is used. Any unexpected specific MIME type is rejected.

The successful result exposes the document ID, generated file name, MIME type, and byte length, and makes the document available as a downloadable file. File contents are not included in structured output.

## Errors and rate limits

Input validation, unexpected provider response shapes, and upstream failures are returned as typed service errors with actionable messages. API keys are redacted from mapped error text.

- `401`: report invalid authentication and ask the user to check the API key.
- `404`: report a missing identifier or resource, except the documented no-match advanced-search case described above.
- `406`: ask the user to choose a representation advertised by document metadata.
- `429`: report the rate limit and include `X-RateLimit-Reset` when Companies House supplies it.

Companies House permits 600 requests per five-minute period. This package does not attempt to bypass or silently retry that limit; callers should wait for the provider window to reset.

## Public personal data

The public register can include personal data such as names, correspondence or service addresses, nationalities, occupations, partial dates of birth, and identity-verification details. The fact that data is publicly accessible does not remove the caller’s responsibility to comply with applicable data-protection, copyright, retention, security, and republication requirements. The integration returns only information supplied through the selected public endpoints and does not attempt to uncover protected residential addresses or super-secure identities.

## Testing environment boundary

Package tests use mocked provider responses plus schema and contract checks; they do not require credentials or call Companies House. The runtime configuration intentionally targets the live read-only Public Data and Document API hosts and does not expose a sandbox switch.

Companies House states that its sandbox does not run the Document API and that some read-only services, including search, can return live data because of processing limitations. Sandbox filing workflows also use OAuth, company authentication codes, generated test companies, and mock processing, none of which are part of this package.

## Explicit exclusions

- OAuth sign-in and all filing or company-data mutation APIs
- Discrepancy reporting for obliged entities
- Streaming APIs, event feeds, and webhooks
- Sandbox test-data generation or sandbox-host selection
- Search-all, alphabetical-search, and dissolved-search variants
- Standalone registers, exemptions, registered-office, UK-establishment, per-PSC detail, and PSC-notification endpoints
- Certified copies, certificates, paid products, bulk data products, XML gateway services, and software-filing interfaces
