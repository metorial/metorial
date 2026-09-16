# Stripe integration specification

## API and authentication

Requests and newly registered webhooks use Stripe API `2026-08-26.dahlia`.
The client sends form-encoded nested parameters to `https://api.stripe.com/v1`.
Empty objects and arrays encode as empty values, allowing documented field clearing.
Provider errors use the shared ServiceError adapter and retain Stripe error details.

- API key auth accepts secret or restricted keys. Restricted keys need resource permissions corresponding to the operations used, including account read access for profile discovery.
- Stripe Connect OAuth requests only `read_write`. Stripe accepts a single access level per authorization; `read_only` is restricted to legacy Connect extensions and is not requested.
- Authorization uses `https://connect.stripe.com/oauth/authorize`; callback and refresh use `https://connect.stripe.com/oauth/token`. Refresh preserves the previous refresh token and connected account ID if omitted by Stripe. Stripe Connect access tokens do not have a documented expiry duration, so none is invented.
- OAuth access tokens already identify the connected account. Optional `stripeAccountId` config deliberately targets another connected account using the Stripe-Account header for platform API keys; it is not required at setup.
- `get_account` identifies the effective tool account. Profile discovery identifies the authenticating account before optional tool targeting.

## Tools

| Tool | Supported operations |
| --- | --- |
| get_account | Effective account identity and readiness |
| manage_customers | Create, get, update including shipping, delete, email-filtered list |
| manage_payment_intents | Create, get, update, confirm with return URL, capture, cancel, list |
| manage_subscriptions | Create, get, update targeted items, cancel now/at period end, pause/resume collection, list |
| manage_invoices | Create, get, update, finalize, send, pay, void, add/list line items, delete draft, list |
| manage_products_prices | Product CRUD/list; price create/get/update/list, including tiered pricing; archive using active=false |
| create_refund | Create full/partial refund, get, list |
| create_checkout_session | Create hosted session, get, expire, customer-filtered list |
| create_payment_link | Create, get, update/deactivate, list |
| manage_payouts | Create, get, list including in_transit filter |
| get_balance | Available/pending balances; list/get balance transactions |
| manage_coupons | Coupon CRUD/list; promotion-code create/get/update/list; deactivate using active=false |
| manage_disputes | Get, stage or submit evidence, close, list by charge or PaymentIntent |
| search_charges | Get, filtered list; this is not Stripe Search syntax |
| manage_setup_intents | Create, get, confirm, cancel, list |
| manage_payment_methods | Get, customer get/list, attach, detach, set invoice default on attach |
| create_billing_portal_session | Create session with optional configuration, locale and connected-account branding |
| manage_tax_rates | Create/get/update/list manual rates; archive using active=false |

List limits are 1–100 and use startingAfter cursors. Outputs expose IDs and hasMore.
Subscriptions expose item IDs and item billing periods. Legacy top-level periods remain for uniform periods and older webhook payloads; mixed periods omit the summary.
Subscription discount inputs map to discounts entries. Promotion-code creation maps to promotion[type]=coupon and promotion[coupon]. Invoice item prices map to pricing[price].
Dispute evidence defaults to staging; only submitEvidence=true submits to the bank.
Invoice PDF and hosted invoice URLs are provider metadata; there is no dedicated file-download operation.

## Webhooks

One automatic `events` trigger group owns the six existing triggers:
`payment_events`, `customer_events`, `subscription_events`, `invoice_events`,
`checkout_events`, and `payout_events`. Exact event lists are defined together in
`src/triggers/event-types.ts`; the endpoint subscribes to their union, without a wildcard.
Payment events include disputes, and Checkout includes asynchronous payment outcomes.

Targets are discovered using `/account` and `/balance` with the effective connection
credentials/config. The stable target ID combines account ID and test/live mode;
`multi_user` ownership allows subscriptions to share one endpoint within a tenant.
Registration revalidates the target and creates an account-scoped endpoint with the
pinned API version. Registration payloads contain `endpointId`, `signingSecret`,
`accountId`, and `livemode`; secrets are never included in target metadata or outputs.
Restricted credentials require account/balance read and webhook-management permissions.

Processing validates the saved registration, verifies Stripe-Signature v1 over the
original raw body, enforces a five-minute timestamp window, and validates the event
envelope without removing snapshot fields. Events route through automatic target
subscriptions. The SDK-required routing handler and emitted `matchers` return empty
arrays; no connection identity lookup is needed for routing matchers. The Stripe
event ID is the idempotency key. An event account, when non-null, must
match the registered account; account-scoped events with a missing or null account belong to that endpoint's
registered account. Other accounts, modes, and unsupported event types are acknowledged
without routing. Invalid signatures/bodies return 400, unsupported methods 405, invalid
registration data 500, and accepted or ignored deliveries 200.

Triggers select exact event types and object types before mapping validated snapshots.
Expandable references map to IDs. Customer source events derive the customer ID from
the customer reference, and source deletion does not report customer deletion.
Invoice subscription IDs use `parent.subscription_details.subscription`. Subscription
periods use current item-level fields only; summary periods require a complete item
list with uniform periods. No legacy handlers, registration payloads, or old API field
fallbacks remain in the webhook path. Tool behavior is unchanged.

Unregister uses the saved endpoint ID even when the runtime registration identifier is
empty, validates account/mode, and ignores only an upstream 404. Other failures propagate.
The callback runtime currently omits connection state on unregister, so provider-side
cleanup must be verified separately. No credentials are stored to bypass this limitation.

## Boundaries

This is a practical payments and billing surface, not the whole Stripe API. Credit notes, invoice previews, subscription schedules, true paused-subscription resumption, customer tax IDs, Connect account discovery/transfers, file uploads/downloads, Issuing, Treasury, and Radar administration are not exposed.

## Verification

Private live scenarios are in tests/integrations/stripe/tools.e2e.ts and require a test-mode API key. The shared profile downloaded on 2026-09-14 was empty, so provider acceptance remains unverified. Schema compatibility has package tests. Local SDK webhook contract tests live in the enterprise repository at tests/integrations/stripe/triggers.test.ts (run with `bun run triggers:test -- stripe`) and cover malicious signatures, stale deliveries, invalid envelopes, account/mode isolation, category selection, and callback registration/mapping contracts. Stripe cannot emit adversarial deliveries, and the private tools harness does not drive callback lifecycle. Stubbed registration calls prove local contracts only; they do not prove provider acceptance. Live callback delivery and cleanup require a test-mode Stripe account and an enabled Metorial callback environment.

### Documented webhook unit tests

Payload tests in `tests/integrations/stripe/triggers.payloads.test.ts` (enterprise
repository) cover all 51 registered
event types plus card, bank-account, and attached-Source variants. Each parameterized
case links its concrete Stripe payload example. Fixtures contain reduced example
fields; lifecycle overrides are explicitly adapted examples, not live captures.
The inventory is independent of production event lists, and each case verifies the
signed receive path, selected trigger, empty matcher array, event ID, and complete output.
The null-account regression covers Stripe's documented nullable Event.account field.

## Sources

- [Versioning](https://docs.stripe.com/api/versioning)
- [Official OpenAPI](https://github.com/stripe/openapi/blob/master/openapi/spec3.json)
- [Connect OAuth](https://docs.stripe.com/connect/oauth-reference)
- [Subscriptions](https://docs.stripe.com/api/subscriptions)
- [Invoice items](https://docs.stripe.com/api/invoiceitems/create)
- [Promotion codes](https://docs.stripe.com/api/promotion_codes/create)
- [Disputes](https://docs.stripe.com/api/disputes/update)
- [Webhook signatures](https://docs.stripe.com/webhooks/signature)
