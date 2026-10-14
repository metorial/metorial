# Humanitix

Retrieve events, orders, tickets, and account tags from Humanitix. Discover event and event-date IDs, filter orders and tickets, inspect an individual ticket, and check tickets in or out.

Connect with the public API key from **Account > Advanced > Public API Key**. Requests use the `x-api-key` header. Generating a new key invalidates the previous key.

List tools fetch one page at a time. Omitted `page` starts at 1; `pageSize` supports 1–100 results. Use the returned `totalResults`, `page`, and `pageSize` to request further pages. `totalResults` represents the provider's `total` count.

Call `list_events` before tools that require `eventId`; event `dates` supply IDs for optional `eventDateId` filters. Use `list_orders` for internal order IDs, `list_tickets` for ticket IDs, and `list_tags` for tag IDs. Buyer-facing order references are different from internal order IDs.

The integration exposes `list_events`, `get_event`, `list_orders`, `get_order`, `list_tickets`, `get_ticket`, `list_tags`, `get_tag`, and `manage_ticket_check_in`. Ticket scanning requires a valid ticket and permission to manage its event.

See the [Humanitix API documentation](https://api.humanitix.com/v1/documentation/) and [API key guide](https://help.humanitix.com/en/articles/8888275-public-api-documentation).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
