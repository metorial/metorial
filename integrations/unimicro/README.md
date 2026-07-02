# <img src="https://provider-logos.metorial-cdn.com/unimicro.svg" height="20"> UniMicro

Connect to UniMicro accounting and ERP data for Norway-focused workflows. This
integration can list accessible companies, customers, suppliers, customer
invoices, supplier invoices, products, accounts, journal entries, projects,
financial reports, and download UniMicro files through Slate attachments.

## Authentication

UniMicro uses OAuth 2.0 / OpenID Connect. Configure the integration with a
UniMicro OAuth application and choose the `test`, `unimicro`, or `custom`
environment. The standard `test` and `unimicro` environments use UniMicro's
documented endpoint discovery URLs. Use `custom` for other UniMicro Platform
hosts such as bank or partner-branded accounting systems, and provide the
custom AppFramework, identity, and files URLs.

Business tools require a UniMicro `CompanyKey`. Use **List Companies** to
discover accessible companies, then save the selected key in integration config
or provide it per tool call.

## Tools

### List Companies

List companies available to the authenticated user and return their company key
metadata for business API calls.

### List Customers

List customer master records with pagination, filtering, selected fields, and
expansion.

### Get Customer

Retrieve one customer by UniMicro numeric customer id.

### List Suppliers

List supplier master records with pagination, filtering, selected fields, and
expansion.

### List Customer Invoices

List customer invoices for accounts receivable visibility, customer invoice
investigation, payment status review, and export workflows.

### Get Customer Invoice

Retrieve one customer invoice by UniMicro numeric invoice id.

### List Supplier Invoices

List supplier invoices for accounts payable visibility, approval state review,
payment status review, and export workflows.

### Get Supplier Invoice

Retrieve one supplier invoice by UniMicro numeric supplier invoice id.

### List Products

List products and services for invoice/order setup, product sync, pricing, VAT,
and account mapping workflows.

### List Accounts

List chart of accounts records for accounting, invoice coding, journal, and
reporting workflows.

### List Journal Entries

List journal entry headers for general ledger audit, voucher lookup, and
accounting export workflows.

### List Projects

List projects for dimensional reporting, invoice context, and project
accounting workflows.

### Get Profit And Loss

Retrieve the UniMicro `profit-and-loss-periodical` account report.

### Get Balance Sheet

Retrieve the UniMicro `balance` account report.

### Get Trial Balance

Retrieve the UniMicro `trialbalance` account report.

### Download File

Download a UniMicro file through the UniMicro Files endpoint. File content is
returned only as a Slate attachment; structured output contains metadata.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
