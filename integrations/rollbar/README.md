# Rollbar

Find and manage error items, inspect individual occurrences, and report server-side messages. Track reported deploys, inspect project metrics and versions, and run RQL queries with follow-up status, result and cancellation operations. Account tools manage projects, teams, memberships, invitations and project access tokens. Project tools manage service links and webhook, Slack, PagerDuty and email notification rules.

Authenticate with a project or account access token. Read operations require `read`; management operations require the documented `write` scope. Account tokens also require a `projectId` for project-scoped tools. Occurrence and deploy reporting use a project token with `post_server_item` scope; configure a separate `postServerToken` alongside a read/write token when both capabilities are needed. The ingestion token determines the reported project. Encrypted project token secrets are available only when created; use their public identifiers for later rate-limit updates and deletion.

Occurrence ingestion and deletion are asynchronous. An accepted ingestion UUID is used by `get_item` after indexing and is distinct from the numeric ID used by `get_occurrence` and `delete_occurrence`. Deletion does not refund quota. RQL requires the account’s Analyze entitlement and completed queries/results expire after seven days; historical job records remain. Environment filtering for deploy history applies to each requested page; follow `nextPage` even if a filtered page is empty. Version details require an environment; version item lists also require an explicit new, repeated, reactivated or resolved event.

## License

This integration is licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
