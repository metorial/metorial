# <img src="https://provider-logos.metorial-cdn.com/braintree.svg" height="20"> Braintree

Process payments and manage transactions across credit/debit cards, PayPal, Venmo, Apple Pay, Google Pay, and ACH Direct Debit. Create, void, refund, and search transactions. Store customer payment methods securely in the Vault for repeat billing. Manage recurring subscriptions with add-ons and discounts. Handle disputes by adding evidence, accepting, or finalizing. Create and manage customers, addresses, and sub-merchant accounts. Run credit card verifications, generate settlement batch summaries, and forward payment data to third parties. Receive webhook notifications for subscription lifecycle changes, transaction settlements, disbursements, dispute updates, account updater card refreshes, and fraud protection alerts.

## Tools

### Create Transaction

Creates a payment transaction in Braintree. Supports both sale (immediate capture) and authorization-only flows. Use this to charge a payment method or authorize an amount for later capture. Requires a payment method ID (from the Braintree vault or a single-use nonce) and an amount.

### Find Transaction

Retrieves details of a specific Braintree transaction by its ID. Returns full transaction information including status, amount, payment method, customer, and settlement details.

### Create Customer

Creates a new customer record in the Braintree vault. Customers can store multiple payment methods and have associated transactions.

### Find Dispute

Retrieves details of a specific Braintree dispute by its ID, including status, reason, amount, and deadline information.

### Vault Payment Method

Stores a payment method in the Braintree vault for future use. Takes a single-use payment method ID (nonce) and converts it to a reusable vaulted payment method. By default, credit cards are verified before vaulting.

### Create Subscription

Creates a new recurring billing subscription in Braintree. Requires a plan ID (configured in the Control Panel) and a payment method token.

### Refund Transaction

Refunds or reverses a Braintree transaction. For settled transactions, issues a refund (full or partial). For unsettled transactions, can void/reverse the transaction instead. Use "refund" for settled transactions and "reverse" to automatically void or refund based on status.

### Search Transactions

Searches for transactions in Braintree using various filter criteria. Returns a paginated list of matching transactions. Supports filtering by status, amount range, date range, customer, and payment method type.

### Submit for Settlement

Submits an authorized Braintree transaction for settlement, optionally adjusting the amount. This captures the funds from a previously authorized transaction. Supports both full and partial settlement.

### Settlement Batch Summary

Generates a settlement batch summary report for a given date. Returns aggregated totals for transactions settled on the specified date, optionally grouped by a custom field.

### Void Transaction

Voids a Braintree transaction that has not yet settled. Once a transaction is voided, the authorization hold on the customer's payment method is released. Only transactions with status "authorized", "submitted_for_settlement", or "settlement_pending" can be voided.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
