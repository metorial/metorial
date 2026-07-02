Now let me fetch the webhook topics reference page to get a full list of webhook categories:The webhook page didn't render the full list of topics. Let me search for a more complete list:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Shopify

## Overview

Shopify is an e-commerce platform that enables businesses to create and manage online stores, handle inventory, process orders, and sell across multiple channels. The GraphQL Admin API lets you build apps and integrations that extend and enhance the Shopify admin, providing data on products, customers, orders, inventory, fulfillment, and more. The Storefront API offers a full range of commerce options making it possible for customers to view products and collections, add products to a cart, and check out.

## Authentication

Shopify supports two primary authentication methods:

### 1. OAuth 2.0 (Authorization Code Grant)

Shopify uses OAuth 2.0, a widely-recognized protocol for authorizing applications. This is the standard method for apps that need to access store data on behalf of a merchant.

**Flow:**

1. Redirect users to request Shopify access at `GET https://{shop}.myshopify.com/admin/oauth/authorize` with the following parameters:
   - `client_id` (required): The API Key from your app registration.
   - `scope` (required): Comma-separated list of scopes.
   - `redirect_uri` (required): URL where users will be sent after authorization.
   - `state` (required): A random nonce for CSRF protection.
2. If the user accepts your request, Shopify redirects back to your site with a temporary code. Exchange this for an access token via `POST https://{shop}.myshopify.com/admin/oauth/access_token` with `client_id`, `client_secret`, and `code`.
3. Shopify responds with an access token and granted scopes.

**Custom Input:** The shop subdomain (e.g., `my-store` from `my-store.myshopify.com`) is required to construct all authorization and API URLs.

**Access Token Types:**

- **Offline tokens**: Do not expire and are tied to the store. Used for background or long-running tasks.
- **Online tokens**: Tied to a specific user session and expire. Used for apps embedded in the Shopify admin.

**Scopes:** All apps need to request access to specific store data during the app authorization process. Scopes follow the pattern `read_<resource>` or `write_<resource>`. Common scopes include: `read_products`, `write_products`, `read_orders`, `write_orders`, `read_customers`, `write_customers`, `read_inventory`, `write_inventory`, `read_fulfillments`, `write_fulfillments`, `read_draft_orders`, `write_draft_orders`, `read_content`, `write_content`, and many more. If you requested both read and write access scopes for a resource, the read access scope is omitted because it's implied by the write access scope.

Some scopes are protected and require approval from Shopify:

- By default, you have access to the last 60 days' worth of orders. To access all orders, you need to request access to the `read_all_orders` scope.
- By default, apps don't have access to any protected customer data. To access protected customer data, you must meet Shopify's protected customer data requirements.

### 2. Custom App Access Tokens (Admin-created)

You can create a custom app for a store directly in the Shopify admin. To authenticate, the app user installs the app from the Shopify admin to generate API credentials and the necessary API access tokens. This method is simpler and suitable for single-store integrations where OAuth is unnecessary.

Include your token as an `X-Shopify-Access-Token` header on all API queries.

API base URL: `https://{shop}.myshopify.com/admin/api/{api-version}/`

## Features

### Product Management

Create, read, update, and delete products including their variants, images, and metafields. Manage product collections (both manual and automated), product types, and tags. Products can have up to 2,000 variants.

### Order Management

Automate workflows, manage products, customers, orders, and inventory. View and manage orders including creation, updates, cancellation, and closure. Access order transactions, risk assessments, and refunds. With the Draft Order API, retailers can customize or create orders programmatically—ideal for wholesale, special pricing, and B2B scenarios.

### Customer Management

Create and manage customer records, including addresses, tags, and metafields. Access customer order history and account status. Manage customer groups/segments. Handle marketing consent for email and SMS.

### Inventory and Location Management

Query and update stock levels at each location using inventory level objects. Make direct quantity adjustments and view stock on a per-location basis. Manage multiple store locations and track inventory items across them.

### Fulfillment

Manage the fulfillment process, allowing you to route orders to specific warehouses or third-party logistics providers and execute tasks like accepting, holding, or completing an order. Create fulfillments, track fulfillment events, and manage fulfillment services. Support for fulfillment holds and local delivery/pickup workflows.

### Storefront and Headless Commerce

The Storefront API gives you access to commerce capabilities critical for creating highly customized and relevant buyer experiences. Build custom shopping experiences including cart management, checkout, and contextual pricing. Storefront API is device and product-agnostic, enabling developers to build experiences across web, mobile apps, video games, AR/VR, and voice.

### Shipping and Delivery

Control every aspect of shipping. Register carrier services to display real-time shipping rates from providers like FedEx, UPS, or custom services directly at checkout. Manage shipping zones, delivery profiles, and carrier services.

### Discounts and Pricing

Create and manage discount codes, price rules, and automatic discounts. Adjust prices and discounts dynamically based on customer groups, cart values, or campaigns.

### Content Management

Manage pages, blogs, articles, and themes. Access and modify metafields and metaobjects for custom data storage across various resources.

### Sales Channels and Marketplace

Manage product listings and publications across multiple sales channels. Support for collection listings and product availability per channel.

### B2B Commerce

Support for company profiles, company locations, catalogs with custom pricing, and B2B-specific order workflows (available on Shopify Plus).

## Events

Webhooks are divided by topic. Shopify provides webhook topics covering nearly every event in a store's lifecycle. Webhooks can be delivered to HTTPS endpoints, Google Pub/Sub, or Amazon EventBridge. Shopify recommends using Google Pub/Sub whenever possible.

Subscriptions support optional **filters** to conditionally receive events based on resource field values, and **payload modifications** to select only specific fields in the webhook payload.

### Orders

Notifications for order lifecycle events: creation, update, deletion, cancellation, fulfillment, and payment. Also includes order transaction creation and order risk assessment events.

### Products

Events for product creation, update, and deletion. Includes product listing/publication events for sales channels.

### Customers

Events for customer creation, update, deletion, enable, and disable. Also includes customer marketing consent updates, customer tags added/removed, and customer purchasing summary updates.

### Inventory

Inventory level update and connect/disconnect events for tracking stock changes across locations and inventory items.

### Fulfillment

Fulfillment creation and update events on orders. Fulfillment order events including hold, release, moved, rescheduled, and cancellation request lifecycle. Fulfillment event creation and deletion.

### Collections

Events for collection creation, update, and deletion. Collection listing/publication events for sales channels.

### Carts and Checkouts

Cart created and updated events (online store only; custom storefronts are not supported). Checkout creation, update, and deletion events.

### Draft Orders

Events for draft order creation, update, and deletion.

### Disputes

Events fired when a customer creates or updates a dispute. The two events under this category are disputes/create and disputes/update.

### App Lifecycle

Events for app uninstallation, access scope updates, and app subscription changes. For apps distributed through the Shopify App Store, subscribing to the three mandatory compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) is required for GDPR compliance.

### Shop

Events for shop updates and changes to store settings.

### Themes

Events for theme creation, update, deletion, and publication.

### Customer Groups (Saved Searches)

Events for customer group/segment creation, update, and deletion.

### Bulk Operations

Notifies when a Bulk Operation finishes.

### Other Resource Events

Additional webhook topics cover: tender transactions, locales, domains, company contacts and locations (B2B), payment schedules, returns, refunds, subscription contracts, and audit log entries (Shopify Plus only).
