# Handelsregister.ai API capability specification

The integration reproduces the official MCP data-tool surface using GET requests to `https://handelsregister.ai/api/v1`. It exposes 19 read-only tools and no triggers. Monitoring, Signals, key management, and client provisioning are outside its scope.

## Authentication

API Key is the only authentication method. The secret is stored in authentication output and sent in the `x-api-key` header on every request. No connection configuration is required.

Connection profile verification uses `/account` without charging credits. Credentials are never placed in query strings, returned data, or error messages.

## REST mapping

All company views use `/fetch-organization` with `q`, optional `ai_search` and `realtime_mode`, and the single feature below. Unsupported realtime combinations are rejected before a network request.

| Tool | Feature / response field |
| --- | --- |
| `get_company_overview` | No feature; core company profile |
| `get_financials` | `financial_kpi` |
| `get_balance_sheet` | `balance_sheet_accounts` |
| `get_profit_and_loss` | `profit_and_loss_account` |
| `get_annual_financial_statements` | `annual_financial_statements` |
| `get_annual_financial_statements_html` | `annual_financial_statements__html`; accepts documented legacy response alias `annual_financial_statements_html` |
| `get_related_persons` | `related_persons` |
| `get_shareholders` | `shareholders` |
| `get_ubos` | `ubos` |
| `get_shareholdings` | `shareholdings` |
| `get_mergers_and_acquisitions` | `mergers_and_acquisitions` |
| `get_publications` | `publications` request; `history` response |
| `get_insolvency_publications` | `insolvency_publications` |
| `get_news` | `news` |
| `get_website_content` | `website_content`; forces `ai_search=on-default` |

`search_organizations` calls `/search-organizations` with `q` and/or JSON-encoded `filters`, `skip`, `limit`, `sort`, `order`, and `match_context`. Financial ranges remain nested under `financial_filters`. Radius parameters must be supplied together. The tool returns `results`, `total`, `skip`, `limit`, optional `next_skip`, and `meta`. Pagination never runs automatically.

`fetch_person` calls `/fetch-person` with `person_q`, `organization_q`, and optional `feature: ["shareholdings"]`, serialized as `features=shareholdings`.

`fetch_document` calls `/fetch-document` with `company_id` and one of `AD`, `CD`, `shareholders_list`, `articles_of_association`, or `SI`. PDF and XML files are delivered with company ID, document type, filename, MIME type, and byte size.

`get_account` calls `/account` and exposes the account profile and optional billing metadata.

## Output and failure behavior

Feature tools preserve core company data separately from the requested feature. Financial rows have typed years and core numeric metrics; variable provider-specific detail is retained. Missing values remain missing, null remains null, and empty collections remain empty.

Annual statements use `document_md` or `document_html` to produce one download per returned report, with fiscal year, title, date, language, and byte size. No report contents appear in structured output. Records with no content retain metadata with zero bytes. Website Markdown follows the same download convention, accepting plain text, a content object, or an array of content objects and preserving each source URL in file metadata. Credit balances preserve both numeric and string values returned by the provider. No publicly usable document download URL is documented for these authenticated endpoints.

HTTP errors become actionable validation, credential, subscription, credit, not-found, throttling, or provider failure messages. Error bodies are not echoed because they may contain credentials or binary data. Invalid successful response shapes also produce an explicit provider-response error. Requests use bounded timeouts, reject redirects, and do not retry automatically.

## Verification

Private live coverage exercises all tool keys, explicit pagination, filter-only search, company discovery, financial/ownership feature shapes, person context, and Markdown/HTML/PDF/XML delivery. Optional known insolvency fixtures verify both populated and empty histories. These registry records cannot be created by the suite. An API-key profile is required, and a paid account is required for person retrieval.

Insufficient-credit and subscription-denial responses require accounts in those states; successful calls must not be reported as proving those error branches.

Sources: [MCP documentation](https://handelsregister.ai/en/documentation/mcp-server), [REST reference](https://handelsregister.ai/llms.txt), [official SDK response types](https://github.com/Handelsregister-AI/handelsregister-js/blob/main/src/types.ts).
