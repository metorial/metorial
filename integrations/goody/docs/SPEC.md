# Goody

Goody automates physical gifting through its Automation and Commerce REST APIs. Gifts can be sent without a mailing address: recipients use their gift link to choose options and supply their shipping details.

## Authentication

Supply a Goody bearer API key and select its production or sandbox environment when connecting. Automation keys identify a user by email; Commerce keys identify an app by its public app ID. The environments have separate accounts and credentials. API keys do not use OAuth or token refresh.

Production uses `https://api.ongoody.com`; sandbox uses `https://api.sandbox.ongoody.com`. The read-only `get_current_user` tool verifies the connected identity. Existing connections retain their stored environment selection.

## Tools

| Area | Tools | Provider endpoints |
| --- | --- | --- |
| Identity | `get_current_user` | `GET /v1/me` |
| Catalog | `list_products`, `get_product`, `list_brands`, `list_cards` | `/v1/products`, `/v1/products/{id}`, `/v1/brands`, `/v1/cards` |
| Curated gifts | `list_collections`, `get_collection` | `/v1/collections`, `/v1/collections/{id}` |
| Sending and estimates | `send_gift`, `calculate_batch_price` | `POST /v1/order_batches`, `POST /v1/order_batches/price` |
| Batch tracking | `list_order_batches`, `get_order_batch`, `list_order_batch_orders`, `list_order_batch_recipients` | `/v1/order_batches`, `/v1/order_batches/{id}`, `/v1/order_batches/{id}/orders`, `/v1/order_batches/{id}/recipients` |
| Order lifecycle | `list_orders`, `get_order`, `cancel_order`, `update_order_expiration`, `list_order_activities` | `/v1/orders`, `/v1/orders/{id}`, `/v1/orders/{id}/cancel`, `/v1/orders/{id}/update_expiration`, `/v1/order_activities` |
| Funding and workspaces | `list_payment_methods`, `list_workspaces` | `/v1/payment_methods`, `/v1/workspaces` |

## Workflows and constraints

- Discover products, cards, and workspaces before sending. Published collections provide a product ID that can be sent through `send_gift`; collections must permit gift swapping.
- `send_gift` supports `email_and_link` and `link_multiple_custom_list`. A message requires a greeting card. Optional client reference IDs prevent duplicate batches: Goody rejects a repeated reference. International shipping and international gift-card options are available when supported by the account.
- Pricing is an estimate in USD cents. Supplying approved-partner mailing addresses enables `direct_send` pricing, including calculated tax and totals when available. This integration does not send Direct Send orders.
- Batches with more than ten recipients process asynchronously. Scheduled batches do not create orders until the scheduled time. Retrieve all original recipients independently of created orders with `list_order_batch_recipients`.
- Paginated endpoints accept page numbers starting at 1 and page sizes from 1 to 100. Order listings support creation-time filters; activity history supports event-time and status filters.
- Cancellation is available before gift acceptance. Expiration updates send Goody's `expiration` request field and return the updated order expiration.
- Payment methods expose their display name, available balance, and cardholder name when available. Card-specific details are null when the provider omits them.
- Order cart items do not have a documented unit price. `get_order.cartItems[].price` is returned only if the provider supplies it; use the order's aggregate `amounts` for costs. No price is invented from current catalog values.
- Image URLs and gift links are references to provider resources. These tools do not download or generate files. Webhook subscriptions and event triggers are not provided.

## Official documentation

- [API contract](https://developer.ongoody.com/goody-api-openapi.json)
- [Automation authentication](https://developer.ongoody.com/automation-api/authentication)
- [Commerce authentication](https://developer.ongoody.com/commerce-api/authentication)
- [Create an order batch](https://developer.ongoody.com/api-reference/order-batches/create-an-order-batch)
- [Pricing](https://developer.ongoody.com/api-reference/order-batches/calculate-the-price-for-an-order-batch)
- [Expiration updates](https://developer.ongoody.com/api-reference/orders/update-expiration-for-an-order)
- [Collections](https://developer.ongoody.com/api-reference/collections/list-all-collections)
- [Order activity history](https://developer.ongoody.com/api-reference/order-activities/list-all-order-activities)
