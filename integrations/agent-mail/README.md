# Agent Mail

Create and manage email inboxes, send and reply to emails, search message bodies and conversations, and organize mail with labels and drafts. Download email attachments or the original MIME email, manage custom domains and allow/block lists, and discover or manage email webhooks and multi-tenant pods.

Connect with an API key from the [AgentMail Console](https://console.agentmail.to). An optional pod ID scopes inbox, domain, webhook, and list management; use `list_pods` to discover available pods. Message, thread, and draft tools target an inbox explicitly.

Search results use AgentMail's relevance-ranked full-text search. `get_thread` returns a page of messages; follow its cursor to retrieve older pages. Send, reply, forward, and draft-send operations accept an optional idempotency key for safe retries within AgentMail's 24-hour window.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
