# <img src="https://provider-logos.metorial-cdn.com/xero.svg" height="20"> Xero

Manage accounting, invoicing, and financial operations for small and medium-sized businesses. Create, send, and track invoices, credit notes, quotes, and purchase orders. Process payments and batch payments. Manage contacts (customers and suppliers) and organize them into groups. Reconcile bank transactions and push bank statement data via bank feeds. Generate financial reports including Balance Sheet, Profit and Loss, Trial Balance, Aged Payables/Receivables, and tax reports. Manage the chart of accounts, tax rates, currencies, and tracking categories. Track fixed assets with depreciation settings and lifecycle management. Create and manage projects, assign tasks, and log time entries for billable hours. Run region-specific payroll (AU, UK, NZ) including employees, pay runs, leave, and timesheets. Upload and organize files associated with accounting objects. Receive webhook notifications for contact, invoice, and credit note changes.

## Tools

### Get Organisation

Retrieves details about the connected Xero organisation, including name, legal name, country, currency, tax settings, financial year dates, and timezone. Useful for understanding the organisation's configuration.

### Get Financial Report

Generates a financial report from Xero. Supports Balance Sheet, Profit and Loss, Trial Balance, Budget Summary, Executive Summary, Bank Summary, Aged Receivables, Aged Payables, and more. Reports are generated in real-time from your Xero data.

### Get Settings

Retrieves key organisation settings from Xero including tax rates, tracking categories, currencies, and branding themes. Returns all settings in a single call for convenience.

### List Accounts

Lists all accounts in the chart of accounts. Supports filtering by account type, class, or status using the where parameter. Useful for finding account codes to use in invoices, payments, and journal entries.

### Create Bank Transaction

Creates a spend or receive money transaction in Xero. Use RECEIVE for money coming in and SPEND for money going out. Links to a bank account and contact.

### Create Contact

Creates a new contact (customer or supplier) in Xero. A contact name is required, and you can optionally include address, phone, email, tax information, and payment terms.

### Create Credit Note

Creates a new credit note in Xero. Use ACCRECCREDIT for customer credit notes (reducing what they owe) or ACCPAYCREDIT for supplier credit notes (reducing what you owe).

### Create Invoice

Creates a new sales invoice (ACCREC) or purchase bill (ACCPAY) in Xero. Specify the contact, line items, dates, and other details. The invoice is created in DRAFT status by default unless a different status is provided.

### List Items

Lists inventory items from Xero. Items represent products or services that can be added to invoices, quotes, and purchase orders using item codes.

### Create Manual Journal

Creates a manual journal entry in Xero. Journal lines must balance (total debits must equal total credits). Use positive amounts for debits and negative amounts for credits.

### Create Payment

Records a payment against an invoice or credit note in Xero. Specify the invoice, account (bank account), amount, and date. Partial payments are supported.

### Create Purchase Order

Creates a new purchase order for a supplier in Xero. Specify the supplier contact, line items, delivery details, and dates. Created in DRAFT status by default.

### Create Quote

Creates a new quote (estimate) in Xero. Quotes can be sent to contacts for approval, then converted to invoices once accepted.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
