# <img src="https://provider-logos.metorial-cdn.com/woocommerce.png" height="20"> Woocommerce

Manage an online store's products, orders, customers, coupons, and shipping configuration. Create, read, update, and delete products with support for variations, inventory tracking, pricing, images, categories, tags, and attributes. Process and manage orders including line items, refunds, order notes, and status updates. Manage customer records with billing and shipping addresses. Configure discount coupons with usage limits, product restrictions, and expiration dates. Set up tax rates, shipping zones, and payment gateways. Access sales reports, top sellers, and store-wide totals. Read and update store settings, manage webhooks, and monitor system status.

## Tools

### Create Customer

Create a new customer account in the store with email, name, billing and shipping addresses.

### Create Order

Create a new order in the store. Add line items, set billing/shipping addresses, apply coupons, and configure shipping and fees. Use setPaid to immediately mark the order as paid.

### Create Product

Create a new product in the WooCommerce store. Supports simple, grouped, external, and variable product types. Configure pricing, inventory, images, categories, tags, and attributes.

### Create Refund

Issue a refund for an order. Specify the refund amount and optionally refund specific line items. Can also list existing refunds for an order.

### Delete Product

Delete a product from the WooCommerce store. By default moves to trash; use force to permanently delete.

### Get Customer

Retrieve detailed information about a specific customer including billing/shipping addresses, order history stats, and account details.

### Get Order

Retrieve complete details of a specific order including line items, shipping, billing addresses, payment info, fees, and tax information.

### Get Product

Retrieve detailed information about a specific product, including pricing, inventory, images, attributes, categories, and variations.

### Get Sales Report

Retrieve sales reports and top sellers data. Get total sales, order counts, average order value, and top-selling products for a given period.

### Get Store Settings

View store settings organized by group (general, products, tax, shipping, checkout, account, email). List all setting groups or retrieve settings within a specific group.

### Get System Status

Retrieve system status information about the WooCommerce installation including environment details, database info, active plugins, and theme info. Useful for diagnostics.

### List Customers

Search and list customer records. Filter by email, role, or search term. Returns customer summaries with order count and total spent.

### List Orders

Search and list orders from the store. Filter by status, customer, product, date range, and more. Supports pagination.

### List Products

Search and list products from the WooCommerce store. Filter by status, type, category, tag, SKU, and more. Supports pagination for browsing large catalogs.

### Manage Coupons

List, get, create, update, or delete discount coupons. Configure discount types (percentage, fixed cart, fixed product), usage limits, product/category restrictions, and expiration.

### Manage Order Notes

List, create, or delete notes on an order. Notes can be private (admin-only) or customer-visible. Useful for tracking order communication and internal notes.

### Manage Payment Gateways

List all payment gateways or update a gateway's settings, including enabling/disabling gateways and changing their title and description.

### Manage Product Categories

List, create, update, or delete product categories. Categories help organize products and can be nested hierarchically.

### Manage Product Variations

List, create, update, or delete variations for a variable product. Use the action field to choose the operation.

### Manage Shipping Zones

List, create, update, or delete shipping zones. View and add shipping methods within zones, and manage zone locations.

### Manage Tax Rates

List, create, update, or delete tax rates. Configure rates by country, state, postcode, and city with options for compound taxes and shipping applicability.

### Update Customer

Update an existing customer's profile including name, email, billing and shipping addresses. Only provided fields will be updated.

### Update Order

Update an existing order's status, addresses, payment method, or customer note. Commonly used to change order status (e.g., mark as completed or on-hold).

### Update Product

Update an existing product's details including name, pricing, inventory, images, categories, tags, and attributes. Only provided fields will be updated.

### Update Store Setting

Update a specific store setting value. Use the Get Store Settings tool first to discover setting group IDs and setting IDs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
