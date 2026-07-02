# Slates Specification for BigCommerce

## Overview

BigCommerce is a SaaS ecommerce platform that enables businesses to create and manage online stores. It provides REST and GraphQL APIs for managing products, orders, customers, carts, checkouts, payments, content, and multi-channel selling. It supports both hosted (Stencil) and headless storefront architectures.

## Authentication

BigCommerce supports two primary authentication approaches for API access:

### 1. Store-Level API Credentials (Access Token)

Merchants generate single-store API credentials when they create API accounts in their store control panel, in the Settings > Store-level API accounts menu. Use these credentials to read and change one store's data with BigCommerce's APIs.

When creating a store-level API account, you receive:

- **Access Token**: A static token that does not expire
- **Client ID**: Uniquely identifies the client
- **Client Secret**: A cryptographically secure value
- **API Path**: The base URL for requests (e.g., `https://api.bigcommerce.com/stores/{store_hash}/`)

Most REST endpoints and GraphQL Admin API endpoints use the X-Auth-Token header to authenticate. The X-Auth-Token header uses access tokens to authenticate requests. Create an OAuth API account to generate access tokens. Pass the access token as the value of the X-Auth-Token header.

Example request:

```
GET https://api.bigcommerce.com/stores/{store_hash}/v3/catalog/products
X-Auth-Token: {access_token}
Accept: application/json
```

The client ID and client secret will never change; access tokens do not expire based on time and cannot be manually invalidated.

### 2. App-Level OAuth2 (Authorization Code Grant)

For multi-store apps that need to be installed on multiple stores:

BigCommerce uses a modified version of the OAuth2 authorization code grant.

The flow works as follows:

1. A merchant installs the app from the BigCommerce control panel.
2. BigCommerce redirects to the app's **Auth Callback URL** with a temporary `code`, `context` (store hash), and `scope`.
3. To generate an access_token for the merchant's store, send a POST request to `https://login.bigcommerce.com/oauth2/token`.
4. The request body must include: `client_id`, `client_secret`, `code`, `scope`, `grant_type` (always `authorization_code`), `redirect_uri`, and `context`.
5. BigCommerce responds with an access token unique to that store.

You can create app-level API accounts in the Developer Portal. App-level API accounts expect each application to generate a unique access token for every store that installs the app.

### OAuth Scopes

Configure your API account with the minimum set of OAuth scopes that your implementation needs. Key scope categories include: Products, Orders, Customers, Content, Marketing, Carts, Checkouts, Channel Listings, Store Information, Storefront API Tokens, and Store Logs. Each scope can typically be set to `read-only`, `modify`, or `none`.

### Store Hash

All API requests require a **store hash**, which is a unique identifier for the store. It is part of the API path: `https://api.bigcommerce.com/stores/{store_hash}/v3/...`

## Features

### Product Catalog Management

Create products, variants, brands, category trees, bulk pricing, and more. Manage product images, videos, custom fields, reviews, modifiers, variant options, and metafields. Supports product channel and category assignments for multi-storefront scenarios.

### Order Management

Create, read, update, and archive orders. Manage order shipments, shipping addresses, coupons, messages, taxes, transactions, and refunds. Supports order status tracking and payment actions including capture, void, and refund.

### Customer Management

Manage customer data, customer groups and segments, and storefront sign in. Includes customer addresses, attributes, consent management, stored payment instruments, and form field values. Supports customer segmentation with shopper profiles.

### Cart and Checkout

Customize the cart experience, modify the contents of a cart and create draft carts with full read and write access. Build custom checkout experiences outside of your BigCommerce storefront with the Checkout API. Through headless commerce capabilities, developers can use this API alongside the Payments API to create use cases such as subscriptions, recurring orders and more. Manage billing addresses, consignments, coupons, gift certificates, and discounts within checkouts.

### Payments

Combined with the Checkout API, the Payments API allows developers to build a fully-customizable checkout experience. Merchants can process credit card and stored card payments through BigCommerce payment services, and create subscription apps and recurring orders.

### Multi-Channel and Multi-Storefront

Integrate with point-of-sale devices, headless storefronts, online marketplaces, and social networking sites. Manage sales channels and sites, then use the Catalog API to assign products to your channels. Includes channel-specific settings, currency assignments, listings, and menus. Manage global store configuration and add overrides to support distinct experiences on each storefront.

### Content Management

Manage pages, blog posts, blog tags, widgets, widget templates, themes, email templates, banners, redirects, and custom template associations. Supports the Script Manager for injecting custom scripts into storefronts.

### Marketing

Manage coupons, gift certificates, promotions (with coupon codes), banners, and abandoned cart email templates. Supports promotion rules for products, orders, shipping, categories, brands, and customers.

### Pricing

Create and manage price lists with per-variant, per-currency pricing records. Assign price lists to specific channels and customer groups.

### Inventory and Locations

Manage inventory levels at specific locations with absolute and relative adjustments. Create and manage physical locations for buy-online-pick-up-in-store (BOPIS) workflows.

### Shipping and Tax

Configure shipping zones, methods, carrier connections, and customs information. Manage tax classes, properties, rates, zones, and settings. Supports integrating third-party shipping and tax providers.

### Store Settings and Configuration

Manage store profile, locale, logo, SEO settings, search filters, analytics providers, storefront security, and catalog settings. Includes currency management and units of measurement.

### GraphQL APIs

BigCommerce provides GraphQL APIs for storefront queries (products, customers, carts, checkout), admin operations, and account-level management. By leveraging the power of GraphQL, data for multiple resources can be returned from a single API call.

### Subscribers and Wishlists

Manage newsletter subscribers and customer wishlists including wishlist items.

## Events

BigCommerce supports webhooks that send HTTP POST callbacks to a specified destination URL when events occur on a store. Callback payloads have a uniform structure, including the minimum information to uniquely identify what event occurred, on what store, with respect to what data, and at what time. Webhooks can be scoped to specific channels.

### Orders

Events for order created, updated, archived, status updated, message created, refund created, transaction created/updated, and order metafield changes.

### Products

Events for product created, updated, deleted, inventory updated (both direct and order-triggered). Also includes product metafield and variant metafield events.

### Carts

Events for cart created, updated, deleted, abandoned, converted (to order), coupon applied, and cart metafield changes.

### Cart Line Items

Events for line item created, updated, and deleted within a cart.

### Customers

Events for customer created, updated, deleted, address created/updated/deleted, and default payment instrument updated.

### Categories

Events for category created, updated, deleted, and category metafield changes.

### SKUs (Variants)

Events for SKU created, updated, deleted, and inventory updated (both direct and order-triggered).

### Shipments

Events for shipment created, updated, and deleted.

### Subscribers

Events for subscriber created, updated, and deleted.

### Brands

Events for brand metafield created, updated, and deleted.

### Inventory and Locations

Events for inventory level changes and inventory setting changes at specific locations. Events for location created, updated, and deleted.

### Price Lists

Events for price list created, updated, activated, deactivated, and deleted. Events for price list record and assignment changes.

### Store and App

Events for store information updated and app uninstalled.

### Channel-Specific Events

Channel-scoped versions of many of the above events, plus additional events for pages, categories, category trees, emails, notifications, routes, scripts, settings, sites, social media links, themes, and product assignments within a specific channel.

### Configuration

- **Destination**: An HTTPS URL on port 443 where callbacks are sent.
- **Scope**: The event type to subscribe to (e.g., `store/order/created`). Wildcard scopes are supported (e.g., `store/order/*`).
- **is_active**: Boolean to enable or disable a webhook.
- If your app does not return an HTTP 200 to BigCommerce after receiving the webhook event payload, BigCommerce considers it a failure. BigCommerce will keep trying for a little over 48 hours. At the end of that time, BigCommerce sends an email and disables the webhook.
