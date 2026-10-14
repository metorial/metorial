# Helpwise

Work with shared inboxes, contacts, conversations, messages, and tags. Discover inboxes, read the connected user, close conversations, and apply or remove conversation tags.

Connect with an API key and API secret from [Helpwise API settings](https://app.helpwise.io/settings/api). The integration uses the documented V1 API for contacts, conversation retrieval and actions, and tags; documented V0 calls provide inbox discovery, user discovery, email sending, email listing, and note creation.

For conversations, provide `mailboxId` from `list_mailboxes` and use `pageToken` from the response for subsequent pages. Contacts use `offset`; the existing `page` input translates to an offset using `limit` (20 when omitted).

Some existing operations retain legacy routes whose availability is not established by the current public documentation: mailbox creation/update/deletion, team listing, contact deletion, note listing/deletion and creation without `mailboxId`, tag update/deletion, templates, webhook management, and conversation searches or numbered pages. Email BCC and replying via `conversationId` use the previous route, whose contract is also unverified. Check these operations against your account before relying on them.

See the [official API documentation](https://helpwise.io/developers) and [API notes](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
