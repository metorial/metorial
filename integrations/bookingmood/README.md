# <img src="logo.png" height="20"> Bookingmood

Manage vacation rental bookings, rental units, contacts, calendar events, invoices, payments, refunds, coupons, tasks, reviews, and guest messages. Search availability before creating a booking, discover occupancy group IDs, and identify the organizations connected to your API key. Update reservation dates and status, maintain guest details, and configure rental-unit settings.

## Booking workflow

1. Call `list_organizations` to identify the connected account, `list_products` to choose a rental unit, and `list_capacity_groups` to discover occupancy group IDs.
2. Call `search_availability` with dates and guest counts to check the rental unit.
3. Call `create_booking` using the selected product and occupancy IDs. If a payment URL is returned, use it to complete payment.

Localized product names, product descriptions, and review content accept a language map such as `{ "default": "Holiday cottage", "nl-NL": "Vakantiehuis" }`. Plain text is sent as the default language value.

List tools support PostgREST filters, sorting, and pagination with at most 1000 results per request. Update tools require at least one field to change. A missing or inaccessible record is reported as an error rather than as a completed mutation.

API documentation: [Bookingmood API reference](https://www.bookingmood.com/en-GB/api-reference).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
