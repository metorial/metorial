# Payhere API specification

This integration connects to Payhere Payments Ltd at [payhere.co](https://payhere.co), using `https://api.payhere.co/api/v1`. It manages payment links and recurring billing through Payhere's Stripe and GoCardless connections.

## Authentication

Use an API key from the merchant admin's [integrations page](https://app.payhere.co/merchants/integrations). Requests send `Authorization: Bearer <api_key>`. The authenticated profile and `who_am_i` both use the documented `GET /user` endpoint. There is no OAuth exchange or token refresh.

Sources: [API authentication](https://developers.payhere.co/docs/api-auth), [current user](https://developers.payhere.co/docs/api-user).

## Supported operations

| Tools | API operations | Notes |
| --- | --- | --- |
| `list_plans`, `create_plan`, `update_plan` | `GET /plans`, `POST /plans`, `PUT /plans/:id` | Plans collect one-off or recurring payments. Updates to price, currency, and quantity display are documented for one-off plans; recurring setup and cancellation options apply to subscription plans. Existing billing-interval and donation-mode update inputs are retained for compatibility, but current update documentation does not list them. |
| `list_payments`, `get_payment` | `GET /payments`, `GET /payments/:id` | Payment details include customer, subscription, and item data. Payment collection happens through the hosted or embedded checkout. |
| `list_customers`, `get_customer` | `GET /customers`, `GET /customers/:id` | Customer details include the provider's payment and subscription histories. |
| `list_subscriptions`, `get_subscription`, `cancel_subscription` | `GET /subscriptions`, `GET /subscriptions/:id`, `DELETE /subscriptions/:id` | Detail includes payment history. Cancellation stops future charges while access remains active until the current period ends. Success requires HTTP 204. |
| `refund_payment` | `POST /refunds` | Full or partial refund in the original payment currency's major units. Reasons: `requested_by_customer`, `duplicate`, or `fraudulent`. Success requires HTTP 204. |
| `get_company`, `update_company` | `GET /current_company`, `PUT /current_company`; optional `GET /current_company/stats` | Statistics are an unwrapped JSON object; payment totals use the reported currency. |
| `who_am_i` | `GET /user` | Read-only identity of the connected user. |

Sources: [plans](https://developers.payhere.co/docs/api-plans), [create plan](https://developers.payhere.co/docs/api-plans-create), [update plan](https://developers.payhere.co/docs/api-plans-update), [payments](https://developers.payhere.co/docs/api-payments), [payment detail](https://developers.payhere.co/docs/api-payment-show), [customers](https://developers.payhere.co/docs/api-customers), [customer detail](https://developers.payhere.co/docs/api-customer-show), [subscriptions](https://developers.payhere.co/docs/api-subscriptions), [subscription detail](https://developers.payhere.co/docs/api-subscription-show), [cancellation](https://developers.payhere.co/docs/api-subscription-destroy), [refunds](https://developers.payhere.co/docs/api-refunds), [company](https://developers.payhere.co/docs/api-current-company-show), [company updates](https://developers.payhere.co/docs/api-current-company-update), [statistics](https://developers.payhere.co/docs/api-current-company-stats).

## Pagination and output compatibility

List tools accept `page` and `perPage`, mapped to `page` and `per_page`. The documented default is 20 records and the maximum is 100. Each response includes current, next, previous, and total page metadata and the total record count.

Existing numeric inputs remain number schemas. Integer identifiers, page values, counts, and billing days are checked at runtime. Monetary amounts remain numbers in currency major units; no amounts or statuses are inferred.

Payhere documents numeric plan `price` and `setup_fee`. Existing string output fields retain their type through direct decimal string conversion. The original numeric values remain available in `raw`. Customer `location` is documented as a structured object; the existing nullable string field uses JSON encoding for structured values. `locationDetails` and `raw` retain the structured data. Original provider records and pagination metadata are available in optional `raw` fields.

## Boundaries

No direct charge or checkout-transaction tool is provided. Digital-download uploads, external-download plan configuration, and REST Hook registration are not exposed by these tools. Payment-link files are delivered by Payhere's checkout. Provider validation and authorization remain authoritative. This specification documents API contracts; no live transactions are required for a code audit.
