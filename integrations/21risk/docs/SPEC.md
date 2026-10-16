# 21RISK integration specification

## Connection

The existing connection uses a user-created API key as an `Authorization: Bearer` credential and the legacy base URL `https://www.21risk.com/odata/v5/`. The `api_key` authentication method, `apiKey` credential field, persisted `token` output, and empty connection configuration remain compatible. Blank credentials are rejected locally. This is token authentication; no OAuth exchange or refresh is performed.

The official [Power BI template instructions](https://21risk.com/docs/powerbi-template-app) link API-key creation to [account settings](https://21risk.com/profile/account). The [REST API overview](https://21risk.com/tools/rest-api) confirms scoped API keys and Bearer authentication, but it does not describe the legacy endpoint schemas. The product [permissions guide](https://21risk.com/docs/how-access-is-controlled) explains organization, board, and site access restrictions.

## Existing operations

| Tool | Retained route | Output |
| --- | --- | --- |
| `list_organizations` | `/Organizations` | `organizations`, page `count` |
| `list_sites` | `/Sites` | `sites`, page `count` |
| `list_audits` | `/Audits` | `audits`, page `count` |
| `get_audit` | `/Audits(<auditId>)` | Full `audit` record |
| `list_risk_models` | `/RiskModels` | `riskModels`, page `count` |
| `list_categories` | `/Categories` | `categories`, page `count` |
| `list_corrective_actions` | `/Actions` | `actions`, page `count` |
| `get_compliance_data` | `/Compliance` | `complianceRecords`, page `count` |
| `list_members` | `/Members` | `members`, page `count` |
| `list_property_insurance_items` | `/PropertyInsuranceItems` | `items`, page `count` |
| `get_cope_data` | `/Cope` | `copeRecords`, page `count` |

Existing query fields and optional record summaries are retained. Returned record fields are passed through, rather than renamed or filled with defaults. Audit IDs are encoded in the request path. The collection response may be an OData `value` array, a bare array, or the previously supported bare entity object; malformed envelopes, primitive records, absent data, and provider error responses raise a service failure.

## Pagination

Collection tools accept an optional `nextLink` and return optional `nextLink` and `totalCount` fields. The [OData JSON standard](https://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#sec_CollectionofEntities) defines collection arrays, continuation links, and count annotations. Both `@odata.nextLink`/`@odata.count` and the shortened `@nextLink`/`@count` forms are recognized.

Use a returned continuation link alone with the same tool. Links must remain on the same origin and collection path; foreign origins, credentials, fragments, and mixed continuation/query options are rejected before sending the credential. `top` and `skip` retain number schemas and are checked at runtime as non-negative safe integers. Organizations and risk models now also accept optional `skip`.

`count` describes the current page. `totalCount` is emitted only when the provider supplies a non-negative safe integer, including a real zero; an omitted total stays omitted. Provider continuation availability and support for individual query options remain unverified against a live account.

## Scope and source limits

This integration exposes read operations only. The provider now describes additional REST and MCP capabilities, including writes, but the public overview does not specify their complete endpoint, request, or response contracts. No speculative writes, detail endpoints, current-user lookup, files, or triggers are added. Existing unused client methods for site/risk-model/action detail, monthly items, and reports are retained for compatibility without promoting them into tools.

The current official documentation does not expose a suitable current-user endpoint for this API-key/OData connection, so there is no identity tool. It also does not confirm the legacy OData entity names, key types, field names, filters, relationship expansions, or response nullability; those contracts remain unchanged. A separate authenticated provider verification is needed to establish runtime acceptance.
