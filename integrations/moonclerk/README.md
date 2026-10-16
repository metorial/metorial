# <img src="logo.png" height="20"> MoonClerk

Retrieve payment, customer, and form data from MoonClerk's Stripe-based payment processing platform. Read payment transactions filtered by form, date range, customer, or status (successful, refunded, failed). Read customer and subscription (plan) data filtered by form, checkout date, next payment date, or status (active, canceled, expired, past_due, pending, unpaid). List and retrieve payment form configurations. The API is read-only — no creation, modification, or deletion of records is supported.

Generate an API key in [MoonClerk settings](https://app.moonclerk.com/settings/api-key).
All three list tools accept optional `count` (1–100) and `offset` values; the API
returns 10 records by default. Use `list_forms` to discover form IDs, then filter
payments or customers by the selected form.

[Official API reference](https://github.com/moonclerk/developer/blob/main/api/README.md)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
