# MoonClerk Integration Specification

MoonClerk's read-only API exposes payment forms, payments, and customers. API
customers correspond to recurring plans in the MoonClerk interface. All six
operations use `GET`; creating or changing records happens in MoonClerk.

## Authentication

Generate a key at <https://app.moonclerk.com/settings/api-key>. Requests use
`https://api.moonclerk.com`, with `Authorization: Token token=YOUR_API_KEY` and
`Accept: application/vnd.moonclerk+json;version=1`. No account ID or configuration
is required, and API keys do not require OAuth refresh.

## Tools

| Tool | Endpoint | Behavior |
| --- | --- | --- |
| `list_forms` | `/forms` | Discover forms and their IDs, titles, currencies, and activity totals. |
| `get_form` | `/forms/:id` | Retrieve one form. |
| `list_payments` | `/payments` | Filter by form, customer, payment date range, or status. |
| `get_payment` | `/payments/:id` | Retrieve one payment, including payment method and custom responses. |
| `list_customers` | `/customers` | Filter plans by form, checkout dates, upcoming payment dates, or status. |
| `get_customer` | `/customers/:id` | Retrieve one plan with subscription, discount, and management details. |

List tools accept optional `count` (1–100) and `offset`; the provider defaults to
10 rows. Date filters use `YYYY-MM-DD` in UTC, with inclusive day boundaries.
Payment statuses are `successful`, `refunded`, and `failed`. Customer statuses are
`active`, `canceled`, `expired`, `past_due`, `pending`, and `unpaid`.

All monetary amounts are in cents. Keys ending in `_reference` identify Stripe
resources. The public `paymentSource` object maps the API's `payment_method`
object. Discount `startedAt` and `endedAt` map `starts_at` and `ends_at`.
Subscription `planId` remains a string representation of the provider ID.
Custom response values and checkout objects retain their provider data.

The API documents throttling via HTTP 429 and temporary failures via HTTP 5xx;
reduce request frequency or retry later as appropriate. Requests have a
30-second timeout. Malformed responses produce a clear error rather than empty
lists or invented record values.

## Scope

The official REST reference includes no profile, account identity, write,
export, or file-download endpoint. Webhook subscriptions are configured in the
MoonClerk interface; this integration currently provides no triggers.

## Official references

- [API overview, authentication, paging, and errors](https://github.com/moonclerk/developer/blob/main/api/README.md)
- [Forms](https://github.com/moonclerk/developer/blob/main/api/v1/forms.md)
- [Payments](https://github.com/moonclerk/developer/blob/main/api/v1/payments.md)
- [Customers](https://github.com/moonclerk/developer/blob/main/api/v1/customers.md)
- [Developer overview](https://www.moonclerk.com/developers/)
- [Webhooks](https://github.com/moonclerk/developer/blob/main/webhooks.md)
