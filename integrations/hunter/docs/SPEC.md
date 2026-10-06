# Hunter capability specification

The integration uses the current Hunter V2 API at `https://api.hunter.io/v2` with the `X-API-KEY` header. Stored authentication remains `{ token }`, configured through the `api_key` method with `apiKey`; no additional configuration is required.

| Tool | Supported workflow |
| --- | --- |
| domain_search | Domain/company email search; offset pagination and documented verification/location filters |
| find_email | Email lookup by company and name or LinkedIn handle |
| verify_email | Verification checks, with explicit pending status and same-address polling |
| enrich_person | Person profile with name, employment, location and social handles |
| enrich_company | Company profile with industry, headcount range, location, social handles and technologies |
| discover_companies | Company discovery by query or structured filters, including exact domains |
| email_count | Free availability counts and department/seniority breakdowns |
| manage_lead | Create, update and email-based upsert of lead fields |
| list_leads | Filter and page through saved leads |
| get_lead | Retrieve lead details and ownership/list metadata by ID |
| delete_lead | Delete a saved lead |
| manage_leads_list | List, get, create, rename and delete lead lists |
| manage_sequence | List/get sequences, list/add recipients, cancel scheduled recipient emails, start, pause and resume |
| get_account | Account identity and provider-reported credit/search/verification balances |

Existing input keys and types remain available. Location strings in Domain Search are comma-separated two-letter country codes, mapped to structured filters. The legacy `invalid` verification filter is rejected with a clear explanation because that endpoint supports `valid`, `accept_all` and `unknown`. Discover headcount bounds must exactly match the provider's buckets; arbitrary partial ranges are rejected rather than silently broadened. Lead email filters use substring matching in the provider API.

Mutation acknowledgments are handled separately from resource readbacks. Updates returning HTTP 204 are followed by a GET. Background list deletion returns `pending: true`; callers must independently confirm absence. Sequence recipient cancellation stops scheduled messages and retains history. Consolidated management tools are annotated as destructive. Lookup auto-save behavior is disclosed on finder and verifier tools.

The private live suite uses an isolated synthetic account and independently checks account/team/user identity. UUID-marked leads, empty static lists and senderless draft sequences are owned and cleaned up with direct provider readbacks and absence proof. Credit/history lookups need explicit authorization and disabled auto-save. Starting, pausing or resuming a sending sequence remains gated until a controlled sender/content/schedule fixture and a real cleanup mechanism for retained history exist. No customer sequence is used for verification.

Official sources: [V2 API reference](https://hunter.io/api-documentation/v2), [public OpenAPI](https://hunter.io/openapi.json). Provider beta/admin/template/bulk workflows and logo downloads are outside this focused integration surface.
