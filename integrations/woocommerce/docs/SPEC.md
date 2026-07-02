Now let me get the full list of API resources available:Now I have enough information to write the specification.

# Slates Specification for WooCommerce

## Overview

WooCommerce is an open-source e-commerce plugin for WordPress that turns any WordPress site into an online store. It provides a REST API (currently v3) for programmatic access to store data including products, orders, customers, coupons, and shipping configuration. WooCommerce is fully integrated with the WordPress REST API, allowing data to be created, read, updated, and deleted using JSON requests and standard HTTP verbs.

## Authentication

WooCommerce supports two primary authentication methods, depending on whether the connection uses HTTPS or HTTP.

### API Key Authentication (Basic Auth over HTTPS)

The recommended and simplest method. Pre-generated keys can be used to authenticate use of the REST API endpoints. Keys can be generated either through the WordPress admin interface or auto-generated through an endpoint.

To generate keys:

1. Navigate to WooCommerce > Settings > Advanced > REST API in the WordPress admin.
2. Click "Add Key", provide a description, select a WordPress user, and choose a permission level.
3. Choose the level of access for the REST API key, which can be Read access, Write access, or Read/Write access.
4. Click Generate API Key, and WooCommerce creates a Consumer Key and Consumer Secret.

Over HTTPS, the Consumer Key is used as the username and the Consumer Secret as the password via HTTP Basic Authentication. Alternatively, the consumer key and secret can be provided as query string parameters (`consumer_key` and `consumer_secret`).

Use of the REST API with the generated keys will conform to the associated WordPress user's roles and capabilities.

The base URL for all API requests is: `https://{your-site}/wp-json/wc/v3/`

### OAuth 1.0a Authentication (over HTTP)

Required when the site does not support HTTPS. This follows the spec for simple OAuth 1.0a authentication (RFC 5849) with two exceptions: there is no token associated with request/responses, only consumer keys/secrets are used.

The required parameters are: `oauth_consumer_key`, `oauth_timestamp`, `oauth_nonce`, `oauth_signature`, and `oauth_signature_method`. The OAuth parameters may be added as query string parameters or included in the Authorization header.

### Auto-Generated Keys (Application Authentication Endpoint)

WooCommerce provides an endpoint (`/wc-auth/v1/authorize`) that any app can use to allow users to generate API keys for that app. This makes integration easier because the user only needs to grant access via a URL. After being redirected back to the app, the API keys are sent back in a separate POST request.

Required parameters for this flow:

- `app_name`: Your application name
- `scope`: Level of access — `read`, `write`, or `read_write`
- `user_id`: User ID in your app (for internal reference)
- `return_url`: URL the user is redirected to after authorization
- `callback_url`: URL that will receive the generated API key (must be HTTPS)

## Features

### Product Management

Create, read, update, and delete products including simple, grouped, external, and variable product types. Manage product images (via URL or base64), product variations, inventory/stock levels, pricing, and sale scheduling. Supports product categories, product tags, product attributes, product shipping classes, and product reviews.

- Products can be filtered by status, type, category, tag, SKU, and other attributes.
- Product images can be uploaded via URL or base64-encoded data, with support for multiple images and specifying the main image.

### Order Management

Full CRUD operations on orders, including line items, shipping lines, fee lines, tax lines, and coupon lines. Manage order statuses (pending, processing, on-hold, completed, cancelled, refunded, failed) and order notes.

- Orders can be filtered by status, customer, product, and date range.
- Supports creating and listing order refunds.
- Orders can be marked as paid on creation, which sets the status to processing and reduces stock items.

### Customer Management

Create, read, update, and delete customer records including billing and shipping addresses. List a customer's available downloads and order history.

- Customers can be filtered by email and role.

### Coupon Management

Full CRUD operations on discount coupons. Configure discount types (percentage, fixed cart, fixed product), usage limits, product/category restrictions, minimum/maximum spend, free shipping eligibility, and expiration dates.

- Coupons support usage limits (total and per-user) and can be restricted to specific products or categories.

### Tax Configuration

Manage tax rates and tax classes. Create, update, and delete tax rates with configuration for country, state, postcode, city, rate percentage, tax name, priority, compound status, and shipping applicability.

### Shipping Configuration

Manage shipping zones, shipping zone methods, and shipping zone locations. Configure shipping methods within zones with customizable settings.

### Reports

Access sales reports, top sellers reports, and totals reports for coupons, customers, orders, products, and reviews.

### Store Settings

Read and update WooCommerce store settings organized by setting groups (e.g., general, products, tax, shipping, checkout, account, email).

### Payment Gateways

List and update payment gateway settings, including enabling/disabling gateways and adjusting their configuration.

### Webhook Management

Create, read, update, and delete webhooks programmatically via the REST API. Configure webhook topics, delivery URLs, secret keys, and status.

### System Status

Access system status information about the WooCommerce installation, including environment details, database info, active plugins, theme info, and settings. Useful for diagnostics and monitoring.

## Events

WooCommerce supports webhooks that send HTTP POST requests to a configured delivery URL when specific events occur in the store.

### Coupon Events

Triggered when coupons are created, updated, deleted, or restored.

- Topics: `coupon.created`, `coupon.updated`, `coupon.deleted`, `coupon.restored`

### Customer Events

Triggered when customers are created, updated, or deleted.

- Topics: `customer.created`, `customer.updated`, `customer.deleted`

### Order Events

Triggered when orders are created, updated, deleted, or restored.

- Topics: `order.created`, `order.updated`, `order.deleted`, `order.restored`

### Product Events

Triggered when products are created, updated, deleted, or restored.

- Topics: `product.created`, `product.updated`, `product.deleted`, `product.restored`

### Action Events

It's possible to use webhooks with WooCommerce actions, e.g., create a webhook for use every time a product is added to the shopping cart, using the action `woocommerce_add_to_cart`. This allows listening to any WooCommerce action hook as a webhook trigger.

### Webhook Configuration Options

- **Status**: Active (delivers), Paused (does not deliver), or Disabled (delivery failed).
- **Secret**: A secret key that generates an HMAC-SHA256 hash of the payload, included in request headers for verification. Defaults to the current API user's consumer secret if not set.
- **Custom Topics**: Advanced users can add custom webhook topics using the `woocommerce_webhook_topic_hooks` filter.
- After 5 consecutive failed deliveries (non-2xx response), the webhook is automatically disabled.
- Webhooks may be delivered more than once; endpoints should handle duplicate deliveries gracefully.
