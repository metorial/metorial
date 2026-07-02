Now let me look at the Adobe Commerce webhooks documentation more closely and check what's available natively:Now I have enough information to write a comprehensive specification.

# Slates Specification for Magento

## Overview

Magento (now part of Adobe Commerce) is an open-source eCommerce platform that provides REST, SOAP, and GraphQL APIs for managing online stores. The API allows developers to interact with the Magento system programmatically, enabling integration with third-party applications, automation of processes, and creation of custom functionalities. The API supports both REST and SOAP protocols. It is available in two editions: Magento Open Source and Adobe Commerce (formerly Magento Commerce).

## Authentication

Magento supports three primary authentication methods:

### 1. Token-Based Authentication

As a registered account user, you request a token from the Magento token service at the endpoint that is defined for your user type. The token service returns a unique authentication token in exchange for a username and password for an admin or customer account. To prove your identity, specify this token in the Authorization request header on web API calls.

- **Admin Token**: `POST /rest/V1/integration/admin/token` with `{"username": "admin", "password": "password123"}` in the body. The returned token is passed as `Authorization: Bearer <token>` in subsequent requests.
- **Customer Token**: `POST /rest/V1/integration/customer/token` with customer credentials. Used for customer-scoped operations only.

API Access Tokens are used for temporary authentication as an Admin or Customer and typically expire after a set duration.

### 2. OAuth 1.0a Authentication

Third-party applications use OAuth-based authentication to access the web APIs. The third-party Integration registers with Adobe Commerce. Merchants authorize extensions and applications to access or update store data.

The integration is created in the Magento Admin under **System > Extensions > Integrations**. After activating an integration (self activated), you can use the generated consumer key, consumer secret, access token, and access token secret.

The OAuth flow involves the following endpoints:

- Request token: `POST /oauth/token/request`
- Authorization: `/admin/oauth_authorize`
- Access token: `POST /oauth/token/access`

OAuth 1.0a tokens in Magento do not expire by default. The configuration includes a callback URL and an identity link URL.

### 3. Session-Based Authentication

Currently, API endpoints do not support session-based authentication for admins. Additionally, session-based authentication works only for AJAX calls. This method is primarily for JavaScript widgets running within the Magento storefront or Admin panel.

### Access Control

A user's (administrator, integration, customer, or guest) access rights determine an API call's resource accessibility. Resources and permissions are assigned to each integration or user account through the Admin panel. The base URL for all API calls is `https://<your-magento-domain>/rest/<store_code>/V1/`.

### Adobe Commerce as a Cloud Service (SaaS)

In previous versions of Adobe Commerce, you would use authentication tokens to authorize your requests to the REST API. In Adobe Commerce as a Cloud Service, you must use Adobe Identity Management Service (IMS) to authenticate your requests.

## Features

### Product & Catalog Management

Add, update, and delete products programmatically. Manage the full product catalog including simple, configurable, bundle, grouped, and virtual product types. Assign categories, manage product images and media, handle product attributes, configure product links (related, upsell, cross-sell), and manage product websites.

### Order Management

You can create, track, and update orders using the REST API. It supports automation of the order workflow. This includes the full order lifecycle: creating quotes/carts, adding items, setting shipping and billing addresses, estimating shipping costs, placing orders, creating invoices, creating shipments, and processing credit memos (refunds).

### Customer Management

Manage customer accounts and information. Create, update, and retrieve customer profiles, manage customer addresses, handle customer groups, and access customer-specific data such as order history and cart contents.

### Inventory Management

Those features support workflow automation for: Managing sources and stocks. Creating stocks and assigning sources to them. Assigning products to a source and searching for source items. Checking whether a product from a specific stock is salable. Multi-source inventory (MSI) support was introduced in Magento 2.3, enabling management across multiple warehouses and locations.

### Shopping Cart & Checkout

The API supports the full shopping experience: creating carts for logged-in customers and guests, adding/removing items, applying coupon codes, estimating shipping methods, setting payment methods, and placing orders. Guest carts use a masked quote ID for security.

### CMS Content Management

Manage CMS pages and blocks through the API. Create and update static content pages and reusable content blocks used throughout the storefront.

### Category Management

Create, update, delete, and reorder product categories. Manage category trees, assign products to categories, and configure category attributes.

### Store Configuration

Access and manage store configuration settings, including store views, websites, and store groups. Retrieve currency information, country lists, and other store-level configuration data.

### Search & Filtering

The searchCriteria query parameter enables you to search across multiple objects which are in a collection. Use filter groups, sort orders, and pagination to query products, orders, customers, and other entities with complex criteria.

### Tax & Pricing

Manage tax rules, tax rates, tax classes, and tier pricing. Configure special pricing, group pricing, and catalog/cart price rules.

### B2B Features (Adobe Commerce only)

Adobe Commerce editions include additional B2B capabilities such as company account management, shared catalogs, negotiable quotes, requisition lists, and purchase orders.

## Events

Magento 2 itself doesn't have a native implementation of webhooks. However, you can implement webhook-like functionality using Magento 2 events and observers.

### Adobe Commerce Webhooks (Adobe Commerce only)

Webhooks enable developers to configure synchronous logic to execute calls to external systems when an Adobe Commerce event triggers. These are available in Adobe Commerce (paid edition) and are configured via XML configuration files or REST API endpoints.

Webhook events are tied to Magento's internal plugin and observer system. The response contains the webhook name and the type of plugin that calls the webhook, (before or after). Examples include events like `observer.catalog_product_save_after`, `observer.checkout_cart_product_add_before`, and similar events covering:

- **Product Events**: Triggered when products are created, updated, or deleted.
- **Order Events**: Triggered on order placement, status changes, invoicing, and shipment creation.
- **Customer Events**: Triggered on customer registration, account updates, and login.
- **Cart & Checkout Events**: Triggered on cart modifications, checkout initiation, shipping estimation, and payment processing.
- **Inventory Events**: Triggered on stock level changes and source item updates.

Webhooks can be subscribed to via the `POST /V1/webhooks/subscribe` endpoint and managed with `GET /V1/webhooks/list` and `POST /V1/webhooks/unsubscribe`. You can now define conditional webhooks that run only when configured conditions are met.

Synchronous calls are required when Commerce needs to immediately compute or validate something (order totals, taxes, payments) using a 3rd-party endpoint and write the result back into Adobe Commerce. For asynchronous event-driven workflows, Adobe recommends using Adobe I/O Events instead.

### Magento Open Source

Magento Open Source does not include built-in webhook support. Webhook-like functionality requires third-party extensions (e.g., Mageplaza Webhook) or custom development using Magento's observer pattern to dispatch HTTP callbacks to external URLs on specific events.
