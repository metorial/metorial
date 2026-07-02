# <img src="https://provider-logos.metorial-cdn.com/tripletex.svg" height="20"> Tripletex

Tripletex is a Norwegian cloud accounting and ERP platform for accounting,
invoicing, suppliers, products, projects, documents, and operational financial
data.

This integration supports Tripletex session-token authentication through either
an internal JWT refresh token or a commercial consumer token plus employee token.
It can read core accounting records, upsert master data, download invoice and
voucher PDFs and document files as Slate attachments, register invoice
payments, send invoices, and manage webhook subscriptions.

## Authentication

Tripletex API calls use HTTP Basic authentication where the username is the
target company id, or `0` for the employee token owner's company, and the
password is a short-lived session token. This integration exchanges your
longer-lived Tripletex credentials for a fresh session token when it invokes
tools.

Supported authentication methods:

- Consumer and employee token: for commercial integrations using a Tripletex
  consumer token and employee token pair.
- JWT refresh token: for internal integrations using a Tripletex `tlxr_...`
  refresh token.

Use the test environment when working with Tripletex test accounts from
`api-test.tripletex.tech`.

For test credentials from Tripletex, use:

```bash
bun packages/cli/src/cli.ts tripletex auth setup consumer_employee_token
```

## Tools

- Inspect the current Tripletex session and accessible client companies.
- List and upsert customers, suppliers, contacts, products, and projects.
- List employees and accounting reference data such as ledger accounts, VAT
  types, voucher types, payment types, departments, currencies, product units,
  product groups, and customer/supplier categories.
- List contacts, invoices, orders, supplier invoices, supplier invoices awaiting
  approval, vouchers, postings, and balance sheet rows.
- Create invoices, send invoices, register invoice payments, create orders, and
  invoice existing orders with explicit send controls.
- Download invoice, supplier invoice, voucher, and document files as
  attachments.
- List document archive metadata for customers, suppliers, projects, products,
  and ledger accounts.
- List events and list, get, create, update, or delete webhook subscriptions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
