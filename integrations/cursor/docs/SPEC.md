# Cursor API coverage

Official references, checked 2026-10-04:

- [API overview and authentication](https://cursor.com/docs/api)
- [Cloud Agents v1](https://cursor.com/docs/cloud-agent/api/endpoints)
- [Legacy Cloud Agents v0](https://cursor.com/docs/cloud-agent/api/v0)
- [Team Admin API](https://cursor.com/docs/account/teams/admin-api)

## Authentication

API keys use HTTP Basic authentication with the key as the username and an empty password. Cloud Agents also accept Bearer authentication. User and service-account keys authenticate cloud workflows; Enterprise team administration requires `admin:*` permissions. `get_api_key_info` identifies the key, with owner email and numeric user ID only when it is user-scoped.

## Cloud agents and runs

The current v1 API models a durable agent and individual prompt runs. `create_cloud_agent` returns both IDs. `list_cloud_agents` returns identity summaries and continuation cursors; `get_cloud_agent` returns repository settings and latest run ID. `create_agent_run`, `list_agent_runs`, `get_agent_run`, and `cancel_agent_run` expose prompt execution and final replies. Only one run can be active per agent. A cancelled run is terminal; another prompt creates a new run. `manage_cloud_agent` archives, unarchives, or permanently deletes an agent.

Agent lifecycle states are ACTIVE, IDLE, and ARCHIVED. Execution states live on runs, including CREATING, RUNNING, FINISHED, ERROR, CANCELLED, and EXPIRED. Git metadata is shared agent state and is not an immutable per-run history.

Creation supports zero to 20 connected repositories. Repository URLs remain required on entries that include pull or merge request URLs. Named cloud environments cannot be combined with explicit repositories. My Machines and repo-bound pools accept one repository; multiple self-hosted repositories require a named any-repo pool. Work on the current branch is an explicit option and can push directly to it. Images use either a URL or base64 bytes with a MIME type, at most five images and 15 MB per image.

`list_models` preserves its model-ID array and adds current model parameter/variant details. `list_repositories` remains GitHub-only, with strict provider rate limits of one request per minute and 30 per hour. Other connected source providers are supported by creation but are not listed by repository discovery.

The existing `launch_agent`, `get_agent`, `list_agents`, `follow_up_agent`, `stop_agent`, `delete_agent`, and `get_agent_conversation` retain their v0 contracts and officially documented endpoints. v0 status combines agent and run state; it must not be interpreted as durable v1 lifecycle state.

## Files

`list_cloud_agent_artifacts` and `download_cloud_artifact` use v1 relative paths under `artifacts/`. The older `list_agent_artifacts` and `download_artifact` retain absolute v0 paths. Downloads produce a downloadable file with renewable 15-minute URLs. The older download tool retains its public URL metadata for compatibility.

## Enterprise administration

`list_team_members` returns encoded member IDs. `get_team_spending` returns the provider's current `teamMemberSpend` envelope, encoded user IDs, decimal-cent spending totals, effective limits, and billing-cycle start in epoch milliseconds. `get_team_members` and `get_team_spend` retain numeric-ID contracts with deprecation guidance; incompatible current responses report a clear error instead of manufacturing numeric IDs.

`get_daily_usage` accepts an ordered date range of at most 30 days. Pagination requires both page and pageSize and includes inactive members. The response exposes pagination when supplied. `get_usage_events` accepts optional inclusive date bounds, numeric analytics IDs or email, cloud run, automation, service-account and hosting filters, and pagination. Its response reads the current usageEvents envelope and omits unreported token counts. Numeric analytics IDs are distinct from encoded team member IDs.

`get_audit_logs` exposes event metadata and pagination. `set_user_spend_limit` accepts whole-dollar nonnegative limits or null and reports provider error outcomes as errors. `remove_team_member` requires exactly one email or encoded ID. Repository blocklist writes replace the supplied repositories' patterns; other entries are untouched.

## Deliberate limits

No editor-internal chat, completion, or local VS Code endpoints are exposed. Cloud Agents are agent workflows rather than a general chat-completion API. Worker orchestration, Origin beta APIs, specialist analytics, directory/billing groups, and preview bulk administration are outside this refresh. No triggers are registered.
