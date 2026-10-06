# Mezmo Log Analysis

Authentication uses `Authorization: Token` at `https://api.mezmo.com`. Ingestion uses a separate `apikey` at `https://logs.mezmo.com/logs/ingest`. IAM access tokens do not authenticate ingestion.

The supported tools cover log ingestion, paginated search, streaming JSONL downloads, views, preset alerts, boards, exclusion rules, ingestion suspension/resumption, usage and singleton archiving configuration. The board route is `/v1/config/board`. Ingestion status returns `isIngesting`. Suspension requires initialization and confirmation before readback.

Search uses `/v2/export` and retains the provider cursor. Keep range, filters, ordering and size identical across pages. Downloads use `/v1/export` streaming mode, with a provider plan limit. No emailed export branch is exposed.

Usage dimension defaults preserve V1 percentage-of-lines reports. Account usage and optional bytes dimension reports use V2 ISO date queries; public inputs retain Unix seconds. Responses include explicit metric units. Configuration lists include returnedCount without inventing a provider total.

Archiving changes the account-wide storage destination. Only a definite missing configuration selects creation; auth, validation and transient failures remain failures. Storage and alert integration credentials are never included in tool output. Exclusions can discard matching logs, and alerts can send external notifications. A partial-success HTTP 207 ingestion response is an error: some lines may already be stored, so inspect the submitted batch before retrying.

Legacy trigger registration has been removed. Organization membership, API-key creation, categories and telemetry pipelines are outside the tool surface.

Sources: [API reference](https://docs.mezmo.com/log-analysis-api), [exclusion guide](https://docs.mezmo.com/docs/excluding-log-lines), [service status](https://status.mezmo.com/).
