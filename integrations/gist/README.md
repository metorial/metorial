# Gist

Manage contacts, conversations, marketing subscriptions, knowledge base content,
and commerce data in a Gist workspace with 32 tools. Identify the connected
workspace, import contacts and check batch progress, read paginated messages,
manage tags and forms, and sync stores, customers, products, carts, and orders.

Connect with OAuth or a workspace API key. OAuth tokens remain valid until the
app is uninstalled or deleted; Gist does not document a refresh-token flow.
Some API areas do not have separately documented OAuth scopes, so access remains
subject to the connected workspace's permissions.

Call `manage_store` with `action: "list"` before commerce operations. Commerce
customers, products, variants, and orders use the IDs from your source commerce
platform. Assignment needs an acting teammate from `list_teams`. Gist priority
values are `priority` and `not_priority`; use `contactTags` for store tagging.

Responses include the original provider data alongside compatibility summaries.
List tools return one page; follow the returned pagination metadata. Conversation
messages beyond the first page are available through `list_conversation_messages`.
No webhook triggers are registered.

See the [API reference](https://developers.getgist.com/api/) and
[integration specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
