# <img src="https://provider-logos.metorial-cdn.com/squarespace.png" height="20"> Squarespace

Manage e-commerce operations for Squarespace merchant sites. Retrieve, create, update, and fulfill orders, including importing orders from third-party channels. Manage products and product variants across physical, service, gift card, and digital products. Track and adjust inventory stock levels across product variants. Manage customer contacts and address book entries through the current Contacts API, while retaining read access to legacy Profiles. Retrieve financial transaction data and contact transaction summaries. Get site information such as name, URL, currency, and time zone. Subscribe to webhooks for order creation and update events.

## Tools

### Create Order

Import an order from a third-party sales channel into Squarespace. The imported order does not affect accounting data. Optionally sends a fulfillment notification to the customer.

### Fulfill Order

Mark a Squarespace order as fulfilled by adding shipment tracking information. Can optionally notify the customer via email. Additional shipments can be added to an order at any time, even if already fulfilled.

### Get Order

Retrieve detailed information for a specific order by its ID. Returns full order details including customer info, line items, fulfillment status, shipping/billing addresses, and financial totals.

### Get Products

Retrieve detailed information for one or more specific products by their IDs. Supports retrieving up to 50 products per request.

### Get Contact

Retrieve a specific Squarespace contact by ID from the current Contacts API, including name, locale, primary email, marketing preference metadata, and default shipping address when available.

### Get Contact Transaction Summaries

Retrieve Squarespace Analytics transaction summaries grouped by contact.

### Get Profile

Retrieve a specific legacy customer profile by ID. Profiles are in maintenance mode in Squarespace's current API docs; use the Contacts tools for new contact workflows.

### Get Site Info

Retrieve basic information about the Squarespace website associated with the current API key or OAuth token. Returns site name, URL, currency, measurement standard, language, time zone, and business location.

### List Orders

Retrieve orders from a Squarespace merchant site. Supports filtering by date range, fulfillment status, and customer. Returns up to 50 orders per request with pagination support.

### List Contacts

Retrieve contacts from Squarespace's current Contacts API. Supports paginated listing and search for customer contacts, marketing subscribers, donors, and address book records.

### List Products

Retrieve products from a Squarespace store. Supports filtering by product type and date range. Returns physical, service, gift card, and download products with their variants and images.

### List Profiles

Retrieve customer profiles from a Squarespace merchant site. Profiles include customers, mailing list subscribers, and donors with their contact information and commerce transaction summaries.

### List Store Pages

Retrieve all Store Pages (product collections) from a Squarespace site. Store pages are required when creating new products — each product belongs to exactly one store page.

### List Transactions

Retrieve financial transactions for orders and donations on a Squarespace merchant site. Includes payment amounts, refunds, processing fees, shipping, tax, and discount details. Supports Squarespace, Stripe, PayPal, and Square payment gateways.

### Manage Contact

Create, update, or delete a Squarespace contact using the current Contacts API.

### Manage Contact Address

List, create, retrieve, replace, or delete Squarespace contact address book entries.

### Manage Inventory

View and adjust stock levels for product variants. Use "retrieve" to get current stock levels, or "adjust" to modify quantities. Adjustments support incrementing, decrementing, setting exact quantities, or marking stock as unlimited.

### Manage Product

Create, update, or delete a product on a Squarespace store. Supports physical, service, gift card, and digital products. Use the "action" field to specify the operation.

### Manage Product Variant

Create, update, or delete a variant for a Squarespace product.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
