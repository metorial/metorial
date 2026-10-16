# <img src="logo.jpeg" height="20"> Altoviz

Manage customers, contacts, products, suppliers, customer receipts, sales invoices, quotes, and credits. Create and finalize invoices, record payments, send invoices or quotes by email, retrieve full records, and download sales documents as PDFs. Search customers by email and products by number, and retrieve the connected user, account settings, VAT rates, classifications, and units.

## Authentication

Use an API key from your Altoviz account's API access settings. Requests use the `X-API-KEY` header. No workspace or account identifier is required at connection setup.

## Notes

- Existing summary fields remain available; `raw` includes complete provider records, including structured line items, metadata, and payment or e-invoicing state when returned.
- Receipts represent customer payments. Use `customerId` rather than the legacy unsupported `supplierId` input.
- The quote-update tool retains its existing API route for compatibility. The current public API reference does not document this operation; its availability remains unverified.
- Optional recipient lists let you select email addresses when sending invoices or quotes.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
