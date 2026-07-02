# <img src="https://provider-logos.metorial-cdn.com/quickbooks.jpg" height="20"> Quickbooks

Manage business finances and accounting in QuickBooks Online. Create, send, and track invoices. Manage bills and accounts payable, record bill payments. Create and update customer and vendor records with contact details and hierarchies. Record payments against invoices and credit memos. Create estimates, sales receipts, and journal entries. Track expenses and categorize against the chart of accounts. Manage items, products, services, and inventory levels. Query entities using SQL-like syntax and sync incremental changes via Change Data Capture. Generate financial reports including profit and loss, balance sheet, and cash flow. Process credit card and bank account (ACH) payments via the Payments API. Manage the chart of accounts for tracking income, expenses, assets, and liabilities.

## Tools

### Create Invoice

Creates a new invoice in QuickBooks for a specified customer. Supports multiple line items with quantities, unit prices, and item references. Can optionally send the invoice via email immediately after creation.

### Create Journal Entry

Creates a manual journal entry with debit and credit lines. Used for adjustments, corrections, and non-standard transactions that don't fit standard transaction types. Total debits must equal total credits.

### Get Company Info

Retrieves the company profile information from QuickBooks, including name, address, contact details, fiscal year, and industry type.

### Get Report

Generates a financial report from QuickBooks. Supports standard reports including Profit and Loss, Balance Sheet, Cash Flow, Trial Balance, and more. Reports can be filtered by date range and other parameters.

### Create Account

Creates a new account in the QuickBooks chart of accounts. Accounts track income, expenses, assets, liabilities, and equity. Supports sub-account hierarchy.

### Create Bill

Creates a new bill (accounts payable) from a vendor. Bills represent money owed to vendors for goods or services received. Supports multiple line items with expense account categorization.

### Create Customer

Creates a new customer record in QuickBooks. Supports full contact details, billing/shipping addresses, and parent customer hierarchy.

### Create Estimate

Creates a new estimate (quote/proposal) for a customer. Estimates can later be converted to invoices. Supports multiple line items with item references.

### Create Sales Receipt

Creates a sales receipt for an immediate sale where payment is received at purchase time. Supports customer references, line items, payment method, deposit account, receipt email, and memo fields.

### Get Sales Receipt

Retrieves a sales receipt by ID, including customer, transaction date, total amount, sync token, and line item details.

### Delete Sales Receipt

Deletes a sales receipt transaction using its current sync token, fetching the token first when it is not supplied.

### Get Invoice

Retrieves a single invoice by its ID, returning full details including line items, amounts, customer info, and payment status. Can also send or void an invoice.

### Create Item

Creates a new product or service item in QuickBooks. Supports inventory items with quantity tracking, service items, and non-inventory items. Configure pricing, accounts, and inventory details.

### Create Payment

Records a payment received from a customer. The payment can be linked to one or more invoices, or recorded as an unlinked payment (credit). Supports specifying the payment method and deposit account.

### Create Vendor

Creates a new vendor (supplier) record in QuickBooks with contact details and address information.

### Query Entities

Queries QuickBooks entities using a SQL-like query language. Search and filter any entity type (Customer, Invoice, Bill, Item, Account, Vendor, Payment, Estimate, etc.) with flexible WHERE conditions, sorting, and pagination.

### Record Expense

Records a purchase or expense transaction in QuickBooks. Supports cash, check, and credit card payment types. Each line item can be categorized against a chart of accounts entry and optionally marked as billable to a customer.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
