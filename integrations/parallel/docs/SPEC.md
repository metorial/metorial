# Parallel API Specification

Parallel provides web search, URL extraction, asynchronous research, web-grounded chat, entity discovery, and continuous web monitoring.

## Authentication

Create an API key at [Parallel Developer Platform](https://platform.parallel.ai). Requests use `x-api-key`; Chat Completions additionally uses `Authorization: Bearer`. This integration does not use the separate device OAuth authentication required by the Account API.

## Tools

| Tool key | Provider operation | Result |
| --- | --- | --- |
| `web_search` | `POST /v1beta/search` | Ranked URLs, excerpts, and warning messages |
| `extract_content` | `POST /v1beta/extract` | Original excerpts/full markdown, URL errors, and warnings |
| `deep_research` | `POST /v1/tasks/runs` | Run ID, interaction ID, processor, status, and metadata |
| `get_task_run` | `GET /v1/tasks/runs/{id}` and optionally `/result` | Status and the original provider output with research basis |
| `chat_completion` | `POST /v1beta/chat/completions` | Response content, token usage, citations, and interaction ID when available |
| `ingest_findall` | `POST /v1beta/findall/ingest` | Entity type and generated match conditions |
| `find_entities` | `POST /v1beta/findall/runs` | Run ID for a discovery objective, criteria, generator, and match limit |
| `get_findall_results` | `GET /v1beta/findall/runs/{id}` and optionally `/result` | Status, metrics, normalized condition decisions, original field values, and evidence |
| `enrich_findall` | `POST /v1beta/findall/runs/{id}/enrich` | Confirmation that structured enrichment was accepted |
| `cancel_findall` | `POST /v1beta/findall/runs/{id}/cancel` | Confirmation that cancellation was accepted |
| `extend_findall` | `POST /v1beta/findall/runs/{id}/extend` | Updated search schema and total match limit |
| `get_findall_schema` | `GET /v1beta/findall/runs/{id}/schema` | Objective, conditions, generator, match limit, and configured enrichments |
| `create_monitor` | `POST /v1alpha/monitors` | Monitor ID, query, frequency, status, and metadata |
| `manage_monitor` | Alpha monitor retrieve/list/update/delete/events | Monitor details, all-status monitor list, or detected/execution events |

## Research and extraction

Search requires a non-empty objective or keyword query. Search and Extract retain the documented legacy endpoints and their existing request fields. They must not be migrated by substituting `/v1` in the URL: the current GA request envelopes differ.

Task and enrichment JSON schemas are sent as `{ "type": "json", "json_schema": ... }`. Callers may provide a bare JSON schema or an existing provider envelope. Task output schema `"auto"` selects automatic structured output; other strings describe text output. Supplying only an input schema uses an automatic output schema. The task result retains the original provider `output` value, with its nested research basis also exposed through `basis`.

Chat accepts bare JSON schemas or OpenAI `response_format` envelopes. Its interaction ID is an empty string when the provider does not return one. Null or missing confidence levels are represented as `"unknown"`, preserving the existing string output type.

Extract's legacy `fullContent.maxCharsTotal` input is retained for compatibility. The current provider schema documents only `max_chars_per_result` for full content, so total-length enforcement is not guaranteed.

## FindAll lifecycle

Use Ingest FindAll Query to generate criteria, then Find Entities to create a run. Match limits must be whole numbers from 5 to 1000. Preview, base, core, and pro generators remain available. Candidate snapshots can be fetched while a run is active through `includePartialResults`; `includeResults` retrieves available candidates once a run has stopped, including after cancellation.

Condition evaluations preserve the existing `{ value, isMatched }` output shape. The optional `rawOutput` retains the complete provider output, including enrichment fields and values that are not boolean conditions. Current docs show both structured decisions (`value`/`is_matched`) and older yes/no examples; both are supported without discarding the original values.

Extend adds an incremental number of matches. Preview runs cannot be extended, the total limit cannot exceed 1000, and completed runs can resume only when their termination reason was `match_limit_met`. Cancel stops additional work but does not reverse prior charges; persisted candidates remain available.

Enrichments accept current Task API processor tiers. Existing `advanced` and `auto` enum values remain available to preserve callers, but current documentation does not guarantee these legacy tiers; they are sent unchanged rather than silently selecting another processor.

## Monitor compatibility

Alpha endpoints remain reachable and documented. Their output string, status spelling, and extracted real-world event dates differ from GA, so these existing tools retain Alpha behavior. Listing uses the documented unpaginated, all-status collection endpoint. Completion and error entries preserve their execution identifiers and messages; detected events preserve both the original `output` and optional structured `result`.

The separate GA Monitor API supports additional features such as snapshot monitors and processor selection. Those features are not exposed by these Alpha-compatible tools.

## Official references

- [Current API schema](https://docs.parallel.ai/docs-latest-openapi.json)
- [Legacy API schema](https://docs.parallel.ai/docs-legacy-openapi.json)
- [Task specification](https://docs.parallel.ai/task-api/guides/specify-a-task)
- [FindAll candidates](https://docs.parallel.ai/findall-api/core-concepts/findall-candidates)
- [FindAll migration](https://docs.parallel.ai/findall-api/findall-migration-guide)
- [FindAll enrichments](https://docs.parallel.ai/findall-api/features/findall-enrich)
- [Extend FindAll runs](https://docs.parallel.ai/findall-api/features/findall-extend)
- [Cancel FindAll runs](https://docs.parallel.ai/findall-api/features/findall-cancel)
- [Monitor migration and compatibility](https://docs.parallel.ai/monitor-api/monitor-migration-guide)
- [Account API authentication](https://docs.parallel.ai/integrations/account-api)
