# Sender

Manage subscribers, subscription statuses, and group memberships. Discover custom fields and automation workflows, create and inspect email campaign drafts, send transactional emails with templates and personalization, and retrieve campaign opens and clicks.

Use `list_fields` to find custom-field keys and `list_workflows` to discover active workflows before enrolling a subscriber. `get_campaign` reads back a campaign's content, audience IDs, and status.

Subscriber read tools return `subscriberKey`, the opaque ID accepted by subscriber lookup and update tools. The optional numeric `subscriberId` remains available for legacy numeric responses. Transactional file attachments use publicly accessible HTTPS URLs with a 25 MB per-file limit.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
