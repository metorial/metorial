# <img src="https://provider-logos.metorial-cdn.com/wave-accounting.svg" height="20"> Wave

Manage small business accounting, invoicing, and financial data. Create and send invoices with line items, taxes, and payment options. Manage customers, vendors, and product/service catalogs. Create and organize chart of accounts. Record financial transactions as deposits and withdrawals. Create and manage estimates for customers. Configure sales taxes with rate changes and effective dates. Query business information and user profiles.

## Tools

### Create Transaction

Create a financial transaction in Wave. This is equivalent to creating a standard transaction in Wave where a deposit or withdrawal to/from a bank or credit card account is categorized to one or more accounting categories. Use **DEPOSIT** when the business receives money and **WITHDRAWAL** when the business spends money. Line items categorize the transaction using **INCREASE** or **DECREASE** balance directions. The total of line item amounts must equal the anchor amount.

### Get Current User

Retrieve the authenticated user's profile information including their name and default email address.

### List Businesses

Retrieve businesses associated with the authenticated Wave account. Each business is a separate entity with its own chart of accounts, customers, and financial data. Use this to discover available businesses before performing business-scoped operations.

### List Vendors

List vendors for a Wave business. Returns vendor contact details, address, and currency information. Vendors are suppliers or service providers associated with the business.

### List Accounts

List accounts in a business's chart of accounts. Returns all account types including assets, liabilities, equity, income, and expenses with their current balances.

### List Customers

List customers for a specific Wave business. Supports pagination for businesses with many customers.

### List Invoices

List invoices for a Wave business with pagination. Optionally filter by a specific customer. Returns invoice details including status, amounts, customer, and line items.

### List Products

List products and services in a Wave business's catalog. Returns product details including pricing, associated accounts, and default sales taxes.

### List Sales Taxes

List sales tax entries for a Wave business. Returns tax details including current rates, historical rate changes, and configuration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
