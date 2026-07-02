# <img src="https://provider-logos.metorial-cdn.com/plaid.png" height="20"> Plaid

Connect to users' bank accounts at thousands of financial institutions to access financial data and enable money movement. Retrieve account details, balances, and transactions (with merchant info, categories, and location data). Get account and routing numbers for ACH/wire transfers. Verify identity by comparing user-provided data against bank-held records. View investment holdings, securities, and investment transactions. Access loan and liability data including balances, interest rates, and payment schedules. Initiate ACH transfers and manage money movement with built-in risk assessment. Assess ACH return risk with signal scoring. Generate verifiable asset reports summarizing financial history. Verify income and employment through payroll connections or document uploads. Retrieve bank statements as PDFs. Enrich transaction data with merchant names, categories, and logos. Generate consumer credit reports with income insights and cashflow analysis. Search and retrieve metadata about supported financial institutions. Receive webhooks for item status changes, new transactions, auth updates, identity changes, transfer events, and more.

## Tools

### Create Asset Report

Initiate an asynchronous Asset Report that summarizes a user's financial history across one or more Items. The report is generated in the background — use the returned token to poll for the completed report. Useful for loan underwriting and financial verification. A webhook will fire when the report is ready.

### Create Link Token

Create a short-lived \

### Create Transfer

Initiate a bank transfer (ACH debit or credit). Requires a prior transfer authorization. The transfer is idempotent — if a transfer with the same authorization ID exists, the existing transfer is returned. Returns the transfer details including status and expected settlement date.

### Enrich Transactions

Enrich non-Plaid transaction data with merchant names, logos, categories, counterparties, and location details. Accepts up to 100 transactions per request. Useful for adding insights to transactions from sources other than Plaid.

### Evaluate ACH Risk

Assess the return risk of a planned ACH debit transaction using Plaid Signal. Returns risk scores for both customer-initiated and bank-initiated returns to help decide whether to proceed, delay, or reject a transaction.

### Exchange Public Token

Exchange a temporary \

### Get Accounts

Retrieve all financial accounts linked to a Plaid Item. Returns account names, types, subtypes, masks, and cached balance information. Use this to see what accounts a user has connected. For real-time balances, use the **Get Balances** tool instead.

### Get Asset Report

Retrieve a completed Asset Report by its token. The report contains account details, historical balances, and transaction summaries across all included Items. Call this after receiving the PRODUCT_READY webhook or after waiting for the report to be generated.

### Get Auth

Retrieve bank account and routing numbers for ACH, wire, and other transfers. Returns ACH routing/account numbers (US), EFT institution/branch numbers (Canada), BACS sort codes (UK), and international IBAN/BIC codes depending on the institution's country.

### Get Balances

Retrieve **real-time** balance information for accounts linked to a Plaid Item. Unlike cached balances from Get Accounts, this makes a live request to the financial institution. Useful for preventing ACH returns or verifying sufficient funds.

### Get Investment Holdings

Retrieve current investment holdings and security details from brokerage or retirement accounts. Returns positions with quantities, prices, values, and cost basis, along with detailed security metadata (ticker, ISIN, CUSIP, type).

### Get Identity

Retrieve account holder identity information as reported by the financial institution. Returns names, emails, phone numbers, and addresses for each account owner. Useful for KYC verification and fraud prevention.

### Get Institution

Retrieve detailed information about a specific financial institution by its Plaid institution ID. Optionally includes the institution's current health status per product.

### Get Investment Transactions

Retrieve investment transaction history (buys, sells, dividends, fees, transfers) for a date range. Supports offset-based pagination for large result sets. Up to 24 months of history may be available.

### Get Liabilities

Retrieve liability data for credit cards, student loans, and mortgages. Returns payment schedules, interest rates, APRs, outstanding balances, and repayment details for each liability type.

### Get Transactions

Retrieve transactions for a date range using offset-based pagination. Returns transactions along with total count for pagination. For incremental updates, prefer **Sync Transactions** instead.

### Get Transfer

Retrieve the current status and details of a bank transfer by its ID. Returns the transfer amount, type, status, network, and creation timestamp.

### List Transfers

List bank transfers with optional date range filtering and pagination. Returns a summary of each transfer including status, amount, type, and network.

### Get Item

Retrieve status and metadata for a Plaid Item (bank connection). Returns the institution, available and billed products, webhook URL, error state, and data update timestamps.

### Search Institutions

Search for financial institutions supported by Plaid. Filter by name, country, and required products. Returns institution metadata including supported products, OAuth support, and branding details. Only institutions supporting **all** specified products are returned.

### Sync Transactions

Incrementally sync transaction data using Plaid's cursor-based approach. On the first call, omit the cursor to get the initial set of transactions. On subsequent calls, pass the **nextCursor** from the previous response to get only new changes (added, modified, removed). Continue calling while **hasMore** is true to get all available updates.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
