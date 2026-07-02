Let me get more details on the OAuth scopes and the Forms API.Now let me check for the Forms API details.I now have enough information to write the specification.

# Slates Specification for Squarespace

## Overview

Squarespace is a website builder, hosting service, and e-commerce platform that allows users to create and manage websites and online stores. Its API focuses on commerce functionality, providing programmatic access to products, orders, inventory, customer profiles, and financial transactions for Squarespace merchant sites.

## Authentication

Squarespace supports two authentication methods:

### 1. API Key (Bearer Token)

Depending on your development needs, you can use a generated API key or start the OAuth process with Squarespace to become a registered OAuth client.

To generate an API key:

- With Squarespace's Commerce Advanced plan, you can develop a custom application for a Squarespace merchant site.
- Log in to a Squarespace site. In the left nav, click Settings; scroll down and click Advanced. Click Developer API Keys. Click the GENERATE KEY button. In the dialog, add a key name under "KEY NAME", and select one or more Commerce APIs under "PERMISSIONS" and permission level.
- For security reasons, this is the only time the API key is visible. API keys will never expire as long as the merchant site remains active.
- Requests only have access to data for the website that owns the API key or OAuth access token.

API keys are passed as Bearer tokens in the `Authorization` header:

```
Authorization: Bearer YOUR_SECRET_API_KEY
```

Permission scopes available when generating a key: Orders, Forms, Inventory, Transactions — each with Read Only or Read and Write levels.

### 2. OAuth 2.0 (Authorization Code Flow)

A Squarespace merchant site can use both API keys and OAuth for data access, but Squarespace Extensions are required to use OAuth.

**Registration:** Before a client can make Squarespace API calls, the client must be registered with Squarespace as an OAuth client. Submit the following information via this form. Required information includes: client name, icon image, redirect URI(s), initiate URL, and links to terms and privacy policy. Squarespace responds with a `client_id` and `client_secret`.

**Authorization endpoint:**

```
GET https://login.squarespace.com/api/1/login/oauth/provider/authorize
```

Required query parameters:

- `client_id` — Provided by Squarespace during registration
- `redirect_uri` — Must match a registered redirect URI
- `scope` — Comma-separated list of permission scopes
- `state` — Random value for CSRF protection

**Available OAuth scopes:**
| Scope | Description |
|---|---|
| `website.orders` | Send order data and mark orders as fulfilled |
| `website.orders.read` | View order and fulfillment information |
| `website.transactions.read` | Access transactional order and donation data |
| `website.inventory` | View and update inventory stock levels |
| `website.inventory.read` | View inventory stock levels |
| `website.products` | View and modify product information |
| `website.products.read` | View product information |

**Token endpoint:**

```
POST https://login.squarespace.com/api/1/login/oauth/provider/tokens
```

The `Authorization` header must use Basic auth with base64-encoded `client_id:client_secret`. Access tokens expire after 30 minutes. For long-term access, include `access_type=offline` in the authorize request to receive a refresh token (expires after 7 days). Each refresh token is single-use — using it returns a new access and refresh token pair.

Optional parameter `website_id` can be passed to the authorize endpoint when the OAuth flow is initiated from within Squarespace (it is provided as a query parameter on the initiate URL).

## Features

### Inventory Management

Read and adjust stock information for product variants. Allows retrieving current stock levels for all or specific product variants and adjusting stock quantities. Useful for syncing inventory across multiple sales channels.

### Order Management

Access order history for one-time purchases and subscription orders or import orders from third-party sales channels. Supports retrieving orders (with filtering by date and fulfillment status), marking orders as fulfilled with tracking information, and creating orders from external sources. Orders can be filtered by modification date range and fulfillment status.

### Product Management

Manage physical, service, gift card, and download products, including their images and variants (if supported). This API allows products to be retrieved, added, deleted, or modified with information such as a name or URL slug, a variant's color, size, or weight, or a new product image. Also supports retrieving Store Pages (collections of products). Note: download products cannot be created or deleted via v2 API.

### Customer Profiles

Retrieve customers, mailing list subscribers, and donors that are traditionally accessible through the Profiles panel. Profiles are read-only and can be filtered and retrieved in bulk or individually.

### Financial Transactions

Use the Transactions API to access financial transactions for orders and donations made on a Squarespace merchant site. The Transactions API supports the following payment gateways: SQUARESPACE, STRIPE, PAYPAL, and SQUARE. Transactions include totals for item sales, discounts, fees, shipping, taxes, and refunds. Only refunds initiated through Squarespace are captured.

### Site Information

Use the Authorization API endpoint to identify which website is associated with an API key or OAuth token. The response provides basic site information including site name, URL, currency, measurement standard, language, time zone, and business location.

### Forms (Zapier-only)

Forms API (for Zapier integration) is available on Core, Plus, Advanced, Business, Commerce Basic, and Commerce Advanced plans. The Forms API is designed specifically for Zapier integration to receive form submission data. It is not part of the general Commerce API documentation and is used primarily to trigger automated workflows from form submissions.

## Events

Squarespace supports webhooks via the Webhook Subscriptions API. Instead of making repeated API calls, a client may subscribe to notifications from Squarespace for supported system events. To receive notifications from Squarespace for a merchant site, create a webhook subscription using the Webhook Subscriptions API. Subscriptions never expire.

Webhook subscriptions require OAuth authentication (not API keys). Each notification includes a signature header for verification. The Squarespace website has reached its limit of 25 webhook subscriptions.

### Commerce Order Events

- **`order.create`** — Occurs when an order is created on a Squarespace merchant site. Requires OAuth access to the Orders API.
- **`order.update`** — Occurs when an existing order is updated on the merchant site. Requires OAuth access to the Orders API.

### Extension Events

- **`extension.uninstall`** — Occurs when a user uninstalls an extension (OAuth client) from their Squarespace site. Useful for cleanup when a user disconnects the integration.
