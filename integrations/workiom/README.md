# <img src="logo.jpeg" height="20"> Workiom

Create, read, update, and delete records in custom no-code business applications. Discover apps, retrieve list metadata, and query records with filters, sorting, and offset pagination. List, inspect, create, update, and delete webhook subscriptions for record creation and update events. Record field values are forwarded unchanged, including nested linked records, users, and file metadata.

Use `get_list_metadata` to discover field IDs before querying or writing records. Page through `query_records` with `maxResultCount` and `skipCount`; `totalCount` is included when Workiom supplies it. Use `list_webhook_subscriptions` and `get_webhook_subscription` to inspect a subscription before providing all of its properties to `update_webhook_subscription`.

API keys authenticate with `X-Api-Key`; username/password connections retain the existing token login flow. Reconnect when a password-issued token expires. No fixed expiry or automatic refresh is assumed. API-key validation continues to use the documented app listing endpoint. A current-user tool is not exposed because the session endpoint is documented in browser/JWT context and its API-key compatibility has not been established.

Provider references: [API guide](https://help.workiom.com/article/workiom-api-guide), [webhook subscriptions](https://help.workiom.com/article/workiom-webhooks), [session API examples](https://github.com/workiom/workiom-plugin/blob/main/skills/workiom-vibe-apps/SKILL.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
