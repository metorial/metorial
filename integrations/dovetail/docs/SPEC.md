# Dovetail Integration

## Authentication

Use a personal API token created in Settings → Account → Personal API keys. The token is sent as `Authorization: Bearer <token>` to `https://dovetail.com/api/v1`. The authorization guide documents a 30-day token lifetime; generate a new token when it expires. `get_token_info` verifies the token and reports its workspace subdomain. The provider's OAuth guide currently marks OAuth as coming soon.

## Research workflows

- List, create, get, rename, and delete projects. Use `list_projects` to discover project IDs and `browse_folders` to discover folder IDs.
- List and manage research data and legacy notes. Creating either requires a project. The data endpoints are the recommended resource name; note IDs refer to the same underlying research entries.
- Read metadata with `get_data`, `get_note`, `get_doc`, or `get_insight`. Request `exportFormat` to receive full content as a downloadable HTML or Markdown file. Metadata endpoints do not include the content body.
- Create, list, update metadata, and delete docs and retained legacy insights. Create a doc in either a project or a folder, never both. Initial content accepts HTML, Markdown, or plain text through `contentType`; existing content cannot be patched through these metadata APIs. Publishing and contributors are managed in the Dovetail app.
- List and retrieve highlights and tags. Highlight tags include stable IDs. Counts and update timestamps absent from provider metadata remain optional.
- List, create, and update research contacts. Creation requires both name and email. Contact email is returned from custom fields when available.
- List and manage feedback channels and topics, and add feedback data points.
- Browse folders and their immediate contents. Omit `parentFolderId` for all folders, or set it to null for root folders.
- Import publicly downloadable files. Every import requires a title; notes and data also require a project. Audio/video processing happens asynchronously in Dovetail. `get_file` retrieves processing metadata.
- Perform full-text keyword search across workspace content and generate AI summaries from selected source IDs.

## Pagination and compatibility

List tools expose the provider's `has_more` and `next_cursor` where available. Follow `nextCursor` until `hasMore` is false. Legacy personal docs/insights listings remain available and support pagination.

`list_notes` title filtering uses the equivalent current data list API. Content filtering uses the documented notes filter in Magic Search and emits an opaque `notes-search:` cursor; omit `sort` for content search. Other note listings use provider cursors. String-valued custom-field outputs preserve compatibility by representing boolean, numeric, and array values as JSON strings.

Existing public keys, input scalar types, and operation enums are retained. The existing `exportedContent` fields retain the complete provider export response for compatibility when `exportFormat` is supplied. A downloadable HTML or Markdown file is also prepared independently. The new `get_data` tool exposes only metadata and downloadable exports.

## Official references

- [Authorization](https://developers.dovetail.com/docs/authorization)
- [API introduction](https://developers.dovetail.com/docs/introduction)
- [Endpoint index](https://developers.dovetail.com/llms.txt)
- [Data](https://developers.dovetail.com/reference/get_v1-data)
- [Docs](https://developers.dovetail.com/reference/get_v1-docs)
- [Magic Search](https://developers.dovetail.com/reference/post_v1-search)
