# <img src="https://provider-logos.metorial-cdn.com/paypal.png" height="20"> Paypal

Process payments, manage orders, and handle financial transactions through PayPal. Create and capture checkout orders with immediate or deferred payment flows. Issue full or partial refunds and void authorizations. Create and manage recurring subscriptions with billing plans, pricing tiers, and trial periods. Send and track invoices, record payments and refunds against them. Send batch payouts to multiple recipients via email, phone, or PayPal ID. View and resolve customer disputes by providing evidence or accepting claims. Save payment methods to a vault for returning customers. Search transaction history for reconciliation and reporting. Add shipment tracking to captured payments. Manage catalog products, onboard merchants via partner referrals, and look up currency exchange rates. Receive webhook notifications for payment, order, subscription, payout, invoice, dispute, and merchant onboarding events.

## Tools

### Add Tracking

Add shipment tracking information to a captured PayPal payment or order. Uses Orders v2 tracking when an order ID is provided and falls back to legacy transaction tracking otherwise.

### Authorize Order

Authorize payment for an approved PayPal order with AUTHORIZE intent. Returns the authorization ID so it can be captured, voided, or inspected with Manage Payment.

### Capture Order

Capture payment for an approved PayPal order with CAPTURE intent. The order must have been approved by the buyer first.

### Create Invoice

Create and optionally send a PayPal invoice. Define line items, recipient email, and invoice details. The invoice is created as a draft and can be automatically sent.

### Create Order

Create a new PayPal checkout order. Supports both immediate capture and authorization-then-capture flows. Can include one or more purchase units, each with its own amount, items, and shipping details. Returns an approval URL for the buyer to complete payment.

### Create Subscription

Create a new PayPal subscription for a billing plan. Returns an approval URL for the subscriber to activate. The billing plan must already exist.

### Get Order

Retrieve details of a PayPal order by its ID. Returns the full order object including status, purchase units, payer information, and payment details.

### Get Payout

Retrieve the status and details of a PayPal batch payout or individual payout item. Track whether payouts have been claimed by recipients.

### List Invoices

List PayPal invoices with optional pagination. Returns invoice summaries including status, amounts, and recipient information.

### Search Invoices

Search PayPal invoices by recipient, invoice number, status, and pagination. Use this when list pagination is not specific enough for reconciliation or follow-up workflows.

### Manage Billing Plan

Create, retrieve, list, activate, or deactivate PayPal billing plans. Billing plans define pricing and billing cycle details for subscriptions.

### Manage Dispute

Manage PayPal customer disputes (chargebacks, claims, inquiries). List disputes, get details, accept claims, provide evidence, or escalate to PayPal.

### Manage Invoice

Manage existing PayPal invoices. Send, cancel, delete drafts, record or remove external payments and refunds, and retrieve invoice details.

### Manage Payment

Manage payment authorizations, captures, and refunds. Capture an authorization, void an authorization, refund a captured payment, or view details of authorizations/captures/refunds.

### Manage Product

Create, retrieve, or list PayPal catalog products. Products are used as the basis for billing plans and subscriptions.

### Manage Subscription

Manage PayPal subscriptions. List subscriptions, retrieve details, suspend, cancel, reactivate, or list transactions for a subscription.

### Search Transactions

Search PayPal transaction history by date range, status, amount, and other filters. Useful for reconciliation, reporting, and finding specific transactions.

### Send Payout

Send batch payouts to one or more recipients via PayPal email, phone, or PayPal ID. Supports multiple currencies and per-item notes. Returns a batch ID to track the payout status.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
