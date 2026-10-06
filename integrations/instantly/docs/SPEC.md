# Instantly integration API contract

This integration uses the scoped V2 Bearer API at `https://api.instantly.ai/api/v2`. Obtain a new V2 key under Settings → Integrations → API Keys; V1 keys cannot be reused. Email-account OAuth connects senders and is not authentication for this integration.

The tools cover campaign lifecycle and analytics, lead CRUD and asynchronous moves, account reads/settings, inbox reads/replies, verification, lead lists/labels, tags, block lists, and current-workspace identity. Administrative provisioning, paid enrichment, team/billing changes and webhook registration are outside this tool surface.

List tools expose one provider page and its cursor. Follow a non-null cursor even if the locally applied lead interest-status filter produced an empty page. Analytics with multiple campaigns uses repeated `ids` query parameters. Daily and step views accept only a single campaign ID.

Analytics ranges accept dates or ISO 8601 timestamps with a time zone; dates use UTC midnight. Interest-status updates are background submissions and can change opportunities or trigger automations and CRM-status subsequences. Scope them to a campaign or list and independently read back before retrying.

Campaign creation produces a draft. Activation or resumption can initiate sending. Changing `sendingAccounts` replaces the complete campaign sender list. Account `sendingGap` retains seconds in the tool contract and is converted to/from the API's minutes.

Replies send real email. The original incoming message is read first to bind the requested recipient; the request uses `eaccount`, subject, a structured HTML body and comma-separated CC/BCC. Accepted submission is not delivery confirmation. Verification can consume credits; pending catch-all state is omitted from the legacy Boolean field rather than reported as false.

The legacy mapping actions and fields remain accepted by the schema. Current official documentation defines only association reads by sender email and no opaque mapping ID or standalone creation/deletion. Unsupported legacy mutations fail before a provider write and explain the full-list campaign alternative. This is a documentation/compatibility limitation, not a claim that a provider API was retired. Mapping IDs are omitted when unavailable. Lead labels use label/category and generated interest status; unsupported legacy color requests fail clearly.

Official references: [API index](https://developer.instantly.ai/llms.txt), [authorization](https://developer.instantly.ai/getting-started/authorization), [official SDK/OpenAPI](https://github.com/Instantly-ai/instantly-starter-kit), and [V2 guide](https://help.instantly.ai/en/articles/10432807-api-v2).
