# Nusii Proposals specification

The integration provides 26 tools for Nusii API v2. The [official API reference](https://developer.nusii.com/) and [OpenAPI contract](https://developer.nusii.com/openapi/v2.yaml) describe provider behavior.

## Authentication

Connect using an API token from Settings > API, or OAuth with the `read` and `write` scopes. OAuth uses authorization-code exchange with S256 PKCE, Bearer requests, and refresh-token rotation. API tokens use `Authorization: Token token=...`. Account identity is resolved from `/account/me`; setup needs no account or workspace ID.

## Tools

- Clients: `list_clients`, `get_client`, `create_client`, `update_client`, `delete_client`. Listing supports whole-word search and exact email filters. Nusii requires a first name when creating a client.
- Proposals: `list_proposals`, `get_proposal`, `create_proposal`, `update_proposal`, `delete_proposal`, `archive_proposal`, `send_proposal`. Discover sender and preparer IDs with `list_users`; discover themes with `get_account`.
- Content: `list_sections`, `get_section`, `create_section`, `update_section`, `delete_section`. Unfiltered listing returns reusable sections. Supply `proposalId` or `templateId` for document sections. Complete source responses preserve included line items.
- Pricing: `list_line_items`, `create_line_item`, `update_line_item`, `delete_line_item`. Amounts use cents. Existing fixed, recurring, and per-unit pricing options are retained. Use units such as `unit`, `hour`, or `item` and recurring intervals such as `monthly`, `yearly`, or `trimester`.
- Templates: `list_templates`, `get_template`. List requests support pagination; `publicTemplates: true` selects public templates instead of account templates. Read template content with `list_sections`.
- Activity and identity: `list_activities`, `get_account`, `list_users`. `get_account` returns the first user page and themes; `list_users` exposes further pages.

Sending requires one email or one to ten recipient records. Existing recipient precedence is retained: Nusii uses the recipient array when both forms are supplied. Accepted or signed proposals may be locked against edits. Provider validation, permission, plan-limit, and rate-limit failures are reported with their available details.

## Response handling and compatibility

Existing tool keys, input scalar types, optionality, and enum values are retained. Optional `raw` results preserve provider metadata and null values. Summary fields that the relevant provider response omits or returns null are omitted; they do not become invented values. Other missing required response data raises a clear error.

The legacy account-wide line-item request remains available for compatibility, but its route and response are absent from the current public reference. Section-specific line-item listing is documented and nonpaginated. The integration exposes no webhook triggers and no PDF export/download endpoint.
