# Affinity API scope

The integration exposes 38 tools using the supported [Affinity V1 API](https://api-docs.affinity.co/). V2 has a separate versioned API and does not provide V1 feature parity. V1 IDs and write operations remain V1 operations; no V2 version header is applied to them.

## Authentication and permissions

Use an API key from Settings > Manage Apps. Requests use `Authorization: Bearer <key>`, which V1 supports alongside Basic authentication. The key owner's product permissions, list sharing, account API entitlement, IP allowlist and user/account quotas apply. Current-user discovery uses `/auth/whoami` and reports the authenticated user and tenant. No OAuth authorization flow is configured.

Current [V2 authentication](https://developer.affinity.co/pages/external-api-v2/authentication), [permissions](https://developer.affinity.co/pages/external-api-v2/permissions) and [versioning](https://developer.affinity.co/pages/external-api-v2/versioning) documentation describe a separate API. V2's current version is 2026-09-17; this integration retains the existing V1 contracts.

## Tools

| Capability | Operations |
| --- | --- |
| People, organizations and opportunities | Search, get, create, update and delete each entity |
| Lists and entries | Read lists and paginated entries; add people/organizations and remove entries |
| Fields and values | Read definitions and values; create, update and delete values; read tracked history |
| Notes and reminders | List, create, update and delete |
| Relationship intelligence | Read interaction metadata and relationship strength scores |
| Entity files | List metadata and download an existing file |
| Identity | Read the current user, tenant and grant type |

No list/field creation, file upload, contact merge, interaction write or event subscription tool is exposed.

## Request and response constraints

- IDs must be positive safe integers. Page sizes are 1–500, except interactions (1–100). Forward opaque page tokens with unchanged filters. A token can precede an empty final page.
- Person creation sends an empty email array when none is provided. Search results that omit association IDs are hydrated from entity detail reads; this consumes additional quota. Requested interaction dates are returned as optional metadata.
- Global organizations cannot be renamed or deleted. Association arrays in updates replace existing values, so supply the complete desired set.
- An opportunity belongs to one accessible opportunity list, resolved from its list entries. Legacy opportunity `listId` search filtering is applied to each returned page locally; an empty filtered page can still have a next token.
- Add-list-entry accepts people and organizations. Create an opportunity with `create_opportunity`. Removing an opportunity entry deletes the opportunity. List mutations can activate configured automations.
- Field values require exactly one entity/list-entry selector. Optional `fieldId` filtering is local. The field definition determines value shape. History actions are 0=create, 1=delete and 2=update. Legacy `entityId` requires `entityType`; explicit typed selectors are also available. For ascending history pagination, preserve the exact returned `changedAt` string and use it with `afterId`; timestamp precision is never rounded.
- Notes require at least one associated entity. Note deletion is limited by creator permissions.
- Interaction queries require one external entity, one type (0=meeting, 1=call, 2=chat, 3=email), and ordered timestamps no more than one year apart. Email results use the provider's email envelope; meeting/call titles and nested participants are mapped. A body or creation timestamp may be unavailable.
- Reminders use 0=one-time and 1=recurring. Recurring reminders require a reset type and positive reminder days. Reset types are 0=any interaction, 1=email and 2=meeting. Status is 0=completed, 1=active, 2=overdue; overdue is calculated, not writable. Completion writes use `is_completed`. Reminders may notify their owners.
- Relationship strength is an estimate generally recalculated daily; an unconnected pair can return no score.
- File downloads use the stable authenticated `/entity-files/download/{id}` endpoint, which obtains a fresh provider download redirect. The tool returns file metadata and a downloadable file without exposing signed storage URLs or file bytes inline. File deletion is not documented in the public V1 API, so the private suite uses an explicitly authorized pre-uploaded synthetic file rather than uploading files it cannot clean up.

Provider failures and invalid inputs produce safe service errors without raw contact payloads, API keys or transport objects.
