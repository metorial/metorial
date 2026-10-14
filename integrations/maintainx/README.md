# <img src="logo.svg" height="20"> MaintainX

Create, update, and track work orders and work requests. Manage assets, locations, and parts; record meter readings; create purchase orders and vendors. Discover organizations, users, teams, categories, and conversations, and send conversation messages.

Use a MaintainX REST API key. A key scoped to one organization is resolved during connection setup. For multi-organization keys, call `list_organizations` and pass the chosen `organizationId` to subsequent tools. Existing connections can continue to use their saved organization setting.

Costs are expressed in cents. The optional work-order type filter applies to each returned page, so keep following `nextCursor` even when a page has no matches. Non-OPEN status on creation, or status combined with other updates, requires a separate status request; a failure can leave the created or updated work order in place.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
