# CloudCart API integration

CloudCart API v2 uses JSON:API resources beneath `https://{domain}.cloudcart.net/api/v2`. Connect using the store subdomain and an API key from **Settings > API keys**. Requests send `X-CloudCart-ApiKey` and `application/vnd.api+json`. Authentication uses a static API key; there is no OAuth refresh flow.

## Tool coverage

- Products: `list_products`, `get_product`, `create_product`, `update_product`, `delete_product`.
- Variants and inventory: `list_variants`, `get_variant`, `update_inventory`. Filter `list_variants` by `productId` to discover all inventory IDs. `get_product` with `includeVariants` requests the plural `variants` relationship.
- Orders: `list_orders`, `get_order`, `update_order`. The API completion status is `completed`; the existing `complete` input remains accepted as an alias. Fulfillment status is read-only on orders. The legacy `statusFulfillment` field is retained, but providing it raises a validation error before any changes; use the store admin or separate order-fulfillment API. `usn` means Unique Sale Number.
- Customers: `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer`. `list_customer_groups` discovers group IDs; customer creation and updates assign groups through a relationship.
- Categories and vendors: `list_categories`, `get_category`, `manage_category`, `list_vendors`. Set `parentId` to change a category's parent, or `clearParent: true` on an update to make it a root category.

All 21 tools accept object inputs. List tools return one page; `pageNumber` is a positive integer and `pageSize` is an integer from 1 to 100 (provider default 20). Pagination comes from `meta.page`. Existing summary fields are retained, and `raw` exposes the complete JSON response for reads and successful resource writes. Existing optional string summaries omit provider nulls while `raw` preserves them unchanged. `get_order.desiredDeliveryDate` retains its optional string contract and returns only a genuine provider string; object-valued schedules are available as the additive `desiredDeliveryWindow` and in `raw`. Variant prices are integer minor currency units: `5500` means `55.00`; quantities may be fractional. Product flag inputs remain booleans and are translated into the provider's `yes`/`no` or `1`/`0` representation.

The public API documents catalog, customer, order, and related resources, but no authenticated-user/profile endpoint. Physical store-location resources are not an account identity. No identity tool is fabricated. Webhook triggers, file exports, bulk catalog editing, image uploads, and discount management are outside this integration's registered tool surface.

## Official references

- [Overview and base URL](https://developers.cloudcart.com/2.0/overview)
- [Authentication](https://developers.cloudcart.com/2.0/authentication), [content type](https://developers.cloudcart.com/2.0/content-type), [errors](https://developers.cloudcart.com/2.0/errors), [pagination](https://developers.cloudcart.com/2.0/pagination), [filtering](https://developers.cloudcart.com/2.0/filtering), [includes](https://developers.cloudcart.com/2.0/includes)
- [Product resource](https://developers.cloudcart.com/2.0/products), [create](https://developers.cloudcart.com/2.0/products-create), [update](https://developers.cloudcart.com/2.0/products-update), [list](https://developers.cloudcart.com/2.0/products-list), [get](https://developers.cloudcart.com/2.0/products-get), [delete](https://developers.cloudcart.com/2.0/products-delete)
- [Variant resource](https://developers.cloudcart.com/2.0/variants), [list](https://developers.cloudcart.com/2.0/variants-list), [get](https://developers.cloudcart.com/2.0/variants-get), [update](https://developers.cloudcart.com/2.0/variants-update)
- [Orders](https://developers.cloudcart.com/2.0/orders), [list](https://developers.cloudcart.com/2.0/orders-list), [get](https://developers.cloudcart.com/2.0/orders-get), [update and metadata](https://developers.cloudcart.com/2.0/orders-update)
- [Customers](https://developers.cloudcart.com/2.0/customers), [create](https://developers.cloudcart.com/2.0/customers-create), [update](https://developers.cloudcart.com/2.0/customers-update), [list](https://developers.cloudcart.com/2.0/customers-list), [get](https://developers.cloudcart.com/2.0/customers-get), [delete](https://developers.cloudcart.com/2.0/customers-delete), [groups](https://developers.cloudcart.com/2.0/customer-groups-list)
- [Categories](https://developers.cloudcart.com/2.0/categories), [create](https://developers.cloudcart.com/2.0/categories-create), [update](https://developers.cloudcart.com/2.0/categories-update), [list](https://developers.cloudcart.com/2.0/categories-list), [get](https://developers.cloudcart.com/2.0/categories-get), [delete](https://developers.cloudcart.com/2.0/categories-delete), [vendors](https://developers.cloudcart.com/2.0/vendors-list)
