# Esputnik

Manage contacts, discover custom fields, monitor bulk imports, browse segments, and change static segment membership. Send one-off email and SMS messages or prepared messages with personalized content, then check delivery using the returned request IDs. Generate events for automated workflows, submit and delete orders, manage email unsubscribes, and retrieve account identity and balance.

Authenticate with an API key generated in Settings → API. Requests use the [eSputnik API](https://docs.esputnik.com/reference/getting-started-with-your-api).

Bulk imports are asynchronous. Use `get_contact_import_status` with the `asyncSessionId` returned by `bulk_upsert_contacts`. Set `contactFields` and `customFieldsIDs` explicitly when updating only selected fields; fields omitted from the selected update list remain unchanged, while selected fields missing from a contact can be cleared. Call `get_additional_fields` to discover custom field IDs and valid values.

Segment lists and membership reads support pages of up to 500 entries. Call `list_segments` to discover segment IDs. Prepared-message sends accept up to 1,000 recipients; each queued recipient has its own request ID for `get_message_status`. Direct SMS sends require `text` and `from`; `templateId` uses a prepared SMS message and its configured sender unless `from` overrides it. A successful send queues the message and does not confirm delivery.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
