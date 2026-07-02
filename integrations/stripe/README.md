# <img src="https://provider-logos.metorial-cdn.com/stripe.svg" height="20"> Stripe

Process payments, manage subscriptions, and handle invoices. Create and manage customers, payment methods, and product catalogs. Issue refunds, handle disputes, and submit chargeback evidence. Create checkout sessions and payment links. Manage connected accounts and platform fund flows via Stripe Connect. Configure payouts to bank accounts and debit cards. Apply coupons and promotion codes to subscriptions and invoices. Calculate and collect taxes automatically. Access balance information and transaction history. Upload files for dispute evidence and identity verification. Create and manage virtual and physical payment cards via Issuing. Receive real-time webhook notifications for payment, subscription, invoice, and account events.

## Tools

### Create Checkout Session

Create a hosted Stripe Checkout session or retrieve an existing one. Checkout provides a pre-built, optimized payment page for one-time payments and subscriptions. Returns a URL to redirect the customer to.

### Create Payment Link

Create a shareable Stripe Payment Link for accepting one-time or recurring payments without building a custom checkout page. Also retrieve or list existing payment links.

### Create Billing Portal Session

Create a short-lived Stripe-hosted Billing Portal session so a customer can manage subscriptions, invoices, and payment methods.

### Create Refund

Issue a full or partial refund on a charge or PaymentIntent. Optionally specify a reason for the refund. You can also retrieve existing refunds or list all refunds.

### Get Balance

Retrieve your Stripe account balance across available, pending, and reserved states. Also list balance transactions to see a detailed ledger of funds movements.

### Manage Coupons

Create, retrieve, update, delete, or list coupons and promotion codes. Coupons define discount rules (percentage or fixed amount), and promotion codes are customer-facing codes that apply coupons.

### Manage Customers

Create, retrieve, update, or delete Stripe customers. Use **action** to specify the operation. Customers are the core entity for tracking payments, subscriptions, and invoices.

### Manage Disputes

Retrieve, list, update, or close disputes (chargebacks). Submit evidence to fight a dispute or accept it by closing. Disputes arise when a customer questions a charge with their bank.

### Manage Invoices

Create, retrieve, update, finalize, send, pay, or void invoices. Supports adding line items, applying discounts, and managing the full invoice lifecycle from draft to paid or voided.

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
