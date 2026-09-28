# Square

Process payments and refunds, manage orders and invoices, maintain customers,
catalogs and inventory, and discover merchant locations. Create hosted checkout
links, save cards, manage subscriptions, and inspect payouts and disputes.
Receive verified events for eleven Square resource families.

## Connect

Choose OAuth or a personal access token and select **production** or **sandbox**
when connecting. Credentials, API calls, and events use that environment. OAuth
connections refresh automatically. Merchant identity, application identity, and
permissions are discovered from Square; you do not need to enter merchant IDs.

Tools request the permissions needed for their operations. Collecting or refunding
application fees also requires `PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS`. Reconnect
if the connection lacks a newly needed permission. API requests use version
`2026-09-16`.

## Tools

| Area | Operations |
| --- | --- |
| Payments | List, retrieve, create, capture, cancel, update an authorization, or cancel by creation idempotency key. |
| Refunds | Create, list, and retrieve payment-linked refunds. |
| Orders | Create, retrieve, search, update, and pay orders. |
| Customers | Create, retrieve, list, search, update, and delete profiles. |
| Catalog | Search items/objects, retrieve, upsert, and delete objects. |
| Inventory | Retrieve counts and apply adjustments or physical counts. |
| Invoices | Create, retrieve, list, search, update, publish, cancel, and delete drafts. |
| Discovery | List/retrieve locations and retrieve the authenticated merchant. |
| Payment links | Create quick-pay or itemized checkout links; list, retrieve, update, and delete links. |
| Saved cards | Create, list, retrieve, and disable tokenized cards associated with customers. |
| Subscriptions | Create, search, retrieve, update, and schedule cancellation. |
| Payouts | List/retrieve payouts and inspect payout entries. |
| Disputes | List/retrieve disputes, their payment IDs, states, and response deadlines. |

There are 52 tools. List/search responses expose pagination cursors. Use discovery
results for resource IDs and the latest version from a retrieval before versioned
writes. Monetary inputs use integer minor units in their specified currency.
Supply a stable idempotency key when retrying a creation request.

Catalog upserts replace complete objects and nested children. Retrieve the object
before updating it and preserve children you want to keep. Order and invoice
updates instead apply sparse fields and UID-based child changes. Inventory
movement uses an adjustment with source and destination locations.

Subscription cancellation is scheduled at the end of the billing period and can
leave the subscription `ACTIVE` until its cancellation date. Disputes and payouts
are read-only. API invoice delivery supports email and manually shared links.

## Events

One application webhook receives payment, refund, order, customer, invoice,
catalog, inventory, booking, dispute, subscription, and loyalty events.
Inventory notifications include all changed counts. Booking notifications use
buyer-level access; seller-level access requires the additional Square permission
`APPOINTMENTS_ALL_READ`.

Configure a webhook once per Square application and environment. Square webhook
subscriptions belong to an application and cannot be created with seller OAuth
tokens. Use the Square Developer Console to register the supplied notification
URL and event list, then complete setup with the application ID, environment, and
subscription signature key **before testing delivery**. Platform applications can
share a registration across their authorized merchants; customer-owned applications
use their own registration.

Every delivery is verified against the exact registered URL and raw payload.
Events route to the matching application, environment, and merchant. Old deliveries
outside the 24-hour retry window plus five minutes are rejected; repeated event
IDs are deduplicated.

## References

- [Square API reference](https://developer.squareup.com/reference/square)
- [OAuth permissions](https://developer.squareup.com/docs/oauth-api/square-permissions)
- [Webhook subscriptions](https://developer.squareup.com/reference/square/webhook-subscriptions-api)
- [Verify webhook signatures](https://developer.squareup.com/docs/webhooks/step3validate)
