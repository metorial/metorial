# Ko-fi integration specification

## Supported capability

Ko-fi's documented API sends outbound payment notifications. The integration has no callable actions and no account identity lookup. One manual webhook group, `payments`, exposes `donation_received` for the published `Donation` type and `payment_received` as an all-payments companion. Payment types remain provider-supplied strings; the public documentation does not define a complete machine-readable event enum.

## Authentication and setup

The existing `verification_token` authentication method and its `token` input/output are preserved. A nonblank token is required at runtime, with its exact bytes retained. Authentication stores this credential and does not claim remote validation. The connection configuration remains empty.

A person must configure the URL at [Ko-fi webhook settings](https://ko-fi.com/manage/webhooks). Manual setup stores the same verification token in the registration, independent of connection auth. Finish setup before saving or testing the URL in Ko-fi. Incoming payment tokens must match the saved registration; routing uses a SHA-256 digest of the verified token and the connection token. Tokens are compared using fixed-size digests and constant-time comparison. No token appears in emitted payment data, routing matchers, or rejection messages.

## Delivery contract

The receiver accepts HTTP POST with `application/x-www-form-urlencoded` and exactly one `data` field containing JSON. This follows the `data = { ... }` wrapper shown in the official payment example. It rejects malformed UTF-8, percent encoding, JSON, missing credentials, mismatched registration tokens, and invalid payment fields. Valid deliveries return HTTP 200.

The payment schema preserves common typed fields from the official example: `message_id`, `timestamp`, `type`, `is_public`, `from_name`, `message`, `amount`, `url`, `email`, `currency`, `is_subscription_payment`, `is_first_subscription_payment`, `kofi_transaction_id`, `shop_items`, `tier_name`, and `shipping`. Unknown payment fields and nested metadata are retained; `verification_token` is removed. Amounts remain decimal strings and timestamps remain original strings. Optional metadata is not fabricated.

Ko-fi documents retries using the same `message_id`; this is the event idempotency key and mapped event ID. Ko-fi's public documentation supplies no HMAC protocol or authenticated replay-time tolerance. No invented timestamp expiry is imposed, so legitimate delayed retries remain acceptable. Token possession authenticates a delivery; it does not cryptographically sign the remaining body. The provider documents no URL challenge or ping protocol.

The integration does not infer cancellation, refund, or membership-ended events from payments.

## Official evidence and verification limits

Verified on 2026-10-15:

- [API and webhook help](https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook): outbound payment POSTs, HTTP 200 acknowledgement, retry `message_id`, test payments, and no membership-ended notification.
- [Published single-tip payload](https://help.ko-fi.com/hc/article_attachments/16595546601629): `data` wrapper, verification token, `Donation` discriminator, string amount, IDs, supporter fields, and nullable metadata. The example timestamp is 2024-01-25; acceptance proves the published shape, not a live delivery.
- [Published URL setup image](https://help.ko-fi.com/hc/article_attachments/16595465747741): HTTPS receive URL configured manually in the UI.
- [Webhook management](https://ko-fi.com/manage/webhooks): redirected to login during this audit. Its signed-in documentation and full event-type examples were not inspected.

Root trigger contracts validate advertisement, manual setup, token and identity boundaries, malformed bodies, redaction, retry-stable IDs, routing, selection, and mapping against the published example. No live callback, provider registration, payment, authenticated browser, or live E2E was exercised.
