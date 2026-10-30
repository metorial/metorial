# Sixtyfour API integration

Source review: 2026-10-30. Base URL: `https://api.sixtyfour.ai`. Authentication: `x-api-key`. Public API has no account identity endpoint; connection validation and the balance tool use `GET /check-balance` without inventing an account identity.

## Sources

- [Official intelligence MCP](https://docs.sixtyfour.ai/developer-tools/mcp-setup)
- [Live OpenAPI](https://api.sixtyfour.ai/openapi.json)
- [Quick start](https://docs.sixtyfour.ai/api-quick-start)
- [Filter search](https://docs.sixtyfour.ai/api-reference/search/filter-search)
- [Lookalike search](https://docs.sixtyfour.ai/api-reference/search/lookalike-search)
- [Atlas](https://docs.sixtyfour.ai/api-reference/endpoint/atlas-investigations)
- [Bulk intelligence](https://docs.sixtyfour.ai/api-reference/endpoint/bulk-intelligence)
- [Rate limits and errors](https://docs.sixtyfour.ai/api-reference/errors)

## Tool mapping

All public keys retain the official `sixtyfour_` prefix.

| Tool suffix | REST operation |
| --- | --- |
| check_balance | GET /check-balance |
| company_get_searchable_fields, people_get_searchable_fields | GET /search/filter-capabilities with mode |
| company_explore_field_values, people_explore_field_values | POST /search/filter-field-values |
| company_search, people_search | POST /search/query |
| company_next_page, people_next_page | POST /search/query with cursor |
| find_similar_start | POST /search/lookalike |
| find_similar_status | GET /search/lookalike/{task_id} |
| find_similar_results | POST /search/query with search_id or cursor |
| company_intelligence_start | POST /company-intelligence-async |
| people_intelligence_start | POST /people-intelligence-async |
| find_email_start | POST /find-email-bulk-async |
| find_phone_start | POST /find-phone-bulk-async |
| reverse_email_start | POST /reverse-email-bulk-async |
| reverse_phone_start | POST /reverse-phone-bulk-async |
| enrichment_job_status | GET /job-status/{job_id} |
| enrich_linkedin | POST /enrich-linkedin |
| people_bulk_intelligence_start | POST /bulk-intelligence/people with multipart file and config |
| company_bulk_intelligence_start | POST /bulk-intelligence/company with multipart file and config |
| verify_age_start | POST /verify-age |
| verify_age_status | GET /verify-age/{task_id} |
| atlas_start | POST /v1/atlas/investigations |
| atlas_status | GET /job-status/{job_id} |
| atlas_list | GET /v1/atlas/investigations |
| atlas_inspect | GET investigation summary, findings, links or file-entries |
| atlas_file | GET investigation files metadata and authenticated file download |

## Behavior and boundaries

See the README for explicit MCP-to-REST adaptations. Exact hosted input schemas are not public; unauthenticated tools/list returns 401 and the official plugin repository does not contain server implementation. Tools preserve documented names and workflows, using REST parameter names where no MCP parameter contract is published.

Search cursors are opaque provider values. Each search result carries a summary and the complete provider record; the MCP detail tools are omitted because the REST API already returns full records. Similar-people seeds accept 1–1,000 LinkedIn URLs or bounded CSV text. Similarity scores are normalized from the API's 0–1 scale to 0–100.

Research tools return job IDs immediately. Starts are not automatically retried. Status tools retain terminal state, results and credit charges. Bulk outputs expose file metadata and renewable downloads. Atlas file URLs stay on the fixed provider origin and use validated relative paths. API failures preserve HTTP status and the provider's error detail without exposing request headers or raw credential-bearing error objects.

No triggers or recurring monitor/schedule management are included: these are outside the documented intelligence MCP tool list. Provider webhooks can be added separately if required.

## Verification

Private live scenarios cover the public tools; billable, age-verification and Atlas cases use explicit fixture controls. A live run needs a configured API-key profile and sufficient credits; Atlas additionally needs entitlement. Static schema checks do not establish live API acceptance or exact hosted MCP parity.

CSV encoding edge cases have contract tests because they cannot be reliably exercised through a provider round-trip. Provider tool behavior remains covered by the private live suite.
