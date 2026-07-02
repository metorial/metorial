# <img src="https://provider-logos.metorial-cdn.com/freshbooks.svg" height="20"> Freshbooks

Create and manage invoices, estimates, expenses, and payments for small business accounting. Track time entries against projects, manage clients and vendors, record bill payments, and generate financial reports including profit & loss, balance sheet, and cash flow. Create credit notes, configure taxes, manage billable items and services, and send invoices and estimates via email. Supports webhooks for real-time notifications on changes to invoices, clients, expenses, payments, projects, and more.

## Tools

### Get Client

Retrieve detailed information about a specific client by their ID. Returns full contact details, billing address, and preferences.

### Get Invoice

Retrieve detailed information about a specific invoice by its ID. Returns full invoice data including line items, amounts, status, and dates.

### List Clients

Search and list clients in FreshBooks. Supports filtering by email, organization, name, and status. Returns paginated results with key contact and billing information.

### List Expenses

Search and list expenses in FreshBooks. Supports filtering by client, vendor, category, project, date range, and status. Returns paginated results.

### List Invoices

Search and list invoices in FreshBooks. Supports filtering by client, status, date range, and amount. Returns paginated results with key invoice summary information.

### List Items

List billable items in FreshBooks. Returns reusable product/service records with names, descriptions, and rates.

### List Payments

Search and list payments in FreshBooks. Supports filtering by client, invoice, date range, and payment type. Returns paginated results.

### List Projects

List all projects in FreshBooks. Returns project details including title, client, type, and duration. Requires a **businessId** in the configuration.

### List Taxes

List all configured tax rates in FreshBooks. Returns tax names, percentages, compound status, and registration numbers.

### List Time Entries

Search and list time entries in FreshBooks. Supports filtering by date range, project, client, and billing status. Requires a **businessId** in the configuration.

### Manage Clients

Create, update, or delete client records in FreshBooks. Clients are entities you send invoices to. Use this tool to add new clients, update their contact and billing information, or archive them.

### Manage Credit Notes

Create, update, or delete credit notes in FreshBooks. Credit notes are used for client refunds or adjustments and can include line items similar to invoices.

### Manage Estimates

Create, update, delete, or send estimates in FreshBooks. Estimates allow clients to review and agree on price and scope before work begins. Use the "send" action to email estimates to clients.

### Manage Expenses

Create, update, or delete expenses in FreshBooks. Track business expenses with amounts, categories, vendors, taxes, and optional project associations.

### Manage Invoices

Create, update, or delete invoices in FreshBooks. New invoices are created in **Draft** status. Use the "send" action to email invoices to clients, or "markAsSent" to mark them as sent without sending an email. Supports line items with taxes, discounts, terms, and notes.

### Manage Items

Create, update, or delete billable items in FreshBooks. Items are reusable products/services with predefined names, descriptions, and rates that can be quickly added to invoices.

### Manage Payments

Record, update, or delete payments against invoices in FreshBooks. Use this to track payments received from clients. Payments are linked to a specific invoice.

### Manage Projects

Create, update, or delete projects in FreshBooks. Projects are associated with clients and can be either fixed-price or hourly-rate. Time entries can be logged against projects. Requires a **businessId** in the configuration.

### Manage Taxes

Create, update, or delete tax configurations in FreshBooks. Taxes can be applied to invoices and line items. Supports compound taxes (calculated on top of primary taxes).

### Manage Time Entries

Create, update, or delete time entries in FreshBooks. Log time worked against clients and projects with duration, notes, and billable status. Requires a **businessId** in the configuration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
