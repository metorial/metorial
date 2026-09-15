# <img src="https://provider-logos.metorial-cdn.com/stripe.svg" height="20"> Stripe

Manage Stripe customers, payments, recurring subscriptions, invoices, products, prices, refunds, disputes, payouts, coupons, and manual tax rates. Create Checkout and Billing Portal sessions and payment links. Inspect account identity, balances, and transaction history, and receive verified webhook events.

Uses Stripe API `2026-08-26.dahlia`. Authenticate with an API key or Stripe Connect OAuth (`read_write`). Restricted API keys need permissions for the resources used; account identity requires account read access. The optional connected-account target applies the Stripe-Account header to tool calls.

Subscription `pause`/`resume` control payment collection. Use returned subscription item IDs to update an existing item. Individual billing periods are returned for each item; the legacy summary is omitted for mixed periods.

Checkout supports `expire`; payment links support `update` with `active=false`; invoices support `list_line_items` and draft `delete`. Promotion codes support get/update and deactivation. Prices are archived with update, and cannot be deleted.

This integration does not currently expose Stripe Issuing, Treasury, Radar rules, file uploads, Connect transfers, or automatic tax calculation.

## Events

Receive payment (including disputes), customer and legacy source, subscription,
invoice, Checkout (including asynchronous payment), and payout events. One endpoint
is created automatically for the connection's effective Stripe account and test/live
mode and shared by subscribers in the same tenant. Optional connected-account
configuration applies to events as well as tools; this does not subscribe to every
account on a Connect platform.

Credentials need account and balance read access for identity discovery and webhook
endpoint management access. Endpoint payloads use API `2026-08-26.dahlia`. Deliveries
require a valid endpoint signature within five minutes. Event IDs identify retries;
delivery order is not guaranteed. Customer source deletion does not mean the customer
was deleted. Subscription periods are reported per item; a summary is present only
when all items share the same period and the item list is complete.

Removing the final subscriber requests endpoint deletion. The current callback runtime
can omit the connection state needed for deletion, so verify removal in Stripe and
remove any leftover endpoint there. These events require a new automatic registration.

## Tools

### Get Account

Identify the account in use and inspect payment and payout readiness.

### Create Checkout Session

Create a hosted Stripe Checkout session or retrieve an existing one. Checkout provides a pre-built, optimized payment page for one-time payments and subscriptions. Returns a URL to redirect the customer to.

### Create Payment Link

Create a shareable Stripe Payment Link for accepting one-time or recurring payments without building a custom checkout page. Also retrieve or list existing payment links.

### Create Billing Portal Session

Create a short-lived Stripe-hosted Billing Portal session so a customer can manage subscriptions, invoices, and payment methods.

### Create Refund

Issue a full or partial refund on a charge or PaymentIntent. Optionally specify a reason for the refund. You can also retrieve existing refunds or list all refunds.

### Get Balance

Retrieve your Stripe account balance across available and pending states. Also list balance transactions to see a detailed ledger of funds movements.

### Manage Coupons

Create, retrieve, update, delete, or list coupons and promotion codes. Coupons define discount rules (percentage or fixed amount), and promotion codes are customer-facing codes that apply coupons.

### Manage Customers

Create, retrieve, update, or delete Stripe customers. Use **action** to specify the operation. Customers are the core entity for tracking payments, subscriptions, and invoices.

### Manage Disputes

Retrieve, list, update, or close disputes (chargebacks). Submit evidence to fight a dispute or accept it by closing. Disputes arise when a customer questions a charge with their bank.

### Manage Invoices

Create, retrieve, update, finalize, send, pay, or void invoices. Supports adding and listing line items, deleting drafts, and managing the full invoice lifecycle from draft to paid or voided.

### Manage Payment Intents

Create, retrieve, update, confirm, capture, or cancel PaymentIntents. PaymentIntents orchestrate the full payment lifecycle, supporting authorization, capture, and confirmation across many payment methods and currencies.

### Manage Payment Methods

Retrieve, list, attach, or detach Stripe PaymentMethods for customer billing and saved payment flows.

### Manage Payouts

Create, retrieve, or list payouts. Payouts transfer funds from your Stripe balance to an external bank account or debit card. Amounts are in smallest currency unit.

### Manage Products & Prices

Create, retrieve, update, or delete products and their associated prices. Products represent goods or services, and prices define how much and how often to charge. Supports one-time and recurring pricing models.

### Manage Subscriptions

Create, retrieve, update, cancel, pause, or resume subscriptions. Subscriptions handle recurring billing with support for trials, multiple items, proration, and various billing cycles.

### Manage Setup Intents

Create, retrieve, confirm, cancel, or list Stripe SetupIntents for saving payment methods for future use.

### Manage Tax Rates

Create, retrieve, update, or list Stripe manual Tax Rates for invoices, subscriptions, and Checkout Sessions.

### Search Charges

Retrieve a specific charge or list charges with optional filters. Charges represent completed or attempted payment transactions. Use this to inspect payment details, outcomes, and related metadata.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
