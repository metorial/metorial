# Square integration specification

## API and authentication

- API version: `2026-09-16`.
- OAuth and personal access tokens support production and sandbox.
- Environment belongs to authentication, not integration configuration.
- Token introspection discovers application ID, merchant ID, permissions, and expiry.
- OAuth refresh preserves a refresh token when Square does not replace it.
- Tool permissions are explicit; application fees require additional-recipient permission.

## Tool contract

52 tools cover payments/refunds (7), orders (5), customers (6), catalog (4),
inventory (2), invoices (6), merchant/location discovery (3), payment links (5),
cards (4), subscriptions (5), payouts (3), and disputes (2).

Inputs serialize to object schemas. Money is integer minor units; optional
idempotency keys permit safe caller-controlled retries. IDs and concurrency
versions are returned for downstream operations. API failures and incompatible
inputs return actionable errors.

Catalog upserts replace full objects and return temporary-to-permanent ID mappings.
Catalog search distinguishes object queries from item-specific filters. Customer
updates support explicit clearing. Inventory writes use the current adjustment and
physical-count models. Payment completion/update uses concurrency tokens. Invoice
outputs expose payment requests, recipients, versions, and public URLs. Subscription
cancellation represents the scheduled cancellation date rather than assuming an
immediate terminal state. Payout and dispute tools do not perform financial writes.

## Event contract

One manual application webhook group selects eleven resource families:
payments, refunds, orders, customers, invoices, catalog, inventory, bookings,
disputes, subscriptions, and loyalty. Setup stores the exact HTTPS URL, signature
key, application ID, and environment. Applications are configured once per
environment; OAuth seller credentials cannot manage application subscriptions.

Verify Square HMAC-SHA256 over the exact saved URL plus raw request bytes, then
validate the envelope and signed creation timestamp. A 24-hour retry period plus
five minutes is accepted, with five minutes of future clock tolerance. Route by
application/environment/merchant and deduplicate by provider event ID. Unsigned
request headers cannot establish identity or freshness. Inventory arrays remain
complete; catalog events expose the catalog update timestamp.

## Verification

All tool schemas have regression coverage. Webhook contracts test setup, signature,
routing, payloads, timestamp boundaries, malformed requests, and family selection.
The private sandbox suite defines all 52 tool scenarios with owned-resource cleanup.
Actual live verification requires provisioned sandbox credentials. Payout-detail
scenarios require an existing sandbox payout fixture when no payout can be generated.

## Boundaries

Booking, loyalty, gift-card, team, device, vendor, and custom-attribute tools are not
implemented. Existing booking and loyalty event notifications remain supported.
No legacy compatibility contracts or automatic per-seller webhook lifecycle exist.

[Official API reference](https://developer.squareup.com/reference/square)
