# AgentMail API audit — 2026-10-15

Official source: [documentation index](https://docs.agentmail.to/llms.txt). The v0 API uses bearer API-key authentication. The integration retains the existing US base URL and optional pod setting; it does not add alternative regional or payment authentication flows.

All 25 prior public tools were checked against the endpoint references listed in the refresh report at `docs/exec-plans/active/tier-d-e-refresh/reports/agent-mail.md` in the parent repository. The package now exposes 33 public tools and a reserved file-link renewal action. `docs/SPEC.md` describes the supported surface.

## Findings addressed

- The configured pod ID was ignored. Inbox CRUD, domain, webhook, and allow/block list requests now select the documented pod routes. Inbox-level message, draft, and thread routes stay at their documented paths.
- Domain verification has no response object; read the domain after requesting verification. Domain list items omit status; fetch domain details to preserve the existing required status output.
- Draft PATCH accepts incremental label and attachment fields, not the create payload. Existing replacement inputs now translate to add/remove requests. Reply/forward draft creation, client IDs, cancellation of scheduled sends, and draft retrieval are available.
- Reply-all's dedicated endpoint does not accept explicit To/CC/BCC overrides. The reply endpoint accepts both `reply_all` and recipient fields, so it now handles both reply modes.
- Draft list summaries omit creation time. List results retrieve detail records in groups of at most five and use each detail response's documented `created_at` to preserve the existing creation-time output. List order, count, cursor, and other summary fields remain intact.
- Thread retrieval is paginated. Optional pagination inputs and cursor/count outputs expose older pages without changing the existing required thread fields.
- Webhook PATCH uses `add_*` and `remove_*` filters and does not accept a replacement URL. Pod webhook requests cannot modify pod filters. A read-only discovery tool supports updates and cleanup.
- AgentMail attachments and raw-message downloads return signed URLs with expiry timestamps. Downloads provide renewable file access while preserving the previous attachment output contract. A missing original filename uses the attachment identifier as a display/download name; it is not represented as an original filename supplied by AgentMail.
- Shared HTTP/error helpers convert validation and upstream failures into structured service errors, preserving provider response bodies and error codes. Query arrays use repeatable parameter names, and path identifiers are URL encoded.
- Idempotency keys are HTTP headers on sends, replies, forwards, and draft sends, with a documented 24-hour retention period. Optional open tracking requires HTML and a custom tracking-enabled domain.

## Scope decisions

The official API index does not expose a current-user, profile, self, or organization identity endpoint suitable for a connection identity tool. AgentID app accounts are external app accounts, not the current AgentMail principal. No identity tool fabricates one from inbox, pod, or API-key lists.

Calendar, Agent Drive, AgentID, API-key administration, metrics, Agent Armor overrides, batch operations, and automatic event ingestion are separate or specialized workflows. This refresh focuses on ordinary email operations and existing resource management. No normalized chat adapter or event trigger was added.

Validation was local and static. No live API requests, E2E suites, or tool-use evals were run. The parent refresh report retains exact build/schema/lint commands and evidence paths.
