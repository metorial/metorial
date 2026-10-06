# Formbricks

Manage surveys and responses through the stable Management API v1 on Formbricks Cloud or a configured self-hosted instance. Read the connected workspace, contacts, action classes, and native contact attribute keys.

Supply the optional `baseUrl` when connecting a self-hosted API key; omit it for Formbricks Cloud. New connections use their saved instance origin, including during profile discovery without configuration. Historical token-only connections retain the validated configured-origin fallback. Use a key scoped to exactly one workspace with appropriate read/write permissions. The v1 identity endpoint does not support organization-only or multi-workspace keys. Beta v2 is a separate API surface and is not used for these tools.

`get_account_info` returns actual environment/project compatibility fields and current workspace fields when provided. `environmentId` remains the accepted v1 target alias. Survey lists use native `offset`; response lists map the existing `offset` input to native `skip`. Contact lists apply limit/offset locally to the documented v1 contact list. Omitted values preserve provider defaults; explicit zero is preserved.

Survey questions need their documented type-specific configuration. Creation assigns question/choice IDs and `required=false` only when omitted. Ending IDs must be supplied. Code actions require `key`; no-code actions require `noCodeConfig`. The historical `automatic` enum, response `meta.userAgent` string, `welcomeCard.html`, and survey `redirectUrl` inputs remain discoverable but return guidance instead of silently sending unsupported fields.

Response creation reads the exact survey first to derive its workspace. Updates merge supplied answer keys with existing answers. Creating/updating responses runs configured pipelines, integrations, webhooks, and potentially follow-up emails. Publishing app surveys may expose them to real visitors. Deleting records cannot undo sent messages, audit records, or processing effects.

Three historical attribute-class tools retain their keys and schemas with deprecation notices. Their routes are absent from the current official v1 router. Use `list_contact_attribute_keys` for native discovery and the provider UI for definition changes. No retirement date or replacement write API is inferred. No triggers, uploads, exports, personalized links, or contact administration are exposed.

Native contact attribute key names may be null. Exact response reads preserve explicitly null contact attributes; only an omitted current field falls back to a historical alias.

Current contracts are based on the [v1 reference](https://formbricks.com/docs/api-reference/rest-api), [v2 compatibility notes](https://formbricks.com/docs/api-v2-reference/introduction), and [official router/source](https://github.com/formbricks/formbricks/tree/main/apps/web/app/api/v1/management). Authenticated acceptance and cleanup remain unverified without a controlled live workspace.
