# Salesflare

Discover and maintain CRM accounts, contacts, sales opportunities, tasks, internal notes and tags. Read pipeline/stage, user, currency, workflow and custom-field metadata before using resource IDs or custom values.

Authentication uses a Salesflare API key from **Settings > API keys**. The API operates at `https://api.salesflare.com` and inherits the key owner's access. Current user/team discovery verifies the connection; saved token-only connections remain supported.

Lists use limits and offsets, with `count` describing the returned page. Internal note listing uses account and date bounds. Mutations may affect assigned users, workflow automation or linked records. Account deletion cascades to opportunities/tasks; tag deletion removes assignments. Upsert and duplicate-handling options should only be used after checking the intended target.

The current public API does not document changing opportunity currency or deleting calls. Choose currency at opportunity creation. Call logging creates retained activity; cancellation/deletion is not promised. Meeting logging has documented meeting read/delete endpoints. Note mentions and task reminders can notify team members.

Contact deletion removes the active CRM contact but may retain history and permit restoration. It does not promise permanent erasure. Date filters and activity timestamps must contain valid ISO 8601 calendar dates. Credential values and credential-bearing metadata are omitted from returned records.

API reference: [Salesflare API documentation](https://api.salesflare.com/docs) and [OpenAPI specification](https://api.salesflare.com/openapi.json).
