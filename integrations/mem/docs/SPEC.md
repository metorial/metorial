# Mem V2 API capability map

Provider: Mem.ai, distinct from Mem0. Origin: `https://api.mem.ai/v2`; authentication: `Authorization: Bearer <API key>`. No OAuth, configured workspace ID, or documented user identity endpoint is assumed.

| Tools | Native contract |
| --- | --- |
| create_note / get_note / delete_note | POST /notes; GET or DELETE /notes/{UUID}. Bare 200 DTOs. Reads include current version, trash timestamp and native media associations. |
| list_notes / search_notes | GET /notes with limit 1–100 and opaque cursor; POST /notes/search with query, limit 1–50, zero offset and optional snapshot UUID. Contains flags use OR; search snapshot capped at 100. |
| update_note | PATCH /notes/{UUID}, full markdown body and exact current version. Local current-state preflight preserves native concurrency checks; no overwrite retry. |
| create_collection / get_collection / delete_collection | POST /collections; GET or DELETE /collections/{UUID}. Create-only optional UUID; read includes note_count. |
| list_collections / search_collections | GET /collections with cursor and limit 1–100; POST /collections/search with optional query and no cursor. |
| update_collection | PATCH /collections/{UUID}; omitted title/description preserved, explicit null description clears. |
| manage_collection_membership | PUT/DELETE /collections/{UUID}/notes/{UUID}; POST /collections/{source}/notes/{UUID}/move with target_collection_id. Receipt plus exact current note readback. |
| mem_it | POST /mem-it, 200 request_id only. Processing/completion and generated resources cannot be inferred from that receipt. |

Content bounds, UTC offsets, safe integers and exact UUID locators are validated locally. Create note content has both 200,000-character and UTF-8-byte bounds; collection title/description bounds are 1,000/10,000 characters and bytes. Native optional fields preserve omitted, false, empty string and explicit nullable distinctions. Empty collection search query remains supported; note search omission is retained in its historical schema with an actionable current-API refusal. Explicit empty note-search collection filters are refused locally to prevent accidental unfiltered access; omit the filter intentionally for full accessible search.

Current documentation: [authentication](https://docs.mem.ai/api-reference/overview/authentication), [changelog](https://docs.mem.ai/api-reference/overview/changelog), [note updates](https://docs.mem.ai/api-reference/notes/update-note), [note paging](https://docs.mem.ai/api-reference/notes/list-notes), [search snapshots](https://docs.mem.ai/api-reference/notes/search-notes), [collection move](https://docs.mem.ai/api-reference/collections/move-note), [Mem It](https://docs.mem.ai/api-reference/mem-it/mem-it), and [rate limits](https://docs.mem.ai/api-reference/overview/rate-limits).

Historical 11 tool keys and their input/output fields remain compatible; three tools are additive. There are no triggers or file-output tools. Private live verification requires an independently pinned key and synthetic sentinel note, explicit record access, isolated synthetic writes, and positive ownership before cleanup. Offline fixtures prove wiring and refusal behavior, not provider acceptance, atomic isolation or quota reversal.
