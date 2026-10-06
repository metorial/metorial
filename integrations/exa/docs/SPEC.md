# Exa API contract

Authentication uses a printable API key in `x-api-key`. The fixed API origin is `https://api.exa.ai`; Websets use `/websets/v0`, research uses `/research/v1`, and team information uses `/v0/teams/me`. Team information is native team context, not human identity. Available product access, credits and rate limits depend on the key and plan.

| Tools | Native contract |
| --- | --- |
| `web_search`, `get_contents`, `find_similar`, `answer_question` | Search/content/similarity/answer endpoints; results preserve missing titles and IDs. Contents accepts URLs or temporary IDs and exposes native per-document status. These reads can consume credits. |
| `create_research`, `get_research_status` | Official SDK research compatibility routes; all three retained models. Explicit default is `exa-research-fast`; timestamps are Unix milliseconds. Creation is a persistent, billable action. |
| `create_webset`, `get_webset`, `list_websets`, `update_webset`, `delete_webset`, `cancel_webset` | Native Webset object and exact receipts. Creation uses an entity object; custom entities require description. Update is POST with title/metadata, not PATCH. Reads accept documented external IDs; dependent resources require native parent IDs. |
| `list_webset_items`, `get_webset_item`, `delete_webset_item` | Native parent/child IDs, `properties.url`, criterion evaluations and nullable enrichment arrays. Additive `enrichmentResults` preserves the native data; the historical map uses exact enrichment IDs. Native item listing supports sourceId, not the retained status filter. |
| `create_enrichment`, `update_enrichment`, `delete_enrichment` | Native description/format/options and exact parent receipts. Deletion cancels running work and removes existing results; it does not undo cost or history. |
| `create_monitor`, `delete_monitor` | Root `/websets/v0/monitors`; search behavior requires config/count. Five-field Unix cadence must run at most daily. The adapter accepts fixed minute/hour schedules; more complex cadence requires direct native validation. The historical refresh enum is retained but refused. Deletion reads exact parent ownership before DELETE. |
| `export_webset`, `get_export_status` | Historical `/websets/v0/websets/{id}/exports` compatibility routes, unverified in current public API/SDK. Validated legacy status metadata only; no current availability, downloadable file or renewal guarantee. |
| `get_team_info` | Native team ID/name, active/queued concurrency, nullable limits. |

List pages preserve native `hasMore` and `nextCursor`; missing or repeated continuation cursors are refused. No guessed total, page completion or absence proof is added. Responses are bounded locally to 16 MiB; private independent reads use a 4 MiB streaming bound. Inputs and responses screen known key reflections, including bounded encoded variants; this is not a universal secret guarantee or a guarantee that shared internal HTTP traces discard encoded data.

Search supports current modes including instant, deep-lite and deep-reasoning while preserving neural compatibility from the official SDK. Company/people searches reject unsupported publication-date and excludeDomains filters. Legacy crawl-date filters remain accepted but are deprecated and ignored by the provider. Top-level maxAgeHours maps into content freshness settings.

No triggers, imports, webhooks, account administration or new export APIs are exposed. Mutation receipts validate identity and parent but do not provide compare-and-swap, complete billing reconciliation, or reversal of external effects. The private suite therefore gates paid queries, retained jobs, mutations and legacy exports before effects unless separately approved complete lifecycle observers become available.

Official sources: [current OpenAPI](https://exa.ai/docs/exa-spec.json), [team context](https://exa.ai/docs/websets/api/teams/get-team-info), [Webset creation](https://exa.ai/docs/websets/api/websets/create-a-webset), [enrichment creation](https://exa.ai/docs/websets/api/websets/enrichments/create-an-enrichment), [official JavaScript SDK](https://github.com/exa-labs/exa-js).
