# Agent Mail

The integration provides 33 public email and resource-management tools using the documented AgentMail v0 REST API at `https://api.agentmail.to/v0`.

## Authentication and scope

Use a bearer API key created in the [AgentMail Console](https://console.agentmail.to). API keys may restrict access to particular pods, inboxes, labels, and operations. The optional pod configuration selects the documented pod routes for inbox, domain, webhook, and allow/block list management. Discover pod IDs with `list_pods`; email tools select their inbox through `inboxId`. The configuration is an operational scope, and API-key permissions enforce authorization.

## Tool capabilities

| Area | Tools |
| --- | --- |
| Inboxes | `create_inbox`, `list_inboxes`, `get_inbox`, `update_inbox`, `delete_inbox` |
| Messages | `send_email`, `reply_to_email`, `forward_email`, `list_messages`, `search_messages`, `get_message`, `update_message_labels`, `delete_message`, `get_raw_message` |
| Threads | `list_threads`, `search_threads`, `get_thread`, `update_thread_labels`, `delete_thread` |
| Drafts | `manage_draft`, `list_drafts`, `get_draft`, `delete_draft` |
| Files | `get_attachment` retrieves message or thread attachments |
| Domains | `manage_domain`, `list_domains`, `get_domain` |
| Pods | `manage_pod`, `list_pods` |
| Allow/block lists | `manage_list_entry`, `list_list_entries` |
| Webhooks | `manage_webhook`, `list_webhooks` |

## Behavior

- Lists retain AgentMail's page count and next-page cursor. `get_thread` returns one page of messages, ordered oldest to newest within the page; the first page contains the newest messages, and its cursor retrieves older pages. `messageCount` is the total thread size.
- Message and thread searches rank full-text matches by relevance and exclude spam, blocked, unauthenticated, and trashed mail. Search pages contain at most 100 items. Message lists also support sender, recipient, and subject substring filters.
- Replies retain threading and can combine `replyAll` with explicit recipients. Send, reply, forward, and draft-send operations accept an optional HTTP idempotency key; reuse it only to retry the same logical email within 24 hours.
- Listing drafts retrieves detail records to preserve each draft's creation timestamp, which summary records omit.
- Draft creation may omit recipients and may derive a reply or forward from a source message. Draft updates preserve omitted fields. `labels` and `attachments` replace their respective collections using documented incremental operations. `addLabels`/`removeLabels` are also available for incremental label changes on update or send. `clearSendAt` cancels scheduling on update. A reply target cannot be changed on an existing draft.
- Sending an attachment requires exactly one of base64 `content` or a provider-fetchable `url`. Downloads include a downloadable file. Signed links renew when needed. The existing `get_attachment` output retains its temporary URL for compatibility.
- Domain verification starts an asynchronous check and then reads the domain's current state. Listing domains retrieves detail records because list summaries omit verification status.
- Webhook event types are a full replacement when non-empty on update; an empty list leaves them unchanged. URL changes require creating a replacement webhook. Pod and inbox filter arrays are translated to documented add/remove operations. A pod webhook cannot be moved to another pod, and narrowing a webhook that covers its entire pod requires a replacement. Webhook URLs and signing-secret verification remain the caller's responsibility.
- Delete operations only report success after AgentMail accepts the delete request. Allow/block lists control email delivery policies rather than contact or mailing-list subscriptions.

## Official references

[API reference](https://docs.agentmail.to/api-reference), [permissions](https://docs.agentmail.to/permissions), [idempotency](https://docs.agentmail.to/idempotency), [messages](https://docs.agentmail.to/messages), [threads](https://docs.agentmail.to/threads), [drafts](https://docs.agentmail.to/drafts), [attachments](https://docs.agentmail.to/attachments), [pods](https://docs.agentmail.to/multi-tenancy), [error reference](https://docs.agentmail.to/errors).
