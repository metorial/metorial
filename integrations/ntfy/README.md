# Ntfy

Send and poll push notifications using ntfy topics on ntfy.sh or a self-hosted server. Publish messages with titles, priorities, tags, Markdown, file URLs, and action buttons. Schedule notifications with an explicit timezone, update or dismiss notification sequences, forward messages to email or supported phone calls, and inspect the connected account and usage limits.

The four tools are `publish_message`, `poll_messages`, `update_notification`, and `get_current_user`. Anonymous, Bearer-token, and Basic authentication are supported. Configure the server URL for a self-hosted instance.

To update the same notification repeatedly, publish with a stable `sequenceId` and pass it as `messageId` to `update_notification`. If no sequence ID was supplied, retain the first published message ID instead. Later update responses have their own unique message IDs; continue using the original sequence identifier.

Polling accepts one topic or comma-separated topics. Use `since: "latest"` for the most recent message, or the previous message ID for incremental polling. A `truncated` response means the server omitted older cached messages. File details in polling results describe the provider's original file URLs; uploaded files expire according to server settings.

Email forwarding, calls, and scheduling limits depend on server configuration and the connected account. Scheduled delivery requires caching. Current-user results expose account and quota metadata; account credentials are excluded.

## Official documentation

- [Publishing and notification lifecycle](https://docs.ntfy.sh/publish/)
- [Polling, filters, and replay limits](https://docs.ntfy.sh/subscribe/api/)
- [Authentication, access control, and configuration](https://docs.ntfy.sh/config/)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
