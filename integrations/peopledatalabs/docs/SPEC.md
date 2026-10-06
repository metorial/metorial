# People Data Labs API specification

The integration uses the current v5 REST API at `https://api.peopledatalabs.com/v5`. Authentication uses the `X-Api-Key` header; API keys, product access, field bundles and credit limits are managed in the provider dashboard. The documented API does not expose a suitable current-user or account discovery endpoint. No OAuth scopes or token refresh flow applies.

| Capability | Tool keys | Contract |
| --- | --- | --- |
| Person enrichment | `enrich_person`, `bulk_enrich_person` | Supply a profile, email or phone, or a full name with supported context. All supplied social profiles are sent together. Bulk accepts 1–100 people and returns ordered per-record statuses, match data and partial failures. |
| Person search | `search_person` | Exactly one SQL or Elasticsearch JSON object query, including on subsequent pages. `size` is an integer 1–100; the provider default is 1. Repeat the same query with each `scrollToken`. |
| Person identify | `identify_person` | Supports broader identifying inputs and returns up to 20 profiles ordered by match score. Each production call consumes one credit even when no match is found. |
| Person retrieve | `retrieve_person` | Uses an encoded persistent PDL ID. IDs can disappear after source/dataset changes. The official SDK continues to expose retrieval; current main documentation focuses on enrichment/search/identify. |
| Company enrichment | `enrich_company`, `bulk_enrich_company` | Match by name, website, profile or ticker. Single enrichment uses the provider's flattened response. Bulk accepts 1–100 companies and returns ordered statuses and partial failures. |
| Company search | `search_company` | Same query/page contract as person search. |
| IP enrichment | `enrich_ip` | IPv4 or IPv6. Address and location come from `data.ip`; confidence comes from `data.company.confidence`. The tool requests IP location explicitly. |
| Supporting APIs | `enrich_job_title`, `clean_company`, `clean_location`, `clean_school`, `autocomplete` | Return provider-standardized values. Job Title Enrichment returns similar titles and relevant skills. Legacy role/sub-role/levels output fields remain nullable when absent; no inferred classifications are invented. |
| Retired skill enrichment | `enrich_skill` | Key and schemas preserved, tagged deprecated, and blocked without transport. Removed by the provider in April 2025 (v30.0). No equivalent replacement is claimed. |

Production person/company enrichment charges per successful match; bulk responses can contain both 200 and unsuccessful statuses in one HTTP-200 response. Bulk results expose an expected enrichment charge and the actual `x-call-credits-spent` header when available. These are separate values; missing headers are reported as null, never invented. Search charges for returned records. Rate limits and balances are endpoint/product specific. Failed or timed-out requests are not retried automatically. Credits, overages and provider request history cannot be rolled back by this API.

## Sandbox

`https://sandbox.api.peopledatalabs.com/v5` supports person enrichment/search/identify/bulk and company enrichment/search. Person and company records are artificial and consume no credits. The default sandbox limit is five calls per minute. No documented sandbox exists for person retrieval, company bulk enrichment, IP enrichment or supporting APIs; these operations fail clearly in sandbox mode without forwarding keys to production.

## Compatibility and omissions

All 13 original tool keys and accepted input field types remain available. Person language objects map to the existing language-name array. Current company employer-insight fields populate the preserved employer insight outputs, with a legacy fallback. HTTP 404 means no match and is mapped to an empty result rather than a transport failure on supported lookup/search operations. Other HTTP/API failures are safe user-facing errors without retained transport context.

No provider data mutation, subject privacy request, data-license delivery, job-posting search, changelog tool or trigger is added. Subject requests have irreversible effects and are outside this read-only data lookup scope. Files are not generated or downloaded by these tools.

Official references: [authentication](https://docs.peopledatalabs.com/docs/authentication), [errors](https://docs.peopledatalabs.com/docs/errors), [sandbox endpoints](https://docs.peopledatalabs.com/docs/sandbox-apis-reference), [bulk person](https://docs.peopledatalabs.com/docs/bulk-enrichment-api), [bulk company](https://docs.peopledatalabs.com/docs/bulk-company-enrichment-api), [person search inputs](https://docs.peopledatalabs.com/docs/input-parameters-person-search-api), [IP response](https://docs.peopledatalabs.com/docs/output-response-ip-enrichment-api), [April 2025 retirement](https://docs.peopledatalabs.com/changelog/april-2025-release-notes-v300), [official Python SDK](https://github.com/peopledatalabs/peopledatalabs-python).
