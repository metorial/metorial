# <img src="https://provider-logos.metorial-cdn.com/shopify.svg" height="20"> Shopify

Manage e-commerce stores including products, orders, customers, inventory, and fulfillment. Create and update products with variants, images, and metafields. Process and track orders, draft orders, refunds, and transactions. Manage customer records, addresses, and marketing consent. Track and adjust inventory levels across multiple locations. Handle fulfillment workflows including routing to warehouses and third-party logistics. Create and manage discount codes, price rules, and automatic discounts. Configure shipping rates, carrier services, and delivery profiles. Build custom storefronts with cart management and checkout via the Storefront API. Manage content including pages, blogs, articles, and themes. Support B2B commerce with company profiles, catalogs, and custom pricing. Receive webhooks for events across orders, products, customers, inventory, fulfillment, collections, carts, checkouts, disputes, and more.

## Tools

### Create Customer

Create a new customer record in the Shopify store. Supports email, phone, address, tags, notes, and marketing consent.

### Create Fulfillment

Create a fulfillment for an order. Specify the fulfillment order line items, tracking information, and whether to notify the customer. Use Get Order to find fulfillment order IDs first.

### Create Product

Create a new product in the Shopify store. Can include variants, images (by URL), tags, and all product metadata in a single call.

### Delete Product

Permanently delete a product and all its variants from the Shopify store. This action cannot be undone.

### Get Customer

Retrieve full details of a single customer including addresses, order history summary, and marketing consent status.

### Get Order

Retrieve full details of a single order including line items, shipping address, billing address, customer info, transactions, fulfillments, and discount information.

### Get Product

Retrieve a single product by ID with all details including variants, images, and options.

### Get Shop

Retrieve the store's details including name, domain, email, currency, timezone, and plan information.

### List Customers

List or search customers in the Shopify store. Filter by date range or search with a query string that matches against multiple customer fields.

### List Locations

List all store locations. Locations are where inventory is stocked and orders are fulfilled from. Use location IDs with inventory management tools.

### List Orders

Search and list orders from the Shopify store. Filter by status, financial status, fulfillment status, date range, and more. Returns order summaries.

### List Products

Search and list products from the Shopify store. Filter by title, vendor, product type, collection, status, or date range. Returns products with their variants and images.

### Manage Collections

List, create, update, or delete product collections. Supports both **custom** (manual) and **smart** (automated/rule-based) collections. - **list**: List collections of a given type - **get**: Get a single collection by ID - **create**: Create a new collection - **update**: Update an existing collection - **delete**: Delete a collection

### Manage Discounts

Create and manage discount codes and price rules. A price rule defines the discount logic (percentage off, fixed amount, etc.), and discount codes are the customer-facing codes tied to a price rule. Supports: - **list_price_rules**: List all price rules - **create_price_rule**: Create a new price rule - **delete_price_rule**: Delete a price rule - **list_codes**: List discount codes for a price rule - **create_code**: Create a discount code for a price rule - **delete_code**: Delete a discount code - **lookup_code**: Look up a discount code by its code string

### Manage Draft Orders

Create, list, update, complete, or delete draft orders. Draft orders are useful for wholesale, custom pricing, B2B scenarios, and manual order creation. Supports: - **list**: List draft orders with optional status filter - **get**: Get a single draft order by ID - **create**: Create a new draft order with line items - **update**: Update an existing draft order - **complete**: Convert a draft order into a real order - **send_invoice**: Email the invoice to the customer - **delete**: Delete a draft order

### Manage Inventory

View and adjust inventory levels across locations. Supports: - **list**: Query inventory levels by item IDs or location IDs - **set**: Set absolute inventory quantity for an item at a location - **adjust**: Increment or decrement inventory by a relative amount

### Manage Metafields

List, retrieve, create, update, or delete metafields attached to Shopify resources. Use metafields for custom structured data such as specifications, internal IDs, operational notes, and storefront metadata.

### Manage Order

Perform lifecycle actions on an order. Supports: - **close**: Close an order - **open**: Reopen a closed order - **cancel**: Cancel an order with optional reason, email notification, and restocking - **update**: Update order notes or tags

### Manage Pages

List, retrieve, create, update, or delete Shopify online store pages. Pages are useful for static storefront content such as About, FAQ, policy, and campaign pages.

### Manage Variants

Create, update, or delete product variants. Use **action** to specify the operation. - **create**: Add a new variant to a product - **update**: Modify an existing variant's price, SKU, weight, etc. - **delete**: Remove a variant from a product - **list**: List all variants for a product

### Update Customer

Update an existing customer's information including name, email, phone, tags, note, and tax exemption status.

### Update Product

Update an existing product's details including title, description, vendor, type, tags, status, and images. To manage variants use the dedicated variant tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
