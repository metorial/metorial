# <img src="logo.png" height="20"> Quaderno

Work with Quaderno tax calculations, tax-ID validation, contacts, products, invoices, credit notes, expenses, estimates, recurring invoice templates, recorded transactions and payments, checkout sessions, jurisdiction catalog entries, and downloadable CSV reports.

Connect with an API key or Quaderno Connect OAuth. Production and sandbox are separate environments. New connections discover their account subdomain automatically; older connections can call `get_current_account` and configure the returned account name. An account name never includes a URL or dots. New OAuth connections request read and write access. Existing read-only grants remain usable for reads and cannot change account records. Refresh verifies that the connection still belongs to its stored account.

Supported operations use API version `20241028`. List tools return one cursor page. `page: 1` remains supported; later numeric pages require `createdBefore` or `nextPage`. Use a next-page URL by itself and preserve filters when using a cursor ID. Product, recurring, checkout and jurisdiction list tools also accept an exact resource ID by itself.

Document totals and tax breakdowns expose explicitly named cents fields. Document line prices, payment amounts, transaction line totals and calculation amounts use currency major units. Product prices remain decimal strings. Numeric API inputs are rejected when conversion would alter the requested decimal value; the integration does not round money. A calculation reports Quaderno’s status and account-configured result rather than establishing a legal obligation. Tax-ID validation can return `null` when the external registry service is unavailable.

Estimate keys use the current proforma API. Invoice updates accept administrative fields only. Current credit notes reference an invoice; historical contact-and-lines calls remain an explicitly limited compatibility path. Recorded payments and transactions describe activity already performed and do not transfer money. Delivery confirms initiation, not receipt. Financial documents, payment history, recurring generation and email effects may remain after a later correction or deletion.

Historical estimate deletion, jurisdiction mutations, payment deletion and expense payment recording retain their existing keys and routes, but these mutations are absent from the current API reference. Support depends on the account’s historical API behavior. Catalog jurisdiction IDs are not registration IDs, and a provider record is not proof of legal registration. Use the provider’s current tax-ID workflow for registration records. Report requests use supported report types and date ranges; available CSV reports are provided as downloadable files.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
