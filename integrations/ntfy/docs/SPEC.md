# Ntfy Integration Specification

Ntfy publishes push notifications to named topics on ntfy.sh or a self-hosted server. This integration exposes four tools and no triggers.

## Connection

`serverUrl` defaults to `https://ntfy.sh`. Use an HTTP or HTTPS base URL without embedded credentials, query parameters, or a fragment. Public topics can be used anonymously. Protected topics support Bearer access tokens or Basic username/password authentication. Basic authentication also supports an empty username with an access token as the password. Credentials are sent in the Authorization header; the provider controls topic read/write access.

## Tools

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `publish_message` | POST `/` with JSON | Publish a notification with supported content, priorities, tags, Markdown, URLs, actions, scheduling, email, and calls. Optional `sequenceId` groups later updates; `timezone` controls natural-language delivery times. Cache and Firebase flags use the provider's JSON fields. |
| `poll_messages` | GET `/<topics>/json?poll=1` | Read cached messages immediately, optionally including scheduled messages and lifecycle events. Filter by message ID, priority, tags, exact title, or exact message. Return whether older replayed messages were truncated. |
| `update_notification` | POST `/` with `sequence_id`; PUT `/<topic>/<sequence>/clear`; DELETE `/<topic>/<sequence>` | Update content, mark a sequence read/dismiss it, or delete it. The first message ID is also usable as a sequence ID. |
| `get_current_user` | GET `/v1/account` | Return the provider's username, role, tier, quotas, usage, and reserved topics when present. Anonymous sessions return the server's anonymous identity. Tokens and credential-bearing fields are excluded. |

Topic names use 1–64 letters, digits, underscores, or dashes. Polling accepts comma-separated topics. Priority remains a numeric input and is validated at runtime as a whole number from 1 through 5. View/HTTP action buttons require a URL; copy buttons require a value. Scheduling cannot be combined with disabled caching. Clear/delete requests reject fields intended only for content updates.

Polling defaults to the provider's complete cached replay. Pass the previous message ID as `since` for repeated polling; `latest` fetches the newest message. Malformed response lines fail the operation rather than silently producing partial results. Validated response mapping preserves supplied identifiers, timestamps, strings, numeric values, and file metadata. Optional provider nulls are omitted.

File URLs in notification metadata remain unchanged. This integration publishes external file references and reads notification metadata; it does not upload, download, generate, or renew files. Uploaded ntfy files can expire permanently, and external file availability is controlled by their host.

A publish acknowledgement confirms provider acceptance; device display and subscriber delivery depend on client connectivity and settings. Email, phone calls, cache retention, replay limits, and scheduling limits depend on server configuration or account tier. HTTP and transport failures use structured service errors with provider status/code/message when available. Requests time out after 30 seconds and are not automatically retried.

## Official sources

- [Publishing, JSON fields, authentication, and lifecycle](https://docs.ntfy.sh/publish/)
- [Polling and JSON event format](https://docs.ntfy.sh/subscribe/api/)
- [Server configuration and access control](https://docs.ntfy.sh/config/)
- [Official account route](https://github.com/binwiederhier/ntfy/blob/main/server/server.go)
- [Official account handler](https://github.com/binwiederhier/ntfy/blob/main/server/server_account.go)
- [Official account response types](https://github.com/binwiederhier/ntfy/blob/main/server/types.go)

The account endpoint is implemented in the official server and used by its web application; a standalone public account API reference was not found. Lifecycle and timezone features require a server version that supports the documented operations.
