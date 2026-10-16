# More Trees API coverage

Reviewed against the [official API guide](https://www.moretrees.eco/learn/user-guides/api) on 2026-10-15.

## Connection and account selection

Connect with an API Key and Public Validation Key. Account-specific tools accept
an optional `accountCode`; existing connections retain their saved account code
as a fallback. New connections do not require a configuration ID.

Find account codes in [Settings > Account Settings](https://www.moretrees.eco/learn/user-guides/account-settings).
The public API guide has no account-list or current-user discovery endpoint.
`get_account_info` supplies account identity and a forest slug once the account
code is known. Authentication stores the supplied keys; it does not make an
undocumented profile request or claim to verify them remotely.

## Tools

| Tool | Outcome |
| --- | --- |
| `get_account_info` | Account identity, balance, and forest slug. |
| `get_forest_info` | Forest branding and planting totals by slug or account code. |
| `list_projects` | Projects, tree IDs, and costs for planting selection. |
| `plant_trees` | Self-planting or gifts, with optional project/tree selection and dry-run mode. |
| `get_credit_balance` | Balance from account information when `accountCode` is supplied; otherwise the existing key-only balance request. |
| `get_carbon_offset` | Existing carbon-offset response preserved under `carbonOffset`. |

Gifting requires a nonempty recipient list, each with a name, quantity, and
exactly one nonblank email or account code. Omit recipients and provide quantity
to plant for yourself. Planting uses account credits; this integration does not
purchase credits.

## Compatibility and documentation limits

All six existing tool keys and output field types remain available. Project and
tree IDs remain integers in planting inputs and numbers in existing outputs.
Carbon-offset properties remain unchanged rather than being inferred from forest
statistics. No tool returns a downloadable file.

The current official guide covers account information, forests, projects, and
planting. It does not document the retained `/v1/basic/viewCredits` and
`/v1/basic/carbonOffset` requests. Their existing methods, paths, raw key
Authorization headers, and successful output mappings are retained for
compatibility; their current provider availability remains unverified. The guide
also does not specify the project request's exact validation-key header or a
forest-specific authorization header, so existing headers remain unchanged.

No additional API endpoint or webhook contract was confirmed from official
documentation. This is a documentation review and local verification, without
live provider calls.
