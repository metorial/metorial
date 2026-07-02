# <img src="https://provider-logos.metorial-cdn.com/poweroffice.png" height="20"> PowerOffice

Connect to PowerOffice Go accounting data for Norway-focused ERP workflows. This integration exposes client integration privileges, accounting and sales settings, dimensions, customers, suppliers, products, sales orders, outgoing invoices, incoming invoices, customer/supplier ledgers, account transactions, trial balance, voucher documentation, and guarded journal-entry voucher workflows.

## Authentication

PowerOffice uses OAuth 2.0 client credentials. Configure the integration with the PowerOffice environment (`demo` or `production`), application key, client key, and product subscription key. Demo and production credentials are separate.

## Tools

### Get PowerOffice Client Integration Info

Retrieve the authenticated client id/name, active subscriptions, valid privileges, and invalid privileges.

### List PowerOffice General Ledger Accounts

List general ledger accounts for product setup, voucher drafts, and reporting filters.

### List PowerOffice VAT Codes

List VAT codes for product, invoice, voucher, and accounting workflows.

### List PowerOffice Sales Settings

List payment terms, delivery terms, and branding themes.

### List PowerOffice Financial Settings

Read financial settings, currencies, and currency rates.

### List PowerOffice Projects

List projects and subprojects for sales, invoice, ledger, and trial balance filters.

### List PowerOffice Departments

List departments for dimensional accounting and reporting.

### List PowerOffice Locations

List locations for dimensional accounting and sales order filters.

### List PowerOffice Custom Dimensions

List custom dimension settings and values for `dim1`, `dim2`, and `dim3`.

### List PowerOffice Customers

List customer master records by customer numbers, external references, organization numbers, contact details, contact groups, and changed timestamps.

### Upsert PowerOffice Customer

Create, update, or upsert customers for CRM, ecommerce, and billing sync workflows. Updates use PowerOffice JSON Patch internally and can resolve a customer by id, external import reference, customer number, or external number.

### List PowerOffice Suppliers

List supplier master records by supplier numbers, external references, organization numbers, contact details, contact groups, and changed timestamps.

### Upsert PowerOffice Supplier

Create, update, or upsert suppliers for accounts payable and purchasing sync workflows.

### List PowerOffice Products

List products and services by code, name, product group, type, archived state, stock timestamp, and changed timestamp.

### Upsert PowerOffice Product

Create, update, or upsert product/service records by PowerOffice id or product code.

### List PowerOffice Sales Orders

List sales order headers by customer, project, status, order number, external references, changed timestamp, and current-integration ownership.

### Get PowerOffice Sales Order

Retrieve a complete sales order by id, including line details.

### Create PowerOffice Sales Order

Create a complete sales order draft with header fields and lines. This does not send an invoice.

### Get PowerOffice Sales Order Lines

Retrieve sales order draft/order lines by sales order id.

### Manage PowerOffice Sales Order Line

Create, update, or delete a line on a sales order draft.

### Send PowerOffice Sales Order Invoice

Queue invoice delivery from an existing sales order. Use `dryRun` for confirmation flows before sending to a customer.

### Get PowerOffice Sales Order Sent State

Inspect delivery/sent state for sales orders.

### List PowerOffice Sales Order Attachments

List attachment metadata for a sales order.

### Download PowerOffice Sales Order Attachment

Download a sales order attachment through a Slate attachment.

### List PowerOffice Outgoing Invoices

List customer invoices for accounts receivable, unpaid invoices, project reporting, date ranges, and reconciliation.

### Get PowerOffice Outgoing Invoice

Retrieve a specific outgoing invoice header by id.

### Get PowerOffice Outgoing Invoice Lines

Retrieve product, amount, VAT, and accounting dimension lines for an outgoing invoice.

### List PowerOffice Incoming Invoices

List supplier invoices for accounts payable visibility, unpaid invoices, project reporting, and date ranges.

### Get PowerOffice Incoming Invoice

Retrieve a specific incoming supplier invoice by id.

### List PowerOffice Account Transactions

List posted ledger transaction lines for a required date range with account, voucher, VAT, product, project, and department filters.

### List PowerOffice Customer Ledger

List customer ledger open items, balances, statements, or entries by match id.

### List PowerOffice Supplier Ledger

List supplier ledger open items, balances, statements, or entries by match id.

### Get PowerOffice Trial Balance

Get trial balance lines as of a specific date, optionally filtered by account and dimensions.

### Download PowerOffice Voucher Documentation

List voucher documentation metadata or download a voucher document through a Slate attachment. Downloaded file content is returned only as an attachment.

### List PowerOffice Journal Entry Vouchers

List journal entry voucher drafts and approval workflow state.

### Create PowerOffice Supplier Invoice Voucher Draft

Create a supplier invoice journal entry voucher draft for review and approval. This does not directly post the voucher.

### Upload PowerOffice Journal Entry Voucher Page

Upload a document page to an existing journal entry voucher draft.

### Submit PowerOffice Journal Entry Voucher For Approval

Submit a journal entry voucher draft into the PowerOffice approval workflow.

### List PowerOffice Voucher Approval Queue

List vouchers currently available to the integration for approval handling.

### Update PowerOffice Voucher Approval

Approve or reject a voucher available in the approval queue.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
