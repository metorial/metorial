# Booqable

Booqable manages rental customers, catalog entries, stock, orders, documents,
payments, and customer communication through its company-specific API v4.

## Connection

Create an access token in your Booqable account profile under Authentication
Methods. Enter the token and the company slug from your account URL. Company
identity is verified through `GET /companies/current`. Tokens inherit employee
permissions; access also depends on the account's plan. No OAuth refresh is used.

## Tools

| Area | Tools |
| --- | --- |
| Account | `get_account` |
| Customers | `list_customers`, `get_customer`, `create_customer`, `update_customer`, `archive_customer` |
| Orders | `list_orders`, `get_order`, `create_order`, `update_order`, `manage_order_items` |
| Catalog | `list_products`, `get_product`, `create_product`, `update_product`, `list_product_variations` |
| Inventory | `check_inventory`, `get_inventory_availability`, `manage_stock`, `list_locations` |
| Documents | `list_documents`, `get_document` |
| Payments | `list_payments`, `get_payment`, `create_payment`, `list_payment_methods` |
| Coupons | `manage_coupons` |
| Communication | `list_email_templates`, `send_email` |

## Behavior

- List results preserve provider IDs, attributes, relationships, and returned
  related resources. Lists accept page numbers starting at 1 and page sizes
  from 1 to 100. Total counts are returned only when provided by the API.
- Rental dates represent company-local wall times written using a `Z` suffix;
  do not convert them into actual UTC instants.
- `update_order` saves provided details, then performs a status transition.
  The detail update can succeed even if a later transition fails. Use
  `manage_order_items` for pickups and returns, including partial fulfillment.
  Transitions back to `started` or `stopped` require explicit `revert: true`.
- `list_products` and `get_product` expose product groups. Discover individual
  product IDs with `list_product_variations` for booking and stock operations.
  Historical `priceType: flat_fee` selects the API's `fixed` pricing type.
- `check_inventory` is deprecated in favor of `get_inventory_availability`.
  It retains the inventory-level endpoint's raw
  reporting snapshots. `from` and `till` are required at invocation time.
  `productGroupId` is resolved to its variations. Use
  `get_inventory_availability` for quantities that can actually be booked.
- Payment creation returns the provider's payment record. Check status with
  `get_payment`; creating a record alone does not establish payment success.
  Connected refunds need an original charge ID, and captures need an
  authorization ID. `list_payments.filterStatus` filters only the selected
  page because the common Payments API does not document a status filter;
  totalCount is omitted in that mode.
- Coupon identifiers and discount types are immutable. Create a new coupon
  to change them. Percentage values must be in the range 0–100; cents and
  coupon values must be whole numbers.
- Emails are queued asynchronously. Returned `sent` and `has_error` values
  describe delivery state; the tool does not claim immediate delivery.
- Document tools return metadata and related records. They do not download
  or generate PDF files. No triggers are registered.

## Official reference

[Booqable API v4](https://developers.booqable.com/v4), especially Authentication,
Companies, Customers, Orders, Order Status Transitions, Order Fulfillments,
Product Groups, Products, Inventory Levels, Inventory Availabilities, Stock
Items, Documents, Payments, Payment Charges, Payment Authorizations, Payment
Refunds, Coupons, Email Templates, and Emails.
