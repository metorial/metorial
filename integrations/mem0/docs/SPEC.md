# Mem0 integration

This integration connects to the hosted Mem0 Platform at `https://api.mem0.ai`.
It uses API key authentication with `Authorization: Token <api-key>` and validates
keys through `GET /v1/ping/`, which identifies the key owner, organization, and
project. The key determines the project used by memory operations; setup does
not require resource IDs. Old stored scope settings are accepted only when they
match the key's current organization and project. A mismatch requires
reconnecting with an API key for the intended project.

## Supported operations

| Tool | Hosted API | Behavior |
| --- | --- | --- |
| `get_current_user` | `GET /v1/ping/` | Validate the key and inspect its identity/project. |
| `add_memory` | `POST /v3/memories/add/` | Store conversation facts asynchronously, or store messages verbatim with `infer: false`. Supports graph extraction, per-request instructions, metadata, and expiration. |
| `get_event` | `GET /v1/event/{event_id}/` | Inspect processing status, mutation results, and failures. |
| `get_memory` | `GET /v1/memories/{memory_id}/` and optional `/history/` | Read memory content and history, preserving session identifiers. |
| `list_memories` | `POST /v3/memories/` | List one page with entity and metadata filters, provider totals, and pagination indicators. |
| `search_memories` | `POST /v3/memories/search/` | Hybrid search with entity/metadata filters and optional reranking. |
| `update_memory` | `PUT /v1/memories/{memory_id}/` | Change text, metadata, or expiration; null clears expiration. |
| `delete_memories` | `DELETE /v1/memories/{memory_id}/` or `/v1/memories/` | Delete one memory synchronously or queue explicitly scoped bulk deletion. |
| `list_entities` | `GET /v1/entities/` | Page through users, agents, apps, and runs; type filtering applies to each page. |
| `delete_entity` | `DELETE /v2/entities/{entity_type}/{entity_id}/` | Queue deletion of an entity by its name and its associated memories. |

## Input and output contracts

- Adding, listing, and searching require an entity scope: user, agent, app, or run.
  Convenience scope inputs are merged with advanced filters using `AND`.
- Entity filters accept bare IDs, explicit `eq`, or `in` lists. Nest `OR` inside
  `AND` instead of placing both operators at the same level; the hosted API can
  otherwise discard the `OR` branch, so these ambiguous filters are rejected.
- Listing uses query parameters `page` and `page_size` (1-200 memories per page).
  Preserve `totalMemories`, `next`, and `previous` when advancing pages.
- Search scores use the range 0-1. `topK` accepts 1-1000 and `threshold` defaults
  to the provider's 0.1. Requested search fields always retain ID and content.
- Inferred additions return processing status and `eventId`; `events` may remain
  empty until processing completes. Poll `get_event` until `SUCCEEDED` or `FAILED`.
- Bulk memory and entity deletion report `deleted: false` while pending. Check
  `eventId` with `get_event` before claiming completion. A single memory deletion
  completes synchronously.
- Bulk deletion requires explicit entity IDs and rejects wildcard scopes. A
  single memory ID cannot be combined with bulk scope filters.
- Entity list `entityId` is an internal ID; pass its `name` as `delete_entity`
  input `entityId`, consistent with the hosted SDK.
- The hosted V3 API does not document `memory_type`. The retained legacy
  `memoryType` field returns a clear unsupported-option error when supplied.

## Scope

Only the operations listed above are exposed. Exports, organization/project
administration, feedback, and user profile generation are outside this
integration's current tool surface.

## Official sources

- [Hosted API overview](https://docs.mem0.ai/api-reference)
- [Add memories](https://docs.mem0.ai/api-reference/memory/add-memories)
- [List memories](https://docs.mem0.ai/api-reference/memory/get-memories)
- [Search memories](https://docs.mem0.ai/api-reference/memory/search-memories)
- [Memory filters](https://docs.mem0.ai/platform/features/v2-memory-filters)
- [Official API schema](https://github.com/mem0ai/mem0/blob/main/docs/openapi.json)
- [Official TypeScript client](https://github.com/mem0ai/mem0/blob/main/mem0-ts/src/client/mem0.ts)
