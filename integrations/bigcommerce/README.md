# <img src="https://provider-logos.metorial-cdn.com/bigcommerce.png" height="20"> Bigcommerce

Manage online stores on BigCommerce. Create, read, update, and delete products, variants, brands, and categories. Process and manage orders, shipments, refunds, and transactions. Handle customer data, addresses, and segments. Create and modify carts and checkouts, process payments, and manage subscriptions. Configure multi-channel and multi-storefront selling across marketplaces, POS, and headless storefronts. Manage content including pages, blog posts, widgets, and themes. Create and track promotions, coupons, gift certificates, and abandoned cart campaigns. Set up price lists with per-channel and per-customer-group pricing. Manage inventory levels across multiple locations. Configure shipping zones, tax rates, and store settings. Subscribe to webhooks for real-time notifications on orders, products, carts, customers, shipments, and inventory changes.

## Tools

### Create Product

Create a new product in the BigCommerce catalog. Supports setting name, type, price, weight, description, SKU, categories, brand, images, variants, and more.

### Delete Product

Permanently delete a product from the BigCommerce catalog by its ID. This action cannot be undone.

### Get Order

Retrieve full details of a single order by ID, including products, shipping addresses, totals, status, payment information, and transactions.

### Get Product

Retrieve detailed information about a single product by its ID. Can include sub-resources like variants, images, custom fields, modifiers, and options.

### Get Store Information

Retrieve the store's profile information including name, domain, address, currency, language, and plan details.

### List Channels

List all sales channels configured for the store. Channels represent different selling venues such as storefronts, marketplaces, POS devices, or social media shops.

### List Customers

Search and list customers. Supports filtering by email, name, company, customer group, date range, and more. Returns paginated results with customer details.

### List Orders

Search and list orders from the store. Supports filtering by status, customer, date range, and more. Returns order details including totals, status, and customer information.

### List Products

Search and list products from the BigCommerce catalog. Supports filtering by name, SKU, brand, category, price range, availability, and more. Returns paginated results with product details.

### Manage Brand

List, create, update, or delete product brands. Brands help organize products and are displayed on the storefront for filtering and navigation.

### Manage Cart

Create, retrieve, update, or delete carts and their line items. Supports creating draft carts with customer association, adding/removing items, and updating quantities.

### Manage Category

List, create, update, or delete product categories. Categories organize products in the catalog and can be nested in a tree structure.

### Manage Coupon

List, create, update, or delete coupons for marketing promotions. Supports percentage, dollar amount, free shipping, and product-specific discount types.

### Manage Customer

Create, update, or delete a customer. When creating, provide first name, last name, and email. When updating, provide the customer ID and the fields to change. Supports managing addresses alongside the customer.

### Manage Order Shipment

Create or update shipments for an order. Use this to mark items as shipped with tracking information, or to list existing shipments for an order.

### Manage Page

List, create, update, or delete content pages. Pages are used for static content like About Us, Contact, Terms & Conditions, etc.

### Manage Price List

List, create, update, or delete price lists. Price lists allow per-variant, per-currency pricing that can be assigned to specific customer groups and channels.

### Manage Subscriber

List, create, update, or delete newsletter subscribers. Subscribers are email addresses registered to receive store newsletters.

### Update Order

Update an existing order's properties such as status, staff notes, customer message, shipping addresses, or billing address. Also supports archiving an order.

### Update Product

Update an existing product's properties. Only the fields provided will be updated; other fields remain unchanged. Can update name, price, description, availability, inventory, categories, and more.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
